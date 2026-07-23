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

## 2026-07-23 — Supabase + GitHub OAuth authentication

- Patch goal: implement Phase 2 of RFC 001 — full GitHub OAuth sign-in with
  encrypted token storage in Supabase and a signed session cookie.
- Changes made:
  - `src/lib/github/encrypt.ts` — AES-256-GCM encryption/decryption for the
    GitHub access token stored in Supabase (key derived from
    `GITHUB_SESSION_SECRET` via SHA-256).
  - `src/lib/github/session.ts` — HMAC-SHA256 signed session cookie helpers:
    `encodeSession`, `decodeSession`, `getSession`, `sessionCookieOptions`.
    The cookie stores only public identity (login, userId, expiry); never the
    access token.
  - `src/app/api/auth/github/route.ts` — `GET /api/auth/github`: generates a
    CSRF state token in a short-lived cookie, redirects to GitHub OAuth.
  - `src/app/api/auth/callback/github/route.ts` — `GET /api/auth/callback/github`:
    verifies state, exchanges code for token, fetches GitHub identity, upserts
    encrypted token into `github_connections`, sets 30-day signed session cookie.
  - `src/app/api/auth/session/route.ts` — `GET /api/auth/session`: returns
    `{ user: { login, githubUserId } }` or `{ user: null }`. Never returns the
    access token.
  - `src/app/api/auth/signout/route.ts` — `GET /api/auth/signout`: deletes
    session cookie, redirects to `/`.
  - `src/components/layout/github-connection.tsx` — sidebar widget with three
    states: loading spinner, connected (login + disconnect button), disconnected
    (Connect GitHub link). Fetches `/api/auth/session` on mount.
  - `src/components/layout/sidebar.tsx` — imports and renders `GitHubConnection`
    above the Profile/Settings links.
- Breaking changes: none. All new routes are additive. No existing route
  modified.
- Security notes: access token is encrypted at rest (AES-256-GCM); session
  cookie is HttpOnly, SameSite=Lax, Secure in production; CSRF state verified
  before code exchange; `/api/auth/session` exposes no credentials.
- Regressions introduced/removed: none; 32 existing tests still pass.
- Validation: `bun test` (32 pass), `bun run lint` (clean), `bun run build`
  (all 4 new auth routes appear as dynamic `ƒ` routes; TypeScript clean).
- Final status: complete. Requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
  `GITHUB_SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  in the deployment environment and the `github_connections` migration run in
  Supabase SQL Editor.

---

## 2026-07-23 — AetherisUI agentic component library (Phase 1–3)

- Goal: implement the AetherisUI enterprise agentic component library as
  specified in `AETHERIS_UI_ARCHITECTURE.md`, covering the full five-section
  blueprint: types, state extensions, hooks, layout components, micro-UI.
- Files created (all additive — no existing file modified):
  - `src/types/agentic.types.ts` — AgentTask, ToolExecutionStatus, AgentStatus,
    ToolExecution, ReasoningNode, BudgetGuardrail, ModelRouterConfig,
    AgentExecution, ArtifactKind, Artifact.
  - `src/lib/agentic/task-router.ts` — detectAgentTask (regex patterns for
    research/coding/writing/reasoning), getTaskUIConfig (Tailwind colour +
    Lucide icon per task), routeToAgent (capability-map routing), ALL_TASKS.
  - `src/lib/agentic/execution-simulator.ts` — buildMockExecution, advanceNodes,
    advanceTools, estimateMockTurnCost. Mock-only; never presented as real billing.
  - `src/hooks/use-adaptive-scroll.ts` — pin-to-bottom with 80px threshold;
    user scroll breaks pin; jumpToBottom restores it; programmatic flag prevents
    false-positive unpins during auto-scroll.
  - `src/hooks/use-agent-execution.ts` — tick-loop driving ReasoningNode/
    ToolExecution lifecycle; pauses on requiresApproval tools; approveToolExecution
    resumes the loop.
  - `src/components/agentic/assistant-layout.tsx` — responsive multi-pane shell:
    nav sidebar, main thread, canvas (w-96) and inspector (w-72) as animated
    inline panes on desktop, Spring overlay drawers on mobile.
  - `src/components/agentic/reasoning-viewer.tsx` — AnimatePresence node list
    with icon-per-status, confidence %, tool chips, inline Approve button.
  - `src/components/agentic/artifacts-canvas.tsx` — tabbed ARIA tablist for
    markdown/code/mermaid/diff artifacts; CopyButton with animated check.
  - `src/components/agentic/budget-status-bar.tsx` — 32px footer bar: animated
    progress fill, warning/blocked visual states, MCP connection pill, latency.
  - `src/components/agentic/agent-inspector.tsx` — agent identity, StatusBadge,
    mock cost display, animated execution timeline with dot nodes.
  - `src/components/agentic/micro-ui.tsx` — AIThinkingIndicator (3-dot pulse),
    NumberRoll (rAF cubic interpolation), StreamdownMarkdown (cursor blink),
    ExecutionChip (task pill), LoadingShimmer (skeleton wave). All respect
    useReducedMotion().
- Breaking changes: none. AgentGuard path, existing routes, and all existing
  components are untouched.
- Regressions: none. All 32 existing tests still pass.
- Validation: `bun run build` clean (TypeScript strict); `bun run lint` clean.
  Fixed two lucide-react icon names (GitDiff→FileDiff, LayoutPanelRight→LayoutPanelTop)
  and removed conflicting Tailwind v4 focus-visible:outline + outline-2 pairs.
- Final status: complete. Phase 4 (app-store integration) is next.

---

## 2026-07-24 — Restore clean workspace validation

- Patch goal: resolve the lint and production-build failures discovered during
  project review without changing user-facing workspace behaviour.
- Changes made:
  - Excluded `vscode-extension/**` from the root Next.js TypeScript and ESLint
    configuration. It remains an independently configured extension package;
    its `vscode` dependency must not be type-checked as part of the web app.
  - Reworked `NumberRoll` so reduced-motion rendering derives directly from
    the input value instead of synchronously setting state inside an effect.
  - Made `useAdaptiveScroll` use an explicit dependency-array reference,
    removing React Hook lint suppressions.
  - Reworked `useAgentExecution`'s mock tick lifecycle to avoid updating refs
    during render and synchronous effect-driven state transitions. Explicit
    tool approval remains required before a paused execution resumes.
  - Removed an unused VS Code session helper import.
- Breaking changes: none. The root app and extension remain separately built.
- Validation: `bun run lint` clean; `bun test` reports 32 pass and 0 fail;
  `bun run build` succeeds with strict TypeScript.
- Follow-up: the successful build reports that Node.js 20 is deprecated by
  `@supabase/supabase-js`; move deployment and local CI to Node 22+ before a
  future Supabase release makes this a hard requirement.

---

## 2026-07-24 — Phase 4 persistence foundation

- Added RFC 002 and `docs/persistence-architecture.md`, documenting the
  existing persistence gaps, PostgreSQL/Supabase decision, retention, recovery,
  MCP boundary, and explicitly blocked external infrastructure.
- Added migration 003: tenant-rooted users, organizations, memberships,
  workspaces, conversations, messages, artifacts and versions, repository
  context, proposals and approvals, model executions, immutable usage ledger,
  budgets, audit events, deletion requests, retention policies, and MCP
  registry/session/tool-call records.
- Added server-side personal-tenant provisioning and authenticated
  `GET`/`POST /api/conversations` endpoints. Tenant scope is derived from the
  signed GitHub session; client-provided tenant identities are not accepted.
- Validation: `bun run lint` clean; `bun test` has 32 passing tests.
- Known limit: migration 003 has not been applied to a Supabase project and
  the client reducer remains mock-backed; therefore multi-device persistence,
  artifact storage, ledger recording, deletion jobs and real MCP connectivity
  are not claimed as verified or complete.

---

## 2026-07-24 — Phase 3 VS Code Extension backend API (completion)

- Patch goal: complete the remaining Phase 3 backend API surface: revoke, heartbeat, context upload/delta/delete, workspace status, DB migration, web UI indicator, and env example updates.
- Files created:
  - `src/app/api/vscode/auth/revoke/route.ts` — POST bearer-authenticated session revocation.
  - `src/app/api/vscode/session/heartbeat/route.ts` — POST keep-alive; returns server_time and expires_at.
  - `src/app/api/vscode/context/route.ts` — POST (full upload), PATCH (delta merge), DELETE (cleanup). Full: upserts into workspace_contexts keyed by (session_id, workspace_id). Delta: merges updatedFiles and removedPaths from ContextDelta into stored selectedFiles. 1 MB payload cap on all verbs.
  - `src/app/api/vscode/workspace/route.ts` — GET; reads authenticated browser session, joins vscode_sessions + workspace_contexts, returns WorkspaceConnection[] with online status (90 s heartbeat threshold).
  - `db/migrations/002-vscode-extension.sql` — Creates vscode_sessions (token_hash/refresh_hash stored hashed, partial index on active sessions), workspace_contexts (upsert-keyed JSONB), workspace_proposals (Phase 4 schema stub).
  - `src/components/workspace/workspace-indicator.tsx` — Client component: pill button showing online/total count, expandable dropdown listing each workspace with name, online dot, last-seen time, last-synced time. Polls /api/vscode/workspace every 30 s. Hidden if no connections and no error.
- Files modified:
  - `src/types/vscode-session.types.ts` — VscodeSession fields renamed to snake_case to match Supabase row shape; WorkspaceConnection reshaped to match workspace route output; RepositoryContext.version widened from literal to number.
  - `.env.example` — Added VSCODE_SESSION_SECRET and NEXT_PUBLIC_APP_URL.
- Breaking changes: VscodeSession interface now uses snake_case field names (user_id, github_login, etc.) matching DB columns. Any code that read camelCase fields on the cast row was incorrect — these are only used server-side.
- Regressions: none. All 32 existing tests still pass.
- Validation: `bun run lint` clean; `bun run build` clean (TypeScript strict, all 14 routes listed).
- Final status: Phase 3 backend complete. Remaining work: wire WorkspaceIndicator into the sidebar/chat layout; run the SQL migration in Supabase; configure VSCODE_SESSION_SECRET in deployment env; package the vscode-extension/ folder as a .vsix.
