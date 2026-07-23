# Agent Workspace

A streaming AI assistant console built with Next.js. It supports a local mock
mode for UI development and a production Anthropic route protected by
AgentGuard (AHRPLY), which is the mandatory server-side budget gate.

## Run locally

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). By default the UI uses
the mock provider. For real requests, copy `.env.example` to `.env.local`,
set all AgentGuard credentials, then set `NEXT_PUBLIC_USE_REAL_AI=true`.

## Production setup

The live backend intentionally has no direct-Anthropic fallback: every
request must include AgentGuard credentials and is sent to `AGENTGUARD_URL`.
AgentGuard must be reachable from the deployed application and configured
with the monthly budget you want to enforce.

Set these encrypted environment variables in the host (Vercel, Railway,
Fly.io, etc.); never expose any except `NEXT_PUBLIC_USE_REAL_AI` to the
browser:

```text
ANTHROPIC_API_KEY
AGENTGUARD_URL=https://your-agentguard.example.com
AGENTGUARD_AGENT_ID
AGENTGUARD_PROXY_KEY
NEXT_PUBLIC_USE_REAL_AI=true
```

Only Claude is wired to the live backend today. The other provider cards are
available in mock mode; live calls using them are rejected explicitly rather
than silently routed to another vendor.

Check deployment readiness with `GET /api/health`. It returns `200` only when
the server has every AgentGuard credential, and `503` otherwise. It never
returns secret values.

### Docker

The project builds a standalone Next.js image:

```bash
docker build -t agent-workspace .
docker run --env-file .env.local -p 3000:3000 agent-workspace
```

The container needs network access to the independently deployed AgentGuard
service. A local `localhost` proxy is not reachable from this container.

## Structure

```text
src/app/                          UI route plus streaming API and health route
src/components/                   chat layout, composer and providers
src/lib/ai/                       provider adapters, input contract and tests
src/lib/mock/                     seed data and local mock response engine
src/store/                        client conversation state
```

Files in the composer remain browser-local previews; they are not uploaded or
sent to Anthropic. Add a dedicated storage/ingestion path before presenting
attachments as model-readable production input.

## Documentation

- [AGENTS.md](AGENTS.md) — development rules
- [.sinapsi/session.md](.sinapsi/session.md) — operational changelog
- [.sinapsi/handoff.md](.sinapsi/handoff.md) — current project state
