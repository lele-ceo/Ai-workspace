-- Migration 002: VS Code extension tables
-- Adds VS Code session management, workspace context storage, and Phase-4 proposals schema.

-- ── vscode_sessions ────────────────────────────────────────────────────────────
-- One row per active extension connection. Tokens stored as SHA-256 hashes only.

CREATE TABLE IF NOT EXISTS vscode_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT        NOT NULL,           -- github_connections.github_user_id
  github_login        TEXT        NOT NULL,
  device_id           TEXT        NOT NULL,           -- stable per extension install
  token_hash          TEXT        NOT NULL UNIQUE,    -- SHA-256(session_token)
  refresh_hash        TEXT        NOT NULL UNIQUE,    -- SHA-256(refresh_token)
  expires_at          TIMESTAMPTZ NOT NULL,
  refresh_expires_at  TIMESTAMPTZ NOT NULL,
  last_heartbeat_at   TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vscode_sessions_user_id_idx     ON vscode_sessions (user_id);
CREATE INDEX IF NOT EXISTS vscode_sessions_token_hash_idx  ON vscode_sessions (token_hash);
CREATE INDEX IF NOT EXISTS vscode_sessions_refresh_idx     ON vscode_sessions (refresh_hash);

-- Partial index: only live (non-revoked) sessions need fast lookup
CREATE INDEX IF NOT EXISTS vscode_sessions_active_idx
  ON vscode_sessions (user_id, last_heartbeat_at DESC)
  WHERE revoked_at IS NULL;

-- ── workspace_contexts ─────────────────────────────────────────────────────────
-- Stores the latest full context snapshot per (session, workspace).
-- Content is append-via-upsert; prior versions are not kept.

CREATE TABLE IF NOT EXISTS workspace_contexts (
  session_id      UUID        NOT NULL REFERENCES vscode_sessions (id) ON DELETE CASCADE,
  workspace_id    TEXT        NOT NULL,   -- SHA-256(workspaceRoot).slice(0,16)
  user_id         TEXT        NOT NULL,
  context         JSONB       NOT NULL,
  content_hash    TEXT        NOT NULL,   -- SHA-256(JSON.stringify(context))
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (session_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS workspace_contexts_user_idx
  ON workspace_contexts (user_id, uploaded_at DESC);

-- ── workspace_proposals ────────────────────────────────────────────────────────
-- Phase 4 schema only. Proposals are generated server-side and displayed to the
-- user in the extension; the extension never applies them autonomously.

CREATE TABLE IF NOT EXISTS workspace_proposals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID        NOT NULL REFERENCES vscode_sessions (id) ON DELETE CASCADE,
  workspace_id          TEXT        NOT NULL,
  base_commit           TEXT,
  target_file           TEXT        NOT NULL,
  operation             TEXT        NOT NULL CHECK (operation IN ('modify','create','delete','rename')),
  original_content_hash TEXT,
  diff                  TEXT        NOT NULL,
  explanation           TEXT        NOT NULL,
  risk_level            TEXT        NOT NULL CHECK (risk_level IN ('low','medium','high')),
  validation_steps      TEXT[]      NOT NULL DEFAULT '{}',
  is_stale              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS workspace_proposals_session_idx
  ON workspace_proposals (session_id, workspace_id, created_at DESC);

-- Expire stale proposals automatically (requires pg_cron or a periodic job)
-- ALTER TABLE workspace_proposals ENABLE ROW LEVEL SECURITY; -- add RLS policies when moving off service role
