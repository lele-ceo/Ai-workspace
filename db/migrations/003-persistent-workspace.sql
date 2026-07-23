-- Phase 4: tenant-rooted historical memory, audit and usage foundation.
-- Apply after 001-github-connections.sql and 002-vscode-extension.sql.
-- All application access uses server-side membership checks. RLS is enabled as
-- defence in depth; no browser client receives the service-role credential.

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  github_login TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days >= 1),
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  external_key TEXT,
  created_by TEXT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (organization_id, external_key)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  created_by TEXT NOT NULL REFERENCES app_users(id),
  title TEXT NOT NULL DEFAULT 'New chat',
  title_search TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', title)) STORED,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversations_scope_updated_idx ON conversations (organization_id, workspace_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS conversations_title_search_idx ON conversations USING GIN (title_search);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  sequence_no BIGINT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'streaming', 'complete', 'failed', 'cancelled')),
  model_id TEXT,
  content TEXT NOT NULL DEFAULT '',
  content_search TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  edited_from_id UUID REFERENCES messages(id),
  regenerated_from_id UUID REFERENCES messages(id),
  error_code TEXT,
  error_message TEXT,
  created_by TEXT REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (conversation_id, sequence_no)
);
CREATE INDEX IF NOT EXISTS messages_conversation_sequence_idx ON messages (conversation_id, sequence_no) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_content_search_idx ON messages USING GIN (content_search);

CREATE TABLE IF NOT EXISTS message_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'reasoning_summary', 'citation', 'tool_call', 'tool_result')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, sequence_no)
);

CREATE TABLE IF NOT EXISTS repository_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  encrypted_credential TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (organization_id, provider, external_id)
);

CREATE TABLE IF NOT EXISTS repository_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_connection_id UUID NOT NULL REFERENCES repository_connections(id) ON DELETE CASCADE,
  commit_sha TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS context_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  repository_snapshot_id UUID REFERENCES repository_snapshots(id) ON DELETE SET NULL,
  path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES app_users(id),
  kind TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS artifacts_scope_idx ON artifacts (organization_id, workspace_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_hash TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artifact_id, version_no)
);

CREATE TABLE IF NOT EXISTS code_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'applied', 'expired')),
  created_by TEXT REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS proposal_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES code_proposals(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  diff TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, revision_no)
);

CREATE TABLE IF NOT EXISTS approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  proposal_id UUID REFERENCES code_proposals(id) ON DELETE SET NULL,
  actor_id TEXT REFERENCES app_users(id),
  decision TEXT NOT NULL CHECK (decision IN ('requested', 'approved', 'rejected', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  provider_request_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'complete', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (provider, provider_request_id)
);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES model_executions(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached_tokens BIGINT NOT NULL DEFAULT 0 CHECK (cached_tokens >= 0),
  tool_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_cost_cents BIGINT NOT NULL DEFAULT 0 CHECK (provider_cost_cents >= 0),
  customer_cost_cents BIGINT NOT NULL DEFAULT 0 CHECK (customer_cost_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  pricing_version TEXT NOT NULL,
  billing_status TEXT NOT NULL CHECK (billing_status IN ('pending', 'finalized', 'void')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (execution_id)
);

CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID REFERENCES workspaces(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL CHECK (period_end >= period_start),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  limit_cents BIGINT NOT NULL CHECK (limit_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  actor_id TEXT REFERENCES app_users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_scope_created_idx ON audit_events (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES app_users(id),
  organization_id UUID REFERENCES organizations(id),
  scope TEXT NOT NULL CHECK (scope IN ('conversation', 'workspace', 'account')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'blocked_legal_hold', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_days INTEGER NOT NULL DEFAULT 30 CHECK (conversation_days >= 1),
  artifact_days INTEGER NOT NULL DEFAULT 30 CHECK (artifact_days >= 1),
  repository_context_days INTEGER NOT NULL DEFAULT 30 CHECK (repository_context_days >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MCP control-plane records. They do not imply a configured or live connector.
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  server_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  transport TEXT NOT NULL CHECK (transport IN ('streamable_http', 'sse', 'stdio')),
  endpoint TEXT,
  auth_method TEXT NOT NULL,
  tool_allowlist JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_classification TEXT NOT NULL DEFAULT 'read_only',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  configuration_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, server_key)
);

CREATE TABLE IF NOT EXISTS mcp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES app_users(id),
  server_id UUID NOT NULL REFERENCES mcp_servers(id),
  status TEXT NOT NULL CHECK (status IN ('disconnected', 'connecting', 'authenticating', 'connected', 'degraded', 'expired', 'revoked', 'failed')),
  protocol_version TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_heartbeat_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcp_tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  session_id UUID NOT NULL REFERENCES mcp_sessions(id),
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('requested', 'denied', 'awaiting_approval', 'approved', 'running', 'complete', 'failed', 'cancelled')),
  request_hash TEXT NOT NULL,
  result_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (session_id, request_hash)
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
