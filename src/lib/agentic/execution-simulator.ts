// Mock execution event generator for AetherisUI agentic components.
// Produces deterministic ReasoningNode / ToolExecution sequences per AgentTask.
// All estimates are clearly simulated — never presented as real billing.

import type { AgentExecution, ReasoningNode, ToolExecution } from "@/types/agentic.types";
import type { AgentTask } from "./task-router";

let _seq = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++_seq}`;
}

// ── Node sequences per task ───────────────────────────────────────────────────

const TASK_NODES: Record<AgentTask, string[]> = {
  research: [
    "Decomposing query intent",
    "Selecting knowledge sources",
    "Fetching document context",
    "Cross-referencing citations",
    "Synthesising answer",
  ],
  coding: [
    "Parsing implementation intent",
    "Selecting code strategy",
    "Generating structure",
    "Validating output schema",
    "Running static analysis",
  ],
  writing: [
    "Analysing tone and audience",
    "Outlining structure",
    "Drafting content",
    "Reviewing flow and clarity",
  ],
  reasoning: [
    "Decomposing problem",
    "Enumerating options",
    "Scoring trade-offs",
    "Building chain-of-thought",
    "Forming conclusion",
  ],
};

// ── Tool sequences per task ───────────────────────────────────────────────────

const TASK_TOOLS: Record<AgentTask, Array<{ tool: string; requiresApproval: boolean }>> = {
  research: [
    { tool: "web_search", requiresApproval: false },
    { tool: "retrieve_context", requiresApproval: false },
    { tool: "cite_sources", requiresApproval: false },
  ],
  coding: [
    { tool: "code_interpreter", requiresApproval: false },
    { tool: "validate_json", requiresApproval: false },
    { tool: "run_tests", requiresApproval: true },
  ],
  writing: [
    { tool: "grammar_check", requiresApproval: false },
    { tool: "tone_analyser", requiresApproval: false },
  ],
  reasoning: [
    { tool: "chain_of_thought", requiresApproval: false },
    { tool: "confidence_scorer", requiresApproval: false },
  ],
};

// ── Mock cost model ───────────────────────────────────────────────────────────
// Simulated $/million-token rates — clearly mock, not real provider billing.

const MOCK_COST_PER_MTOK: Record<AgentTask, number> = {
  research: 3.0,
  coding: 3.0,
  writing: 1.5,
  reasoning: 15.0,
};

export function estimateMockTurnCost(task: AgentTask, inputTokens: number): number {
  return (inputTokens / 1_000_000) * MOCK_COST_PER_MTOK[task];
}

// ── Execution builder ─────────────────────────────────────────────────────────

export function buildMockExecution(
  agentId: string,
  threadId: string,
  task: AgentTask,
  inputTokens = 800,
): AgentExecution {
  const now = Date.now();

  const nodes: ReasoningNode[] = TASK_NODES[task].map((label, i) => ({
    id: nextId("node"),
    label,
    status: i === 0 ? "running" : "idle",
    confidence: undefined,
    createdAt: now + i * 400,
  }));

  const tools: ToolExecution[] = TASK_TOOLS[task].map(({ tool, requiresApproval }) => ({
    id: nextId("tool"),
    tool,
    status: "idle" as const,
    summary: `${tool.replace(/_/g, " ")} — pending`,
    requiresApproval,
    startedAt: now,
  }));

  return {
    agentId,
    threadId,
    task,
    nodes,
    tools,
    startedAt: now,
    status: "running",
    estimatedCostUsd: estimateMockTurnCost(task, inputTokens),
  };
}

// ── Tick helpers ──────────────────────────────────────────────────────────────
// Called by useAgentExecution to advance the execution state on each timer tick.

export function advanceNodes(nodes: ReasoningNode[], nodeIdx: number): ReasoningNode[] {
  return nodes.map((n, i) => {
    if (i < nodeIdx)
      return { ...n, status: "completed" as const, confidence: 0.84 + (i % 3) * 0.05 };
    if (i === nodeIdx) return { ...n, status: "running" as const };
    return n;
  });
}

export function advanceTools(tools: ToolExecution[], toolIdx: number): ToolExecution[] {
  return tools.map((t, i) => {
    if (i < toolIdx)
      return { ...t, status: "completed" as const, completedAt: Date.now() };
    if (i === toolIdx) return { ...t, status: "running" as const };
    return t;
  });
}
