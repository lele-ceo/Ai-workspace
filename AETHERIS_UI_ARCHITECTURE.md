# AetherisUI — Project-Aligned Architecture

## Purpose

AetherisUI is the enterprise agent-workspace layer of this application, not a
second app or a replacement for the existing chat. It extends the current
Next.js 16 / React 19 / Tailwind 4 workspace with pluggable agent surfaces,
observable execution traces, artifacts and approvals.

## Boundaries

- Keep the existing Claude + AgentGuard API path; server budget enforcement is
  authoritative in live mode.
- Mock budget is a clearly labelled client-side simulation only.
- Never display private model chain-of-thought. `ReasoningNode` represents
  concise, user-safe execution summaries, tool events and approvals.
- GitHub OAuth/Supabase are real backend boundaries. VS Code/terminal actions
  require the RFC 001 local companion and per-command approval.
- Do not introduce shadcn, Radix or resizable-panel dependencies until a
  specific component needs them and the dependency decision is documented.

## Directory evolution

```text
src/
  app/                         existing routes and API routes
  components/
    agentic/                   agent workspace-only presentation
      assistant-layout.tsx     responsive multi-pane shell
      agent-inspector.tsx      agent status, timeline and safe trace
      artifacts-canvas.tsx     local artifact preview/diff surface
      budget-status-bar.tsx    live/mock budget state
      reasoning-viewer.tsx     safe execution summaries, never raw CoT
    composer/                  existing composer and selectors
    chat/                      existing conversation primitives
  hooks/
    use-adaptive-scroll.ts     pin only when user is at stream bottom
    use-agent-execution.ts     mock execution event consumption
  lib/
    agentic/
      task-router.ts           deterministic task-to-model/agent scores
      execution-simulator.ts   mock events only
  store/                       reducer/context source of truth
  types/
    agentic.types.ts           agent, trace, tool and budget contracts
```

## Core contracts

```ts
export type AgentTask = "research" | "coding" | "writing" | "reasoning";
export type ToolExecutionStatus = "idle" | "running" | "completed" | "failed" | "approved";

export interface Agent {
  id: string;
  name: string;
  capabilities: AgentTask[];
  tools: string[];
  status: "idle" | "running" | "waiting-approval" | "blocked";
}

export interface ReasoningNode {
  id: string;
  label: string;
  status: ToolExecutionStatus;
  confidence?: number;
  createdAt: number;
}

export interface ToolExecution {
  id: string;
  tool: string;
  status: ToolExecutionStatus;
  summary: string;
  requiresApproval: boolean;
}

export interface BudgetGuardrail {
  monthlyCapUsd: number;
  warningPercent: number;
  spentUsd: number;
  blocked: boolean;
}

export interface ModelRouterConfig {
  task: AgentTask;
  preferredModelId: string;
  confidence: number;
  explanation: string;
}
```

## State and execution model

`AppProvider` remains the global source for threads, streaming and the current
budget lock. Add agent execution state as reducer actions, not timers inside
components: `START_AGENT`, `ADD_REASONING_NODE`, `START_TOOL`,
`REQUEST_APPROVAL`, `COMPLETE_TOOL`, `BLOCK_AGENT`, `COMPLETE_AGENT`.

For mock events, charge a transparent estimate before each simulated turn and
freeze mock agents at their local cap. For live events, stop only when
AgentGuard returns the budget failure; do not invent client billing.

## Deterministic routing

Reuse `src/lib/model-routing.ts` for task detection. Extend scores with agent
capability and mode:

| Task | Preferred traits | UI outcome |
| --- | --- | --- |
| Research | long context, sources | research agent + cited source pane |
| Coding | structured output, tools | coding agent + diff/artifact pane |
| Writing | low latency, creativity | writing agent + document artifact |
| Reasoning | high reasoning capacity | safe step summary + confidence |

The user can override all recommendations. A recommendation never enables an
unconfigured live provider.

## Layout and accessibility

Start from the current responsive `ChatLayout`. On wide screens add optional
artifact and inspector panes; on narrow screens present them as drawers. Use
semantic landmarks, labelled controls, Escape-to-close dialogs, visible focus,
reduced-motion support and keyboard-accessible pane toggles. Avoid a fixed
four-column layout on small viewports.

## Adaptive streaming scroll

Track whether the scroll container is within a small threshold of its bottom.
Only auto-scroll while pinned. If the user scrolls up, preserve position and
show a “Jump to latest” control; restore pinning only after that control or a
manual scroll to bottom.

## Delivery order

1. Safe reasoning viewer and adaptive scroll.
2. Agent inspector and deterministic handoff timeline.
3. Artifact canvas for existing markdown/code outputs.
4. Human approval cards for future GitHub/VS Code actions.
5. Optional desktop panes after mobile drawer behavior is complete.
```
