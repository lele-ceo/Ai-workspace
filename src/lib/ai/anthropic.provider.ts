import type { AIProvider } from "./provider.interface";
import type { Message } from "@/types/message.types";
import type { SendOptions, StreamChunk } from "@/types/provider.types";

export class BudgetExceededError extends Error {
  readonly type = "budget_exceeded" as const;
  readonly spent_usd?: number;
  readonly budget_usd?: number;

  constructor(message: string, spent_usd?: number, budget_usd?: number) {
    super(message);
    this.name = "BudgetExceededError";
    this.spent_usd = spent_usd;
    this.budget_usd = budget_usd;
  }
}

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";

  async *sendMessage(
    messages: Message[],
    options: SendOptions,
  ): AsyncIterable<StreamChunk> {
    const { modelId, signal } = options;

    // Only send role + content to the API — strip client-only fields.
    const apiMessages = messages
      .filter((m) => m.content.trim() || m.role === "user")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages, model: modelId }),
      signal,
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as {
        error?: { type?: string; message?: string; spent_usd?: number; budget_usd?: number };
      };
      const err = json.error ?? {};

      if (res.status === 429 && err.type === "budget_exceeded") {
        throw new BudgetExceededError(
          err.message ?? "Monthly budget exceeded.",
          err.spent_usd,
          err.budget_usd,
        );
      }

      throw new Error(err.message ?? `API error ${res.status}`);
    }

    // Parse the SSE stream and yield StreamChunk values.
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in the buffer.
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (raw === "[DONE]") return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const event = parsed as {
          type?: string;
          content?: string;
          error?: { type?: string; message?: string; spent_usd?: number; budget_usd?: number };
        };

        if (event.type === "text_delta" && typeof event.content === "string") {
          yield { type: "text_delta", content: event.content };
        } else if (event.error) {
          const { type: errType, message: errMsg, spent_usd, budget_usd } = event.error;
          if (errType === "budget_exceeded") {
            throw new BudgetExceededError(errMsg ?? "Monthly budget exceeded.", spent_usd, budget_usd);
          }
          throw new Error(errMsg ?? "Stream error");
        }
      }
    }
  }
}

export const anthropicProvider = new AnthropicProvider();
