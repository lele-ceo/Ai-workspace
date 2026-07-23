# Summary

<!-- Sinapsi keeps the directory tree below current on its own — on every build, and live
     from the watcher whenever a file or folder is created, moved or deleted. There is no
     command to run and nothing to ask an agent to do. Do not edit between its markers;
     your edits are replaced. Everything else in this file is yours. -->

<!-- sinapsi:start v0.2.6 — kept current automatically by Sinapsi — refreshed on every build and by the watcher whenever files or folders are created, moved or deleted. No command to run; edits between these markers are replaced -->
```
db/
  migrations/
docs/
  persistence-architecture.md
src/
  app/
  components/
  hooks/
  lib/
  store/
  types/
  .DS_Store
vscode-extension/
  src/
  .vscodeignore
  esbuild.mjs
  package.json
  tsconfig.json
.DS_Store
.env.example
.gitignore
.mcp.json
AETHERIS_UI_ARCHITECTURE.md
AGENTS.md
AI_WORKSPACE_BRIEF.md
Dockerfile
Makefile
README.md
bun.lock
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
postcss.config.mjs
tsconfig.json
```
<!-- sinapsi:end -->

**Read this first, and usually only this.** It is the cardinal read at the start of every
patch: the project's shape (above), the last sessions at a glance, and a short recap. Open
`session.md` or `handoff.md` only when this file leaves your actual question unanswered.

## Recent sessions

- 2026-07-24 — Phase 4 persistence foundation: tenant schema and conversation API
- 2026-07-24 — Phase 3 VS Code Extension backend API complete (revoke, heartbeat, context upload/delta/delete, workspace status, DB migration, WorkspaceIndicator UI)
- 2026-07-24 — Restored clean lint, test and production-build validation
- 2026-07-23 — AetherisUI agentic component library (Phases 1–3): types, task router, execution simulator, hooks, layout components, micro-UI
- 2026-07-23 — Supabase + GitHub OAuth authentication (Phase 2 of RFC 001)
- 2026-07-23 — Switch GitHub persistence foundation to Supabase
- 2026-07-23 — GitHub App and Neon persistence foundation added
- 2026-07-23 — Local Profile and Settings pages restored with simple persisted controls
- 2026-07-23 — RFC for GitHub App, VS Code local companion and approved terminal execution
- 2026-07-23 — Persistent mock spending caps, warning banner and local hard block
- 2026-07-23 — Smart model routing, confidence and persisted local preferences
- 2026-07-23 — Enterprise workspace brief aligned to the existing app and live/mock architecture
- 2026-07-23 — Production chat backend, AgentGuard hard budget block, Docker deploy setup
- 2026-07-21 — Grok provider and variants removed from the model UI
- 2026-07-21 — AgentGuard (AHRPLY) transparent LLM budget proxy integrated
- 2026-07-04 — Responsive model selector (top bar on mobile) + token counter removed
- 2026-07-04 — Casual/everyday conversation dataset (9 new macro-topics, +114 templates)
- 2026-07-03 — Intent-aware response routing (data-driven selection engine)
- 2026-07-03 — Frontend-coding response topics (DOM / events / state) with real code
- 2026-07-03 — Client-side file upload, editable user messages, "New Chat"
- 2026-07-03 — Real microphone: Web Speech dictation + audio capture
- 2026-07-03 — Unify Specialist / Model-selector / top-bar popups; drop "Extra"

## Where things stand

Dark-theme AI assistant console with mock mode and deployable Anthropic backend;
AgentGuard is mandatory for live calls. Phase 4 now includes RFC 002, an
architecture report, migration 003's tenant-rooted persistence/ledger/MCP
control-plane schema, and authenticated `GET`/`POST /api/conversations`.
The chat client is still mock-backed and migration 003 has not been applied,
so cross-device history, artifacts, server-side costs and real MCP are not
verified. Phase 3 VS Code backend is source-complete but extension packaging
and Supabase migrations remain outstanding. `bun run lint` and `bun test`
(32 pass) are green.
