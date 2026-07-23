import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";

export const MAX_CHAT_MESSAGES = 50;
export const MAX_MESSAGE_CHARS = 40_000;
export const MAX_CHAT_CHARS = 120_000;

const MODEL_BY_PROVIDER = {
  claude: "claude-sonnet-4-5-20250929",
  anthropic: "claude-sonnet-4-5-20250929",
} as const;

type ChatMessage = { role: "user" | "assistant"; content: string };

export interface ValidChatRequest {
  messages: ChatMessage[];
  model: string;
}

export type ChatRequestValidation =
  | { ok: true; value: ValidChatRequest }
  | { ok: false; error: string };

export function validateChatRequest(body: unknown): ChatRequestValidation {
  if (!body || typeof body !== "object") return { ok: false, error: "Request body must be an object." };

  const { messages, model } = body as { messages?: unknown; model?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages must be a non-empty array." };
  }
  if (messages.length > MAX_CHAT_MESSAGES) {
    return { ok: false, error: `messages cannot contain more than ${MAX_CHAT_MESSAGES} items.` };
  }
  if (typeof model !== "string" || !(model.toLowerCase() in MODEL_BY_PROVIDER)) {
    return { ok: false, error: "Only the Claude provider is available in live mode." };
  }

  let totalChars = 0;
  const validMessages: ChatMessage[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return { ok: false, error: "Every message must be an object." };
    }
    const { role, content } = message as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return { ok: false, error: "Messages require a user or assistant role and text content." };
    }
    if (!content.trim()) return { ok: false, error: "Message content cannot be empty." };
    if (content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: `A message cannot exceed ${MAX_MESSAGE_CHARS} characters.` };
    }
    totalChars += content.length;
    if (totalChars > MAX_CHAT_CHARS) {
      return { ok: false, error: `Conversation cannot exceed ${MAX_CHAT_CHARS} characters.` };
    }
    validMessages.push({ role, content });
  }

  return { ok: true, value: { messages: validMessages, model } };
}

export function resolveModel(model: string): string {
  return MODEL_BY_PROVIDER[model.toLowerCase() as keyof typeof MODEL_BY_PROVIDER];
}

export function toAnthropicMessages(messages: ChatMessage[]): MessageParam[] {
  return messages;
}

export interface AgentGuardConfig {
  apiKey: string;
  baseURL: string;
  agentId: string;
  proxyKey: string;
}

export function getAgentGuardConfig(env: NodeJS.ProcessEnv = process.env): AgentGuardConfig | null {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  const baseURL = env.AGENTGUARD_URL?.trim();
  const agentId = env.AGENTGUARD_AGENT_ID?.trim();
  const proxyKey = env.AGENTGUARD_PROXY_KEY?.trim();
  if (!apiKey || !baseURL || !agentId || !proxyKey) return null;

  try {
    const url = new URL(baseURL);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  } catch {
    return null;
  }

  return { apiKey, baseURL, agentId, proxyKey };
}
