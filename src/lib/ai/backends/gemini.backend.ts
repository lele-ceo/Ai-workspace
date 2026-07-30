import type { BackendProvider, ServerChunk, StreamParams } from "../backend.interface";

class GeminiBackend implements BackendProvider {
  readonly id = "gemini";

  isConfigured(env: NodeJS.ProcessEnv): boolean {
    return !!env.GOOGLE_AI_API_KEY?.trim();
  }

  async *stream(params: StreamParams, env: NodeJS.ProcessEnv): AsyncIterable<ServerChunk> {
    const apiKey = env.GOOGLE_AI_API_KEY!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Gemini uses "model" role instead of "assistant"
    const contents = params.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: params.maxTokens ?? 1024 },
      }),
      signal: params.signal,
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `Gemini API error ${res.status}`);
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

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const event = parsed as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text) {
          yield { type: "text_delta", content: text };
        }
      }
    }
  }
}

export const geminiBackend = new GeminiBackend();
