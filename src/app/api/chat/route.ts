import { NextRequest } from "next/server";
import { validateChatRequest } from "@/lib/ai/chat-contract";
import { getBackend } from "@/lib/ai/backends/registry";
import { BackendBudgetError } from "@/lib/ai/backend.interface";

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

  const { provider, model, messages } = validation.value;

  const backend = getBackend(provider);
  if (!backend) {
    return errorResponse("configuration_error", `Provider "${provider}" is not supported.`, 503);
  }
  if (!backend.isConfigured(process.env)) {
    return errorResponse(
      "configuration_error",
      `Provider "${provider}" credentials are not configured on this server.`,
      503,
    );
  }

  const stream = backend.stream({ model, messages, signal: req.signal }, process.env);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "text_delta") {
            controller.enqueue(sse(encoder, chunk));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(sse(encoder, formatStreamError(err)));
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

function formatStreamError(err: unknown): ApiError {
  if (err instanceof BackendBudgetError) {
    return {
      error: {
        type: "budget_exceeded",
        message: err.message,
        ...(err.spent_usd !== undefined ? { spent_usd: err.spent_usd } : {}),
        ...(err.budget_usd !== undefined ? { budget_usd: err.budget_usd } : {}),
      },
    };
  }
  const message = err instanceof Error ? err.message : "The AI provider could not complete the request.";
  return { error: { type: "upstream_error", message } };
}
