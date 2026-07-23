# Handoff

## Where we are

The project is a Next.js AI assistant console with local mock mode and a
production-ready streaming Anthropic route. Live traffic is routed exclusively
through AgentGuard (AHRPLY), which owns monthly budget enforcement.

The AetherisUI agentic component library (Phases 1–3) and the Phase 3 VS Code
Extension backend API are both complete. The root web app validates cleanly.
Phase 4 now has a documented, tenant-rooted persistence foundation and an
authenticated conversation collection API; it is not yet connected to the chat UI.

## Complete

- The live `/api/chat` route validates message count, roles, text and provider
  before making an upstream request.
- Missing AgentGuard credentials return `503 configuration_error`; no direct
  Anthropic fallback exists.
- `429 budget_exceeded` locks the browser composer. AgentGuard is the authoritative
  hard block.
- `/api/health` exposes only credential presence.
- `bun test` (32 pass), `bun run lint`, and `bun run build` are green.
- `db/migrations/003-persistent-workspace.sql` defines the multi-tenant
  persistence, immutable usage/audit, retention and MCP control-plane tables.
- `GET`/`POST /api/conversations` provision a personal tenant from the signed
  GitHub session and never accept tenant IDs from the client for authorization.

### GitHub OAuth (Phase 2 of RFC 001)

- `src/app/api/auth/github/route.ts` — initiates OAuth with CSRF state cookie.
- `src/app/api/auth/callback/github/route.ts` — verifies state, exchanges code,
  upserts AES-256-GCM encrypted token in Supabase, sets 30-day HttpOnly session cookie.
- `src/app/api/auth/session/route.ts` — returns `{ user }` or `{ user: null }`.
- `src/app/api/auth/signout/route.ts` — deletes cookie, redirects to `/`.
- `src/components/layout/github-connection.tsx` — sidebar widget with three states.

### AetherisUI — Phases 1–3

- Full agentic type contracts, task router, mock execution simulator.
- `use-adaptive-scroll` and `use-agent-execution` hooks.
- AssistantLayout (multi-pane, Spring overlay on mobile), ReasoningViewer,
  ArtifactsCanvas, BudgetStatusBar, AgentInspector, micro-ui atoms.

### Phase 3 — VS Code Extension backend (new, 2026-07-24)

**Extension source (vscode-extension/src/) — 18 TypeScript files, complete:**
- Auth: PKCE helpers, AuthManager (SecretStorage, callback URI handler, token refresh).
- Workspace: TrustManager (Workspace Trust gate), FileFilter (40+ exclusion patterns,
  8 secret patterns), Scanner (MAX_FILES=500, symlink-safe, binary detection).
- Context: ContextBuilder (SHA-256 workspace ID, full + delta build), Uploader (3-retry
  exponential backoff).
- Session: ApiClient (1 MB payload cap, bearer auth), SessionManager (all 7 connection
  states, heartbeat timer, proactive refresh).
- UI: StatusBar (7-state display, spinner on sync).
- extension.ts — file watcher, auto-connect, triggerSync orchestration.

**Backend API routes — all new, additive:**
- `POST /api/vscode/auth/start` — PKCE handshake initiation, pending cookie, GitHub bounce.
- `POST /api/vscode/auth/token` — PKCE code exchange and refresh_token grant.
- `POST /api/vscode/auth/revoke` — bearer-authenticated session revocation.
- `POST /api/vscode/session/heartbeat` — keep-alive; returns server_time + expires_at.
- `POST /api/vscode/context` — full context upsert (workspace_contexts table).
- `PATCH /api/vscode/context` — delta merge (updatedFiles + removedPaths into selectedFiles).
- `DELETE /api/vscode/context` — context cleanup.
- `GET /api/vscode/workspace` — web UI status; joins sessions + contexts, online via 90 s heartbeat.

**Supporting files:**
- `src/types/vscode-session.types.ts` — VscodeSession (snake_case, matches Supabase row),
  WorkspaceConnection, RepositoryContext, ContextDelta, ChangeProposal (Phase 4 stub).
- `src/lib/vscode/config.ts` — VscodeConfig, getVscodeConfig.
- `src/lib/vscode/session.ts` — token generation, SHA-256 hashing, all DB operations.
- `db/migrations/002-vscode-extension.sql` — vscode_sessions, workspace_contexts,
  workspace_proposals tables with indexes.
- `src/components/workspace/workspace-indicator.tsx` — polling client component,
  online dot, workspace name, last-seen + synced times, expandable dropdown.

## Decisions

- Only Claude is permitted in live mode.
- AgentGuard is mandatory; no direct-provider fallback.
- VS Code extension is read-only / propose-only — no file writes, no shell exec,
  no git mutations from the extension side.
- Tokens stored as SHA-256 hashes in DB, never plaintext.
- Repository content treated as untrusted; content-based secret detection before upload.
- WorkspaceIndicator hides completely when there are no active sessions.

## Remaining / fragile

- `db/migrations/002-vscode-extension.sql` must be run in Supabase SQL Editor
  before the VS Code API routes can persist data.
- `VSCODE_SESSION_SECRET` and `NEXT_PUBLIC_APP_URL` must be added to the deployment
  environment (see `.env.example`).
- `WorkspaceIndicator` is built but not yet wired into the sidebar or chat layout.
- The vscode-extension package is source-complete but not yet bundled/packaged
  to a `.vsix` file (needs `esbuild.mjs` run and `vsce package`).
- AetherisUI Phase 4 (app-store integration) is still pending.
- Migration 003 must be reviewed and applied in Supabase before the new API can
  persist records. Conversation detail/messages, client hydration, artifact
  storage, ledger writes and deletion workers remain unimplemented.
- No real MCP endpoint, isolated worker or credential broker is configured;
  MCP tables are a control-plane foundation only.
- Node 20 runtime produces a Supabase deprecation warning; use Node 22+ in CI.

## Next priorities

1. Wire `WorkspaceIndicator` into `src/components/layout/sidebar.tsx` or `chat-layout.tsx`.
2. Run migrations 001 and 002 in Supabase; verify OAuth and VS Code API.
3. Deploy AgentGuard; confirm `/api/health` and a real streaming turn.
4. Bundle the vscode-extension to a `.vsix` and test sign-in flow end-to-end.
5. AetherisUI Phase 4 — app-store integration (AssistantLayout → ChatLayout).
6. Apply and integration-test migration 003, then connect authenticated chat
   history to the conversation API.
