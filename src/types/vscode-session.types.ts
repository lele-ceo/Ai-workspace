// Server-side types for VS Code extension sessions and workspace context.
// Kept separate from agentic.types.ts — different domain boundary.

export type VscodeConnectionState =
  | "connected"
  | "stale"
  | "disconnected"
  | "revoked";

// DB row shape (Supabase returns snake_case column names)
export interface VscodeSession {
  id: string;
  user_id: string;
  github_login: string;
  device_id: string;
  token_hash: string;
  refresh_hash: string;
  expires_at: string;          // ISO string
  refresh_expires_at: string;
  last_heartbeat_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface WorkspaceConnection {
  sessionId: string;
  deviceId: string;
  workspaceId: string | null;      // SHA-256(workspaceRoot).slice(0,16); null = no context uploaded yet
  workspaceName: string | null;
  online: boolean;                  // heartbeat within 90 s
  lastSeenAt: string | null;
  contextHash: string | null;
  contextUpdatedAt: string | null;
}

// ── Repository context (mirrors vscode-extension/src/context/context-builder.ts) ──

export const CONTEXT_VERSION = 1 as const;

export interface ContextFileEntry {
  path: string;
  kind: "file" | "directory";
  language?: string;
  sizeBytes: number;
  sha256: string;
}

export interface ContextFileContent extends ContextFileEntry {
  content: string;
  truncated: boolean;
}

export interface RepositoryContext {
  version: number; // starts at CONTEXT_VERSION, incremented on each delta merge
  sessionId: string;
  workspaceId: string;
  workspaceName: string;
  repositoryRoot: string;
  git: { branch: string; commitHash: string; remoteHostname: string | null } | null;
  fileTree: ContextFileEntry[];
  selectedFiles: ContextFileContent[];
  activeFile: ContextFileContent | null;
  openEditorPaths: string[];
  syncedAt: number;
  totalSizeBytes: number;
  excludedCount: number;
}

export interface ContextDelta {
  version: typeof CONTEXT_VERSION;
  sessionId: string;
  workspaceId: string;
  syncedAt: number;
  updatedFiles: ContextFileContent[];
  removedPaths: string[];
  activeFile: ContextFileContent | null;
}

// ── Proposals (Phase 4 schema, stored but never applied in Phase 3) ──────────

export type ProposalOperation = "modify" | "create" | "delete" | "rename";
export type ProposalRiskLevel = "low" | "medium" | "high";

export interface ChangeProposal {
  id: string;
  workspaceId: string;
  sessionId: string;
  baseCommit: string | null;
  targetFile: string;
  operation: ProposalOperation;
  originalContentHash: string | null;
  diff: string;
  explanation: string;
  riskLevel: ProposalRiskLevel;
  validationSteps: string[];
  isStale: boolean;
  createdAt: Date;
  expiresAt: Date;
}
