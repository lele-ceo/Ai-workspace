# Contributing

Thanks for your interest in Ai-workspace.

## Setup

```bash
bun install
# AgentGuard runs on :3939 — start it first or the budget gating falls back to mock mode
bun dev
```

## Workflow

1. Open an issue first for non-trivial changes.
2. Branch off `main`: `git checkout -b feat/my-feature`.
3. Keep commits small and descriptive.
4. Open a PR — the CI must be green before merge.

## Rules

- AgentGuard mock mode must always work without credentials.
- TypeScript strict mode is on — do not disable it.
- No new dependencies without discussion.
