// Agentic task-routing extension on top of src/lib/model-routing.ts.
// Adds AgentTask → agent/model selection logic for the four AetherisUI task modes.

import type { AgentTask } from "@/types/agentic.types";

export type { AgentTask };

// ── Task detection ────────────────────────────────────────────────────────────

const TASK_PATTERNS: Array<{ task: AgentTask; pattern: RegExp }> = [
  {
    task: "research",
    pattern: /\b(research|search|sources?|citations?|investigate|web|papers?|docs?|find|latest)\b/i,
  },
  {
    task: "coding",
    pattern:
      /\b(code|coding|bug|debug|typescript|javascript|react|api|database|sql|function|refactor|implement|build|fix)\b/i,
  },
  {
    task: "writing",
    pattern: /\b(write|draft|rewrite|email|article|blog|copy|tone|grammar|creative|story|content)\b/i,
  },
  {
    task: "reasoning",
    pattern: /\b(reason|think|plan|strategy|evaluate|compare|decide|analyze|logic|why|how|pros|cons)\b/i,
  },
];

export function detectAgentTask(input: string): AgentTask {
  return TASK_PATTERNS.find(({ pattern }) => pattern.test(input))?.task ?? "reasoning";
}

// ── Task UI configuration ─────────────────────────────────────────────────────

export interface TaskUIConfig {
  label: string;
  /** Lucide icon name. */
  icon: string;
  description: string;
  /** Tailwind colour class for the task pill. */
  colorClass: string;
}

const TASK_UI: Record<AgentTask, TaskUIConfig> = {
  research: {
    label: "Research",
    icon: "Search",
    description: "Long context · cited sources · deep search",
    colorClass: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  coding: {
    label: "Coding",
    icon: "Code2",
    description: "Code interpreter · structured JSON · diff output",
    colorClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  writing: {
    label: "Writing",
    icon: "PenLine",
    description: "Low latency · creative generation · document output",
    colorClass: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  },
  reasoning: {
    label: "Reasoning",
    icon: "BrainCircuit",
    description: "Chain-of-thought · high reasoning capacity · step logs",
    colorClass: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
};

export function getTaskUIConfig(task: AgentTask): TaskUIConfig {
  return TASK_UI[task];
}

export const ALL_TASKS = Object.keys(TASK_UI) as AgentTask[];

// ── Agent capability routing ──────────────────────────────────────────────────

export interface AgentCapabilityMap {
  [agentId: string]: AgentTask[];
}

/** Returns the best matching agent id, or null if none covers the task. */
export function routeToAgent(
  task: AgentTask,
  availableAgentIds: string[],
  capabilities: AgentCapabilityMap,
): string | null {
  return availableAgentIds.find((id) => capabilities[id]?.includes(task)) ?? null;
}
