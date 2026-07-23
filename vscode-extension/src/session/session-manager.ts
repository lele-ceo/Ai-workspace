import type { ApiClient } from "./api-client";
import type { AuthManager } from "../auth/auth-manager";
import { logger } from "../utils/logger";

const HEARTBEAT_INTERVAL_MS = 60_000;   // 60 s
const REFRESH_BEFORE_EXPIRY_S = 300;    // refresh token 5 min before expiry

export type ConnectionState =
  | "disconnected"
  | "auth-required"
  | "connecting"
  | "connected"
  | "session-expired"
  | "access-revoked"
  | "error";

export type ConnectionStateHandler = (state: ConnectionState) => void;

export class SessionManager {
  private state: ConnectionState = "disconnected";
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private handlers: ConnectionStateHandler[] = [];

  constructor(
    private readonly authManager: AuthManager,
    private readonly apiClient: ApiClient,
  ) {}

  getState(): ConnectionState {
    return this.state;
  }

  onStateChanged(handler: ConnectionStateHandler): void {
    this.handlers.push(handler);
  }

  async connect(): Promise<boolean> {
    this.setState("connecting");

    const session = await this.authManager.getSession();
    if (!session) {
      this.setState("auth-required");
      return false;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (session.expiresAt < nowSec) {
      const refreshed = await this.authManager.refreshSession();
      if (!refreshed) {
        this.setState("session-expired");
        return false;
      }
    }

    const freshSession = await this.authManager.getSession();
    if (!freshSession) {
      this.setState("auth-required");
      return false;
    }

    this.apiClient.setToken(freshSession.sessionToken);

    const profile = await this.apiClient.getSession();
    if (!profile) {
      this.setState("access-revoked");
      this.apiClient.clearToken();
      return false;
    }

    this.setState("connected");
    this.startHeartbeat(freshSession.sessionId);
    this.scheduleRefresh(freshSession.expiresAt);
    logger.info("Session connected", { login: profile.githubLogin });
    return true;
  }

  async disconnect(): Promise<void> {
    this.clearTimers();
    this.apiClient.clearToken();
    this.setState("disconnected");
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private setState(s: ConnectionState): void {
    if (this.state === s) return;
    this.state = s;
    logger.info("Connection state changed", { state: s });
    this.handlers.forEach((h) => h(s));
  }

  private startHeartbeat(sessionId: string): void {
    this.clearTimers();
    this.heartbeatTimer = setInterval(async () => {
      const alive = await this.apiClient.heartbeat(sessionId);
      if (!alive) {
        logger.warn("Heartbeat failed — session may have been revoked");
        this.setState("access-revoked");
        this.clearTimers();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private scheduleRefresh(expiresAt: number): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const delayMs = Math.max(0, (expiresAt - nowSec - REFRESH_BEFORE_EXPIRY_S) * 1000);
    this.refreshTimer = setTimeout(async () => {
      const ok = await this.authManager.refreshSession();
      if (!ok) {
        this.setState("session-expired");
        this.clearTimers();
      } else {
        const session = await this.authManager.getSession();
        if (session) {
          this.apiClient.setToken(session.sessionToken);
          this.scheduleRefresh(session.expiresAt);
        }
      }
    }, delayMs);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.refreshTimer)   { clearTimeout(this.refreshTimer);    this.refreshTimer   = null; }
  }

  dispose(): void {
    this.clearTimers();
  }
}
