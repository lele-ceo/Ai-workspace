# Summary

<!-- Sinapsi keeps the directory tree below current on its own — on every build, and live
     from the watcher whenever a file or folder is created, moved or deleted. There is no
     command to run and nothing to ask an agent to do. Do not edit between its markers;
     your edits are replaced. Everything else in this file is yours. -->

<!-- sinapsi:start v0.2.6 — kept current automatically by Sinapsi — refreshed on every build and by the watcher whenever files or folders are created, moved or deleted. No command to run; edits between these markers are replaced -->
```
docs/
  handoff.md
  session.md
src/
  app/
  components/
  hooks/
  lib/
  store/
  types/
.DS_Store
.env.example
.gitignore
.mcp.json
AGENTS.md
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

- 2026-07-23 — GitHub App and Neon persistence foundation added
- 2026-07-23 — Local Profile and Settings pages restored with simple persisted controls
- 2026-07-23 — RFC for GitHub App, VS Code local companion and approved terminal execution
- 2026-07-23 — Persistent mock spending caps, warning banner and local hard block
- 2026-07-23 — Smart model routing, confidence and persisted local preferences
- 2026-07-23 — Enterprise workspace brief aligned to the existing app and live/mock architecture
- 2026-07-23 — Production chat backend, AgentGuard hard budget block, Docker deploy setup
- 2026-07-21 — Grok provider and variants removed from the model UI
- 2026-07-21 — AgentGuard (AHRPLY) transparent LLM budget proxy integrated
- 2026-07-04 — Tool Picker: emoji icons → lucide icons
- 2026-07-04 — Tool Picker Menu (composer "+" dropdown)
- 2026-07-04 — Responsive model selector (top bar on mobile) + token counter removed
- 2026-07-04 — Casual/everyday conversation dataset (9 new macro-topics, +114 templates)
- 2026-07-03 — Intent-aware response routing (data-driven selection engine)
- 2026-07-03 — Frontend-coding response topics (DOM / events / state) with real code
- 2026-07-03 — Client-side file upload, editable user messages, "New Chat"
- 2026-07-03 — Real microphone: Web Speech dictation + audio capture
- 2026-07-03 — Unify Specialist / Model-selector / top-bar popups; drop "Extra"

## Where things stand

Dark-theme AI assistant console with local mock mode and a deployable Anthropic
streaming backend. AgentGuard is mandatory for all live calls: the API no
longer has a direct-provider fallback that could bypass its budget gate.
The UI locks new sends after `budget_exceeded`; AgentGuard remains the durable
server-side hard block. Only Claude is live-enabled; other provider cards are
deliberately mock-only until their real adapters exist.
`/api/health`, standalone Next output, Docker packaging, and deployment
environment documentation are in place. Attachments remain local previews,
not model input. Build, lint, and tests are green (25 pass); AgentGuard
integration checks still need credentials and a reachable proxy to run live.
`AI_WORKSPACE_BRIEF.md` is the project-aligned brief for future enterprise UI
work; it prohibits duplicating the app or bypassing the live budget boundary.
The model picker now offers deterministic task-aware recommendations with a
confidence score, manual override, and locally persisted routing preferences.
Mock mode now includes a clearly labelled local spending cap and warning/block
controls; real spend and enforcement remain AgentGuard-only in live mode.
RFC 001 specifies the required GitHub App plus VS Code extension architecture;
direct browser-to-terminal control is intentionally out of scope for security.
The sidebar now links to Profile and Settings pages for local profile data,
routing preferences and mock spending controls; no secrets are stored there.
 GitHub App configuration is validated server-side and a Supabase migration is ready;
OAuth callback and repository selection remain the next patch.
