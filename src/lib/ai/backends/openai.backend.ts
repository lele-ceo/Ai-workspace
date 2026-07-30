import type { BackendProvider, ServerChunk, StreamParams } from "../backend.interface";

interface ProviderConfig {
  baseURL: string;
  apiKeyEnv: string;
}

const CONFIGS: Record<string, ProviderConfig> = {
  chatgpt: { baseURL: "https://api.openai.com/v1", apiKeyEnv: "OPENAI_API_KEY" },
  perplexity: { baseURL: "https://api.perplexity.ai", apiKeyEnv: "PERPLEXITY_API_KEY" },
};

class OpenAICompatibleBackend implements BackendProvider {
  readonly id: string;
  private readonly cfg: ProviderConfig;

  constructor(providerId: string, cfg: ProviderConfig) {
    this.id = providerId;
    this.cfg = cfg;
  }

  isConfigured(env: NodeJS.ProcessEnv): boolean {
    return !!env[this.cfg.apiKeyEnv]?.trim();
  }

  async *stream(params: StreamParams, env: NodeJS.ProcessEnv): AsyncIterable<ServerChunk> {
    const apiKey = env[this.cfg.apiKeyEnv]!;

    const res = await fetch(`${this.cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 1024,
        stream: true,
      }),
      signal: params.signal,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `${this.id} API error ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
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

        const event = parsed as { choices?: Array<{ delta?: { content?: string } }> };
        const content = event.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) {
          yield { type: "text_delta", content };
        }
      }
    }
  }
}

export const chatgptBackend = new OpenAICompatibleBackend("chatgpt", CONFIGS.chatgpt);
export const perplexityBackend = new OpenAICompatibleBackend("perplexity", CONFIGS.perplexity);
