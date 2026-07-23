import type { RepositoryContext, ContextDelta } from "../context/context-builder";
import { logger } from "../utils/logger";

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB hard cap on any single request

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export class ApiClient {
  private sessionToken = "";

  constructor(private readonly serverUrl: string) {}

  setToken(token: string): void {
    this.sessionToken = token;
  }

  clearToken(): void {
    this.sessionToken = "";
  }

  // ── Session ─────────────────────────────────────────────────────────────────

  async heartbeat(sessionId: string): Promise<boolean> {
    const res = await this.post("/api/vscode/session/heartbeat", { sessionId });
    return res.ok;
  }

  async getSession(): Promise<{ userId: string; githubLogin: string } | null> {
    const res = await this.get("/api/vscode/session");
    if (!res.ok) return null;
    return res.json() as Promise<{ userId: string; githubLogin: string }>;
  }

  // ── Context upload ───────────────────────────────────────────────────────────

  async uploadContext(ctx: RepositoryContext): Promise<boolean> {
    const body = JSON.stringify(ctx);
    if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) {
      logger.warn("Context payload exceeds 1MB — truncating selectedFiles");
      const trimmed: RepositoryContext = { ...ctx, selectedFiles: [] };
      return this.uploadContext(trimmed);
    }
    const res = await this.post("/api/vscode/context", ctx);
    if (!res.ok) {
      logger.error("Context upload failed", { status: res.status });
      return false;
    }
    return true;
  }

  async uploadDelta(delta: ContextDelta): Promise<boolean> {
    const body = JSON.stringify(delta);
    if (Buffer.byteLength(body, "utf8") > MAX_PAYLOAD_BYTES) {
      logger.warn("Delta too large, skipping incremental sync");
      return false;
    }
    const res = await this.post("/api/vscode/context/delta", delta);
    return res.ok;
  }

  async deleteContext(workspaceId: string): Promise<boolean> {
    const res = await this.delete(`/api/vscode/context/${workspaceId}`);
    return res.ok;
  }

  // ── Workspace status ─────────────────────────────────────────────────────────

  async getWorkspaceStatus(workspaceId: string): Promise<WorkspaceStatusResponse | null> {
    const res = await this.get(`/api/vscode/workspace?workspaceId=${workspaceId}`);
    if (!res.ok) return null;
    return res.json() as Promise<WorkspaceStatusResponse>;
  }

  // ── HTTP helpers ─────────────────────────────────────────────────────────────

  private get(path: string): Promise<Response> {
    return this.request("GET", path, undefined);
  }

  private post(path: string, body: unknown): Promise<Response> {
    return this.request("POST", path, body);
  }

  private delete(path: string): Promise<Response> {
    return this.request("DELETE", path, undefined);
  }

  private async request(
    method: string,
    apiPath: string,
    body: unknown,
  ): Promise<Response> {
    const url = `${this.serverUrl}${apiPath}`;
    const headers: Record<string, string> = {
      "Content-Type":    "application/json",
      "X-Client":        "vscode-extension",
      "X-Client-Version": "0.1.0",
    };
    if (this.sessionToken) {
      headers["Authorization"] = `Bearer ${this.sessionToken}`;
    }
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

export interface WorkspaceStatusResponse {
  workspaceId: string;
  workspaceName: string;
  branch: string | null;
  commitHash: string | null;
  syncedAt: number | null;
  status: "connected" | "stale" | "disconnected";
}
