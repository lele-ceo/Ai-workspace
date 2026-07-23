# Handoff

## Where we are

The project is a Next.js AI assistant console with local mock mode and a
production-ready streaming Anthropic route. Live traffic is routed exclusively
through AgentGuard (AHRPLY), which owns monthly budget enforcement.

## Complete

- The live `/api/chat` route validates message count, roles, text and provider
  before making an upstream request.
- The route will not fall back to Anthropic directly when AgentGuard is absent;
  missing credentials return a safe `503 configuration_error`.
- A `429 budget_exceeded` response locks the browser composer for the session.
  AgentGuard remains the authoritative hard block for all direct/crafted calls.
- `/api/health` reports only whether required live credentials are present;
  it reveals no secret values.
- Next builds in standalone mode and `Dockerfile` packages it for deployment.
- README and `.env.example` document the required production variables.
- `bun test` (25 pass), `bun run lint`, and `bun run build` are green.
- `AI_WORKSPACE_BRIEF.md` aligns the enterprise-workspace prompt with the
  current application and is the planning source for future workspace work.
- The model picker now classifies the composer text and recommends a model with
  a confidence score. Smart-routing and priority preferences persist locally.
- Mock mode has persisted monthly spend controls, a local cap, 80% warning,
  pre-request blocking and reset UI. These controls are hidden in live mode.
- RFC 001 defines the required GitHub App + VS Code local-companion boundary
  for future repository and terminal workflows.
- `/profile` and `/settings` are simple local workspace surfaces, linked from
  the sidebar. They persist non-sensitive profile, routing and mock-spend data.
- GitHub environment validation, Supabase access helper and migration now exist;
  no OAuth route is exposed until the callback/session patch is added.

## Decisions

- Only Claude is permitted in live mode. Other visual provider cards are still
  mock-only; rejecting them is safer than silently sending their requests to
  Anthropic under a misleading label.
- AgentGuard configuration is mandatory for live use because a direct provider
  fallback would defeat the requested hard budget block.
- Attachments remain client-side previews. They must not be advertised as model
  input until a bounded upload and ingestion pipeline is implemented.
- Future enterprise UX is an incremental extension of the existing root
  workspace, not a second application or an assumed Dashboard feature.
- Model routing is recommendation-only. It never makes a provider live or
  bypasses the user’s final selection.
- Mock spending is a transparent local simulation, never an estimate of real
  provider billing. Live budget enforcement remains exclusively AgentGuard.
- Browser-to-terminal control is prohibited. Any terminal execution must occur
  through an installed VS Code extension in a trusted workspace after explicit
  per-command user approval.
- API keys remain absent from Settings until a secure server vault or VS Code
  SecretStorage integration exists; localStorage is never an acceptable key
  store.

## Remaining / fragile

- A real end-to-end validation requires a reachable AgentGuard deployment plus
  valid Anthropic and AgentGuard credentials; integration tests skip without
  them.
- The browser budget lock resets on refresh by design. The server-side proxy
  block persists and is the security boundary.
- The existing deleted `docs/` files are pre-existing user worktree changes;
  do not restore them without explicit direction. Operational records live in
  `.sinapsi/`.

## Next priorities

1. Deploy AgentGuard to a network-reachable service, set the documented
   encrypted variables, then confirm `/api/health` and a real streaming turn.
2. Add an authenticated upload/storage path if attachments need to be sent to
   the model.
3. Add live backend adapters for any additional provider card that should be
   available outside mock mode.
4. Implement the next brief slice: workspace organization (folders, projects
   and prompt library) with local persistence and no backend claims.
5. If GitHub/VS Code integration is approved, obtain GitHub App registration
   values, a public deployment domain and a decision on extension publishing;
   then implement RFC 001 starting with read-only/propose-only access.
