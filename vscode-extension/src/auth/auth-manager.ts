import * as vscode from "vscode";
import { generatePKCE, generateState } from "./pkce";
import { logger } from "../utils/logger";
import { getSettings } from "../config/settings";

// Keys used in VS Code SecretStorage — never appear in settings, logs, or files.
const SECRET_TOKEN   = "aetheris.sessionToken";
const SECRET_REFRESH = "aetheris.refreshToken";
const SECRET_SESSION = "aetheris.sessionId";

export interface AuthSession {
  sessionToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: number; // Unix seconds
}

export class AuthManager {
  private readonly secrets: vscode.SecretStorage;
  private pendingPKCE: { verifier: string; state: string } | null = null;
  private uriHandler: vscode.Disposable | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.secrets = context.secrets;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async getSession(): Promise<AuthSession | null> {
    const [token, refresh, id] = await Promise.all([
      this.secrets.get(SECRET_TOKEN),
      this.secrets.get(SECRET_REFRESH),
      this.secrets.get(SECRET_SESSION),
    ]);
    if (!token || !refresh || !id) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as { exp: number };
      return { sessionToken: token, refreshToken: refresh, sessionId: id, expiresAt: payload.exp };
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;
    // Treat as expired if within 60 seconds of expiry.
    return session.expiresAt > Math.floor(Date.now() / 1000) + 60;
  }

  /**
   * Start OAuth 2.0 PKCE flow:
   * 1. Generate PKCE pair + state.
   * 2. Register a URI handler on vscode://aetherisui.aetheris-workspace/callback.
   * 3. Open browser to /api/vscode/auth/start.
   */
  async signIn(): Promise<void> {
    const { serverUrl } = getSettings();
    const pkce = generatePKCE();
    const state = generateState();
    this.pendingPKCE = { verifier: pkce.verifier, state };

    // Register URI handler (de-registers itself after first use)
    this.uriHandler?.dispose();
    this.uriHandler = vscode.window.registerUriHandler({
      handleUri: (uri) => void this.handleCallback(uri),
    });
    this.context.subscriptions.push(this.uriHandler);

    const redirectUri = `${vscode.env.uriScheme}://aetherisui.aetheris-workspace/callback`;
    const params = new URLSearchParams({
      code_challenge:        pkce.challenge,
      code_challenge_method: "S256",
      state,
      redirect_uri:          redirectUri,
    });

    const url = `${serverUrl}/api/vscode/auth/start?${params}`;
    logger.info("Opening browser for authentication");
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }

  async signOut(): Promise<void> {
    const session = await this.getSession();
    if (session) {
      try {
        const { serverUrl } = getSettings();
        await fetch(`${serverUrl}/api/vscode/auth/revoke`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.sessionToken}`,
          },
          body: JSON.stringify({ sessionId: session.sessionId }),
        });
      } catch (e) {
        logger.warn("Failed to revoke session on server; clearing local credentials anyway", {
          error: String(e),
        });
      }
    }
    await this.clearCredentials();
    logger.info("Signed out");
  }

  /** Attempt to refresh an expiring session token. */
  async refreshSession(): Promise<boolean> {
    const session = await this.getSession();
    if (!session) return false;

    const { serverUrl } = getSettings();
    try {
      const res = await fetch(`${serverUrl}/api/vscode/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type:    "refresh_token",
          refresh_token: session.refreshToken,
          session_id:    session.sessionId,
        }),
      });
      if (!res.ok) {
        logger.warn("Token refresh failed", { status: res.status });
        return false;
      }
      const data = await res.json() as { session_token: string; refresh_token: string; session_id: string };
      await this.storeCredentials(data.session_token, data.refresh_token, data.session_id);
      logger.info("Session token refreshed");
      return true;
    } catch (e) {
      logger.error("Token refresh error", { error: String(e) });
      return false;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async handleCallback(uri: vscode.Uri): Promise<void> {
    const params = new URLSearchParams(uri.query);
    const code  = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      logger.error("Auth callback error", { error });
      void vscode.window.showErrorMessage(`AetherisUI: Authentication failed — ${error}`);
      return;
    }

    if (!code || !state || !this.pendingPKCE) {
      logger.error("Auth callback missing code, state, or pending PKCE");
      return;
    }

    if (state !== this.pendingPKCE.state) {
      logger.error("Auth callback state mismatch — possible CSRF");
      void vscode.window.showErrorMessage("AetherisUI: Authentication failed (state mismatch).");
      this.pendingPKCE = null;
      return;
    }

    const verifier = this.pendingPKCE.verifier;
    this.pendingPKCE = null;

    const { serverUrl } = getSettings();
    const redirectUri = `${vscode.env.uriScheme}://aetherisui.aetheris-workspace/callback`;

    try {
      const res = await fetch(`${serverUrl}/api/vscode/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type:    "authorization_code",
          code,
          code_verifier: verifier,
          redirect_uri:  redirectUri,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error("Token exchange failed", { status: res.status, body: body.slice(0, 200) });
        void vscode.window.showErrorMessage("AetherisUI: Authentication failed. Please try again.");
        return;
      }

      const data = await res.json() as {
        session_token: string;
        refresh_token: string;
        session_id: string;
      };
      await this.storeCredentials(data.session_token, data.refresh_token, data.session_id);
      logger.info("Authentication successful", { sessionId: data.session_id });
      void vscode.window.showInformationMessage("AetherisUI: Signed in successfully.");
    } catch (e) {
      logger.error("Token exchange error", { error: String(e) });
      void vscode.window.showErrorMessage("AetherisUI: Authentication error. Check the extension logs.");
    }
  }

  private async storeCredentials(
    token: string,
    refresh: string,
    sessionId: string,
  ): Promise<void> {
    await Promise.all([
      this.secrets.store(SECRET_TOKEN,   token),
      this.secrets.store(SECRET_REFRESH, refresh),
      this.secrets.store(SECRET_SESSION, sessionId),
    ]);
  }

  private async clearCredentials(): Promise<void> {
    await Promise.all([
      this.secrets.delete(SECRET_TOKEN),
      this.secrets.delete(SECRET_REFRESH),
      this.secrets.delete(SECRET_SESSION),
    ]);
  }

  dispose(): void {
    this.uriHandler?.dispose();
  }
}
