# AI Workspace — Project-Aligned Implementation Brief

## Role

Act as a Principal Frontend Engineer and AI Product Designer extending this
existing Next.js AI assistant. Work documentation-first, preserve the current
design language, and make incremental, verifiable changes.

## Current project reality

- The application is already an AI workspace at `/`; there is no separate
  Dashboard or Landing Page to preserve.
- Stack: Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4,
  Framer Motion, Bun, and local mock data/state.
- The current UI already has threads, a provider/model selector, agents,
  streaming states, markdown, client-side attachment previews and responsive
  layout.
- Mock mode is the default. `NEXT_PUBLIC_USE_REAL_AI=true` enables the live
  Claude route.
- Live requests use `POST /api/chat` and must pass through AgentGuard (AHRPLY)
  for server-side budget enforcement. Do not remove, bypass, or replace this
  path with browser API keys.
- `GET /api/health` is the safe deployment readiness check.
- Only Claude is live-enabled. Other visible provider cards are mock-only
  until their actual server adapters and credentials are intentionally added.
- Attachments are browser-local previews, not model input. Do not claim that
  a model can read them without implementing an upload/ingestion boundary.

## Objective

Evolve the existing workspace into a portfolio-grade enterprise AI experience
without replacing the current application. New capabilities must either be:

1. local, interactive mock features that work offline and persist safely in
   `localStorage`; or
2. explicitly implemented, secure server-backed features that preserve the
   AgentGuard budget boundary.

Do not add a second assistant app, duplicate the root layout, or invent an
unrelated dashboard.

## Required discovery before every implementation

1. Read `.sinapsi/summary.md` first, then only the referenced operational
   documentation necessary to answer the task.
2. Inspect the relevant existing component, type, store, hook and API route.
3. Check the current Next.js 16 documentation in `node_modules/next/dist/docs`
   before relying on framework-specific behavior.
4. Identify whether the requested feature belongs to mock-only client state or
   the existing live backend. Do not blur the two paths.
5. Make the smallest coherent change, then run `bun test`, `bun run lint`, and
   `bun run build`.

## Architecture rules

- Preserve `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/store`,
  and `src/types` conventions. Use kebab-case files and functional components.
- Keep TypeScript strict; avoid `any`.
- Use existing Tailwind tokens, CSS variables, Lucide icons and Framer Motion
  patterns. Do not introduce a second design system or a UI library without a
  justified, explicit decision.
- Keep shared domain state in the existing reducer/context when it affects the
  whole workspace. Use component state for local interactions.
- Persist only non-secret preferences and mock data in `localStorage`.
- Never place provider keys in `localStorage`, browser bundles, or
  `NEXT_PUBLIC_*` variables. Real credentials remain server-only.
- Update `.sinapsi/session.md`, `.sinapsi/handoff.md`, and
  `.sinapsi/summary.md` after every patch.

## Spending and hard-limit behavior

There are two distinct modes and both must be clear in the interface:

| Mode | Source of truth | Expected behavior |
| --- | --- | --- |
| Mock | Local mock state | Simulated spend, configurable caps, warning at threshold, local hard block and reset controls. |
| Live Claude | AgentGuard | AgentGuard enforces the durable limit. A `429 budget_exceeded` locks the composer for the active browser session and presents a clear recovery message. |

Do not present mock spending figures as real provider billing. Never attempt to
replicate server-side enforcement solely in client code.

## Model-selection scope

Build smart routing only as deterministic client-side recommendation logic. It
may classify tasks (coding, writing, research, analysis, math, vision,
translation, summarization, brainstorming, agents, long-context), score the
available mock model metadata, show confidence and let the user override it.

- Research-backed model metadata must include a source and retrieval date when
  introduced. Do not hardcode current benchmark or pricing claims from memory.
- A recommendation does not grant live availability. In live mode, only
  configured backend adapters can receive requests.
- Store user preferences such as quality/speed/cost priority locally, never
  API keys.

## High-value, incremental feature roadmap

Implement in slices, not as one monolithic workspace rewrite:

1. **Model intelligence** — task classifier, recommendation card, confidence,
   preferences and mock spend controls.
2. **Workspace organization** — persisted folders/projects, pinned threads,
   searchable prompt library and conversation search.
3. **Conversation productivity** — slash commands, keyboard shortcuts,
   message actions, mock citations/sources and export.
4. **Workspace tools** — editable local memory, artifacts and a focused canvas
   only after their types, persistence and navigation are defined.
5. **Account/settings surfaces** — profile and settings panels or routes with
   mock profile data and non-secret local preferences.
6. **Live expansion** — only on explicit request: authenticated persistence,
   attachment ingestion, or additional provider adapters.

Every slice must be useful on its own, responsive, keyboard-accessible and
validated before proceeding to the next.

## Explicit non-goals unless separately requested

- Replacing the existing app or moving it to a new route.
- Removing the existing API routes, Docker packaging, health check or
  AgentGuard enforcement.
- Client-side storage of real API keys.
- Pretending that all provider cards have live API support.
- Implementing every enterprise panel, canvas, widget or agent at once.
- Adding authentication, a database, uploads, WebSockets, server actions or
  external SDKs without an agreed backend scope.

## Definition of done for each feature

- The feature is consistent with the existing UI and responsive behavior.
- All exposed controls work and have sensible empty, loading and error states.
- Accessibility includes semantic controls, labels, keyboard operation and
  visible focus states.
- Mock-only and live behavior are accurately labelled.
- Existing conversation flows and the AgentGuard hard block still work.
- `bun test`, `bun run lint`, and `bun run build` pass.
- Sinapsi operational documentation is current.
