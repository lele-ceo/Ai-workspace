// AetherisUI agentic type contracts.
// These extend (never replace) the existing agent, message and thread types.

export type AgentTask = "research" | "coding" | "writing" | "reasoning";

export type ToolExecutionStatus = "idle" | "running" | "completed" | "failed" | "approved";

export type AgentStatus = "idle" | "running" | "waiting-approval" | "blocked" | "complete";

// ── Tool execution ────────────────────────────────────────────────────────────

export interface ToolExecution {
  id: string;
  tool: string;
  status: ToolExecutionStatus;
  summary: string;
  /** Serialisable call arguments (never raw model internals). */
  input?: Record<string, string | number | boolean>;
  output?: string;
  /** True when a human-in-the-loop approval is required before the tool runs. */
  requiresApproval: boolean;
  startedAt: number;
  completedAt?: number;
}

// ── Reasoning nodes ───────────────────────────────────────────────────────────
// Represents concise, user-safe execution summaries — never raw chain-of-thought.

export interface ReasoningNode {
  id: string;
  /** Short human-readable label shown in the ReasoningViewer. */
  label: string;
  status: ToolExecutionStatus;
  /** 0–1 confidence emitted by the execution simulator. */
  confidence?: number;
  createdAt: number;
}

// ── Budget guardrail ──────────────────────────────────────────────────────────
// Client-side simulation only. Durable enforcement lives in AgentGuard (server).

export interface BudgetGuardrail {
  monthlyCapUsd: number;
  /** Fraction (0–1) at which the warning state activates. */
  warningThreshold: number;
  spentUsd: number;
  /** True when the local mock cap has been reached and sends are frozen. */
  blocked: boolean;
}

// ── Model router ──────────────────────────────────────────────────────────────

export interface ModelRouterConfig {
  task: AgentTask;
  preferredModelId: string;
  confidence: number;
  explanation: string;
}

// ── Agent execution ───────────────────────────────────────────────────────────
// Represents one complete agentic turn: nodes + tools + lifecycle timestamps.

export interface AgentExecution {
  agentId: string;
  threadId: string;
  task: AgentTask;
  nodes: ReasoningNode[];
  tools: ToolExecution[];
  startedAt: number;
  completedAt?: number;
  status: AgentStatus;
  /** Estimated cost for this execution turn in USD (mock-only). */
  estimatedCostUsd?: number;
}

// ── Artifact ──────────────────────────────────────────────────────────────────

export type ArtifactKind = "markdown" | "code" | "mermaid" | "diff";

export interface Artifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  /** Optional previous version for diff rendering. */
  previousContent?: string;
  language?: string;
  createdAt: number;
}
