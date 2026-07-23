# RFC 002 — Persistent workspace data and MCP control plane

## Context

Threads, messages, mock usage, and artifacts currently live in browser memory
or local storage. Supabase is already used only for encrypted GitHub
connections and VS Code session/context records. The application has no
organization model, conversation history API, immutable usage ledger, artifact
store, retention workflow, or MCP gateway.

The product also has a strict security boundary: the browser cannot receive
connector credentials or execute privileged MCP and local-terminal operations.

## Proposal

Use PostgreSQL in the existing Supabase project as the authoritative relational
store. Add a tenant-rooted schema (`organizations`, `organization_memberships`,
and `workspaces`) and make every persisted resource belong to an organization
and workspace. Server routes authenticate the signed GitHub session and apply
membership checks before every query. The service-role key stays server-only.

Use object storage only for binary artifact payloads. Store artifact metadata,
hashes, versions and deletion state in PostgreSQL; access uses short-lived
signed URLs generated only after server-side authorization. Keep costs in an
append-only server-written ledger keyed by provider request ID.

For MCP, add registry/session/audit tables and a server-side gateway interface.
Do not claim a connector is live until a real remote MCP endpoint, credentials,
and a network-isolated worker are configured. GitHub remains read-only by
default and is invoked through the existing encrypted OAuth connection.

## Alternatives

- Browser local storage as the primary store: rejected; it cannot provide
  multi-device history, tenant isolation, auditability, or reliable deletion.
- Redis as the primary store: rejected; it is not an authoritative durable
  ledger and adds operational complexity. It may later support rate limits or
  short-lived job coordination.
- A new ORM or database provider: deferred. Supabase/PostgreSQL is already
  configured; direct typed server-side queries keep this migration contained.

## Decision

Adopt Supabase PostgreSQL plus server-side authorization as the Phase 4 source
of truth. Add a migration and persistence service before routing the client
away from its mock state. Treat the MCP work as a secure gateway foundation;
external transport connectivity is blocked pending real connector deployment.

## Consequences

- Requires a reviewed, reversible SQL migration and Supabase backup/PITR plan.
- Existing anonymous/mock chats stay available locally until a signed-in user
  explicitly creates or imports persistent conversations.
- Every API must derive identity and tenant scope on the server; client-supplied
  user, organization and workspace IDs are never trusted for authorization.
- Full MCP execution requires external infrastructure and credentials not
  present in this repository.
