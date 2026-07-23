# Persistence and MCP architecture report

## Executive summary

**Existing:** Next.js 16 App Router, React 19, Bun, a reducer-backed client
chat, signed GitHub cookie authentication, and Supabase service-role access.
GitHub connection tokens are encrypted at rest. VS Code session tokens are
hashed. **Implemented by this phase:** a tenant-rooted PostgreSQL schema and a
server-side persistence boundary for historical data. **Proposed/blocked:**
binary object storage, scheduled deletion workers, backup operations and a
real MCP connector need deployment configuration not stored in the repository.

## Repository findings

| Path | Current responsibility | Persistence limitation | Required change |
| --- | --- | --- | --- |
| `src/store/app-store.ts` | Threads/messages reducer | Memory only | Hydrate and write through a server API after sign-in. |
| `src/components/providers/app-provider.tsx` | Mock/live streaming and local preferences | Refresh/device loss for conversations | Use persistent conversation endpoints for authenticated users. |
| `src/lib/github/session.ts` | Signed GitHub identity cookie | No tenant role or workspace scope | Resolve membership server-side. |
| `src/lib/github/database.ts` | Supabase service-role client | No general data model | Shared server-only persistence service. |
| `db/migrations/001-github-connections.sql` | Encrypted OAuth connection | User record not normalized | Backfill/associate identity through tenant provisioning. |
| `db/migrations/002-vscode-extension.sql` | VS Code sessions and snapshots | No organization or retention linkage | Link future workspace records to canonical workspaces. |
| `src/app/api/chat/route.ts` | Anthropic SSE proxy | No execution or ledger write | Persist execution and usage only after provider metadata is available. |

## Architecture decision

Supabase PostgreSQL is the authoritative store. It provides transactions,
backups/PITR options, PostgreSQL full-text search, European-region deployment
and local development through the Supabase CLI. Service-role access is used
only on server routes; authorization is enforced from the signed session plus
organization membership. RLS is enabled as a defense in depth, but application
requests never rely on browser Supabase credentials.

Redis is not authoritative. It is optional later for rate limiting and job
coordination. Large artifacts belong in S3-compatible object storage; only
metadata and hashes belong in PostgreSQL. PostgreSQL full-text search is the
initial history-search mechanism; vector search is deferred until a measured
semantic-search need exists.

## Security, retention, and recovery

- Tenant scope is derived server-side and included in every data query.
- GitHub tokens remain AES-256-GCM encrypted; session and VS Code tokens are
  never stored plaintext. Artifact downloads require short-lived signed URLs.
- Conversations default to soft deletion. A scheduled worker hard-deletes after
  30 days unless an organization legal hold applies. Repository snapshots and
  artifacts use configurable expiry; usage/audit ledgers are immutable.
- Use a European Supabase region, encrypted backups, daily backups plus PITR.
  Target RPO: 24 hours without PITR / 15 minutes with PITR; target RTO: 4 hours.
  Recovery is: stop writes, restore to isolated project, verify tenant counts
  and ledger uniqueness, rotate secrets, then switch traffic.
- GDPR workflows require export, deletion request, legal hold, and a record of
  completion. Deleted accounts are excluded from active APIs immediately.

## MCP status

The repository has no production MCP transport, MCP credentials, worker,
registry, or deployed GitHub MCP endpoint. Static/mock tool data is not a real
connector. The schema and policy boundary are the only safe implementation now.
A live GitHub MCP session remains **blocked and unverified** until a real
read-only endpoint, credential broker, egress policy, worker isolation and
security review are deployed. The browser will never connect to an MCP server.

## Operational runbook

1. Review and apply database migrations in a staging Supabase project.
2. Enable encrypted backups and point-in-time recovery in the selected EU region.
3. Set server-only Supabase credentials; rotate the service role key after any incident.
4. Run migration, tenant-isolation and duplicate-ledger integration tests against staging.
5. Schedule retention processing and monitor deletion failures, ledger conflicts,
   authorization denials and backup status.
6. Restore drills occur quarterly and validate the stated RPO/RTO.

## Known limitations

The existing chat UI has not yet been switched from its mock reducer to the new
persistence API. The live Anthropic stream does not expose provider token/cost
metadata in its current SSE contract, so production ledger events cannot yet
be recorded truthfully. No object-storage bucket, queue, background worker, or
real MCP server endpoint is configured in this repository.
