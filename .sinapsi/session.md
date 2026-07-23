# Session log

Operational changelog, append-only, chronological order — never delete previous entries.

Every entry must include: timestamp, patch goal, changes made + files touched, breaking changes, regressions introduced/removed, validation performed, final status.

Append this first — before rewriting `handoff.md`, and before updating `summary.md` from both.

Sinapsi archives this file on its own once it passes 150 lines (or its token budget): it moves to `archive/`, a fresh log starts, and the fresh log's header names the latest archive. Read that one if you need history — not the whole folder.

<!-- The agent writes the first entry on the first patch. -->

## 2026-07-21 — Remove Grok provider

- Patch goal: remove the Grok provider card and its variants from the model UI.
- Changes made: deleted Grok from `src/lib/mock/models.ts`, removed `grok` from
  `ProviderTab`, and removed its empty-state headline from
  `src/components/chat/empty-state.tsx`.
- Breaking changes: Grok is no longer an available provider tab or selectable model.
- Regressions introduced/removed: no remaining Grok/xAI references in `src/`.
- Validation: `bun install`, `bun run lint`, `bun run build`, and `bun test` all pass;
  the three AgentGuard integration checks remain skipped because the local proxy and
  API key are not configured.
- Final status: complete.

## 2026-07-23 — Production chat backend and budget hard block

- Patch goal: make the existing Anthropic/AgentGuard route safe for deployment
  and hard-block further UI sends after budget exhaustion.
- Changes made: added a validated chat request contract and tests; made
  AgentGuard credentials mandatory for live calls (no direct-provider
  fallback); added bounded message validation and an unauthenticated, safe
  `/api/health` readiness endpoint; locked the composer after a
  `budget_exceeded` response; added standalone Docker packaging and production
  environment/deployment documentation.
- Files touched: `src/app/api/chat/route.ts`, `src/app/api/health/route.ts`,
  `src/lib/ai/chat-contract.ts`, `src/lib/ai/chat-contract.test.ts`,
  `src/components/providers/app-provider.tsx`, `src/hooks/use-composer.ts`,
  `src/components/composer/composer.tsx`, `next.config.ts`, `Dockerfile`,
  `.env.example`, and `README.md`.
- Breaking changes: live mode now requires `ANTHROPIC_API_KEY`,
  `AGENTGUARD_URL`, `AGENTGUARD_AGENT_ID`, and `AGENTGUARD_PROXY_KEY`; only
  Claude has a configured live provider path. Other visible provider cards
  remain mock-only and are rejected explicitly in live mode.
- Regressions introduced/removed: removed the direct Anthropic bypass that
  could evade AgentGuard budget enforcement. File attachments are still local
  browser previews and intentionally do not reach the model.
- Validation: `bun test` (25 pass; live AgentGuard checks skipped without
  credentials), `bun run lint`, and `bun run build` all pass.
- Final status: complete; a real end-to-end call still requires the operator's
  deployed AgentGuard credentials and service.

## 2026-07-23 — Align enterprise workspace brief to the project

- Patch goal: adapt the supplied enterprise AI Workspace prompt to the actual
  application instead of following assumptions that conflict with it.
- Changes made: added `AI_WORKSPACE_BRIEF.md`, documenting the current Next.js
  workspace, the mock/live split, AgentGuard as the live hard-budget boundary,
  safe model-selection scope, incremental roadmap, non-goals, and per-feature
  definition of done.
- Breaking changes: none.
- Regressions introduced/removed: removed ambiguity in the planning brief that
  called for a new assistant route, a preserved Dashboard, frontend-only
  storage of API keys, and no backend despite this project already having a
  secure live backend.
- Validation: documentation-only change; content checked against the current
  README and Sinapsi handoff.
- Final status: complete.

## 2026-07-23 — Smart model recommendation foundation

- Patch goal: apply the first incremental module of the aligned enterprise
  workspace brief without changing the secure live-provider boundary.
- Changes made: added deterministic task classification and model scoring for
  coding, writing, research, analysis, math, vision, translation,
  summarization, brainstorming and general prompts; added a model-selector
  recommendation with reason, confidence, user override, smart-routing toggle
  and speed/balanced/quality/cost priority; persisted only these non-secret
  preferences in localStorage.
- Files touched: `src/lib/model-routing.ts`,
  `src/lib/model-routing.test.ts`,
  `src/components/providers/app-provider.tsx`, and
  `src/components/composer/model-selector.tsx`.
- Breaking changes: none. Recommendations do not alter actual live provider
  support; Claude remains the sole live-enabled model.
- Regressions introduced/removed: removed the model picker’s purely static
  behavior while keeping manual model selection as the final user choice.
- Validation: `bun test` (28 pass; live AgentGuard checks skipped without
  credentials), `bun run lint`, and `bun run build` all pass.
- Final status: complete.

## 2026-07-23 — Persistent mock spending controls

- Patch goal: implement the next aligned-brief module without confusing local
  simulation with AgentGuard’s live billing boundary.
- Changes made: added persisted mock monthly cap and spend state, a transparent
  local per-turn estimate, 80% warning, cap enforcement before a mock request,
  reset control, selector spend controls, and a persistent workspace warning
  banner. The entire feature is hidden in live mode.
- Files touched: `src/lib/mock-spending.ts`,
  `src/lib/mock-spending.test.ts`,
  `src/components/providers/app-provider.tsx`,
  `src/components/composer/model-selector.tsx`, and
  `src/components/layout/chat-layout.tsx`.
- Breaking changes: none. The mock cap is stored only under localStorage and
  does not represent or affect provider invoices.
- Regressions introduced/removed: mock sends cannot exceed the configured
  local cap; the existing AgentGuard live hard block is unchanged.
- Validation: `bun test` (31 pass; live AgentGuard checks skipped without
  credentials), `bun run lint`, and `bun run build` all pass.
- Final status: complete.

## 2026-07-23 — GitHub and VS Code companion architecture RFC

- Patch goal: prepare a safe, implementable architecture for the requested
  GitHub, VS Code and terminal integration before moving public API,
  authentication and execution boundaries.
- Changes made: added RFC 001 defining a GitHub App, authenticated web
  workspace and VS Code local-companion extension; permission model; terminal
  approval/audit policy; rollout stages; and external ownership requirements.
- Breaking changes: none; this is a design decision only.
- Regressions introduced/removed: explicitly rejects any browser-to-shell
  shortcut that would create a remote-code-execution backdoor.
- Validation: RFC reconciled with the existing AgentGuard live boundary and
  current project limitations.
- Final status: RFC ready; implementation is blocked on project-owner GitHub
  App and deployment decisions.

## 2026-07-23 — Profile and settings surfaces

- Patch goal: restore simple, configurable Profile and Settings sections while
  keeping configuration local and non-sensitive.
- Changes made: added `/profile` with an editable local profile and workspace
  usage summary; added `/settings` for smart-routing preference, optimization
  priority and mock spending cap/reset; added sidebar navigation and a shared
  workspace-page shell; added a reusable persisted local-state hook.
- Files touched: `src/app/profile/page.tsx`, `src/app/settings/page.tsx`,
  `src/components/profile/profile-page.tsx`,
  `src/components/settings/settings-page.tsx`,
  `src/components/layout/workspace-page-shell.tsx`,
  `src/components/layout/sidebar.tsx`, and
  `src/hooks/use-local-storage-state.ts`.
- Breaking changes: none. Settings deliberately do not accept API keys or
  claim live provider configuration before secure OAuth/vault support exists.
- Regressions introduced/removed: profile and local workspace preferences are
  now discoverable from the sidebar and persist per browser.
- Validation: `bun test` (31 pass; live AgentGuard checks skipped without
  credentials), `bun run lint`, and `bun run build` all pass; `/profile` and
  `/settings` are generated as static routes.
- Final status: complete.

## 2026-07-23 — GitHub connection persistence foundation

- Patch goal: prepare server-only GitHub App and PostgreSQL primitives after
  deployment environment variables were configured.
- Changes made: added Neon serverless driver, validated server-only GitHub
  config, safe private-key newline normalization, database helper, and a
  migration for encrypted GitHub connection records.
- Breaking changes: none; OAuth routes and UI are not connected yet.
- Validation: targeted config test, lint, and production build pass.
- Final status: foundation complete; OAuth callback and repository selection
  are the next implementation patch.

## 2026-07-23 — Switch GitHub persistence foundation to Supabase

- Patch goal: align the new backend foundation with Supabase rather than Neon.
- Changes made: replaced the Neon driver with `@supabase/supabase-js`, updated
  server-only GitHub config to require Supabase URL and service-role key, and
  kept the PostgreSQL migration for Supabase SQL Editor use.
- Validation: GitHub config test and lint pass.
- Final status: Supabase foundation ready; OAuth remains next.
