export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamParams {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  signal?: AbortSignal;
}

export type ServerChunk = { type: "text_delta"; content: string };

/** Server-side AI provider — implemented by each vendor backend. */
export interface BackendProvider {
  readonly id: string;
  isConfigured(env: NodeJS.ProcessEnv): boolean;
  stream(params: StreamParams, env: NodeJS.ProcessEnv): AsyncIterable<ServerChunk>;
}

/** Thrown by BackendProvider.stream when AgentGuard rejects due to monthly budget. */
export class BackendBudgetError extends Error {
  readonly type = "budget_exceeded" as const;
  readonly spent_usd?: number;
  readonly budget_usd?: number;

  constructor(message: string, spent_usd?: number, budget_usd?: number) {
    super(message);
    this.name = "BackendBudgetError";
    this.spent_usd = spent_usd;
    this.budget_usd = budget_usd;
  }
}
