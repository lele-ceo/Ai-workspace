import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  getAgentGuardConfig,
  resolveModel,
  toAnthropicMessages,
  validateChatRequest,
} from "@/lib/ai/chat-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiError = {
  error: { type: string; message: string; spent_usd?: number; budget_usd?: number };
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("invalid_request", "Invalid JSON body.", 400);
  }

  const validation = validateChatRequest(body);
  if (!validation.ok) return errorResponse("invalid_request", validation.error, 400);

  // A live request must always cross AgentGuard. There is deliberately no
  // direct-Anthropic fallback: that would bypass the server-side budget gate.
  const config = getAgentGuardConfig();
  if (!config) {
    return errorResponse(
      "configuration_error",
      "Live AI is unavailable until AgentGuard credentials are configured.",
      503,
    );
  }

  const anthropic = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: {
      "X-Ahrply-Agent-ID": config.agentId,
      "X-Ahrply-Proxy-Key": config.proxyKey,
    },
  });

  let stream: AsyncIterable<Anthropic.MessageStreamEvent>;
  try {
    stream = await anthropic.messages.stream(
      {
        model: resolveModel(validation.value.model),
        max_tokens: 1024,
        messages: toAnthropicMessages(validation.value.messages),
      },
      { signal: req.signal },
    );
  } catch (err) {
    return handleUpstreamError(err);
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(sse(encoder, { type: "text_delta", content: event.delta.text }));
          } else if (event.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        }
      } catch (err) {
        controller.enqueue(sse(encoder, formatError(err)));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function sse(encoder: TextEncoder, payload: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function errorResponse(type: string, message: string, status: number): Response {
  return Response.json({ error: { type, message } satisfies ApiError["error"] }, { status });
}

function formatError(err: unknown): ApiError {
  if (err instanceof Anthropic.APIError) {
    const body = err.error as Record<string, unknown> | undefined;
    const inner = body?.error as Record<string, unknown> | undefined;
    return {
      error: {
        type: (inner?.type as string) ?? "api_error",
        message: (inner?.message as string) ?? err.message,
        ...(typeof inner?.spent_usd === "number" ? { spent_usd: inner.spent_usd } : {}),
        ...(typeof inner?.budget_usd === "number" ? { budget_usd: inner.budget_usd } : {}),
      },
    };
  }
  return { error: { type: "upstream_error", message: "The AI provider could not complete the request." } };
}

function handleUpstreamError(err: unknown): Response {
  const formatted = formatError(err);
  if (err instanceof Anthropic.APIError) {
    return Response.json(formatted, { status: err.status === 429 ? 429 : err.status ?? 502 });
  }
  return Response.json(formatted, { status: 502 });
}
