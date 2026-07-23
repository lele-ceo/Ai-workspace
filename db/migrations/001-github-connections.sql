CREATE TABLE IF NOT EXISTS github_connections (
  id UUID PRIMARY KEY,
  github_user_id BIGINT NOT NULL UNIQUE,
  github_login TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  selected_installation_id BIGINT,
  selected_repository_full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS github_connections_login_idx ON github_connections (github_login);
