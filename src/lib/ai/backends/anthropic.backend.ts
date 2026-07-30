import Anthropic from "@anthropic-ai/sdk";
import type { BackendProvider, ServerChunk, StreamParams } from "../backend.interface";
import { BackendBudgetError } from "../backend.interface";
import { getAgentGuardConfig } from "../chat-contract";

class AnthropicBackend implements BackendProvider {
  readonly id = "anthropic";

  isConfigured(env: NodeJS.ProcessEnv): boolean {
    return !!env.ANTHROPIC_API_KEY?.trim();
  }

  async *stream(params: StreamParams, env: NodeJS.ProcessEnv): AsyncIterable<ServerChunk> {
    const apiKey = env.ANTHROPIC_API_KEY!;
    const config = getAgentGuardConfig(env);

    const clientOptions: ConstructorParameters<typeof Anthropic>[0] = { apiKey };
    if (config) {
      clientOptions.baseURL = config.baseURL;
      clientOptions.defaultHeaders = {
        "X-Ahrply-Agent-ID": config.agentId,
        "X-Ahrply-Proxy-Key": config.proxyKey,
      };
    }

    const anthropic = new Anthropic(clientOptions);
    const sdkStream = anthropic.messages.stream(
      {
        model: params.model,
        max_tokens: params.maxTokens ?? 1024,
        messages: params.messages,
      },
      { signal: params.signal },
    );

    try {
      for await (const event of sdkStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text_delta", content: event.delta.text };
        }
      }
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        const body = err.error as Record<string, unknown> | undefined;
        const inner = body?.error as Record<string, unknown> | undefined;
        if (inner?.type === "budget_exceeded") {
          throw new BackendBudgetError(
            (inner.message as string) ?? "Monthly budget exceeded.",
            inner.spent_usd as number | undefined,
            inner.budget_usd as number | undefined,
          );
        }
        throw new Error((inner?.message as string) ?? err.message);
      }
      throw err;
    }
  }
}

export const anthropicBackend = new AnthropicBackend();
