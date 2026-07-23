import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getVscodeConfig } from "@/lib/vscode/config";
import { getGitHubConfig } from "@/lib/github/config";
import { getSession } from "@/lib/github/session";
import {
  createVscodeSession,
  refreshVscodeToken,
} from "@/lib/vscode/session";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * POST /api/vscode/auth/token
 *
 * Exchanges an authorization code (PKCE) or refresh token for a VS Code
 * session token pair. Tokens are opaque bearer tokens stored hashed in DB.
 *
 * Body (grant_type: "authorization_code"):
 *   { grant_type, code, code_verifier, redirect_uri }
 *
 * Body (grant_type: "refresh_token"):
 *   { grant_type, refresh_token, session_id }
 *
 * Response:
 *   { session_token, refresh_token, session_id, expires_at }
 */
export async function POST(req: NextRequest) {
  const cfg   = getVscodeConfig();
  const ghCfg = getGitHubConfig();
  if (!cfg || !ghCfg) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: Record<string, string>;
  try {
    body = await req.json() as Record<string, string>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { grant_type } = body;

  // ── Refresh token flow ──────────────────────────────────────────────────────
  if (grant_type === "refresh_token") {
    const { refresh_token: rt, session_id: sid } = body;
    if (!rt || !sid) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const pair = await refreshVscodeToken(cfg, rt, sid);
    if (!pair) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });

    return NextResponse.json({
      session_token: pair.sessionToken,
      refresh_token: pair.refreshToken,
      session_id:    pair.sessionId,
      expires_at:    pair.expiresAt,
    });
  }

  // ── Authorization code + PKCE flow ─────────────────────────────────────────
  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  const { code, code_verifier, redirect_uri } = body;
  if (!code || !code_verifier || !redirect_uri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!redirect_uri.startsWith("vscode://") && !redirect_uri.startsWith("vscode-insiders://")) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  // Retrieve pending PKCE data from cookie
  const cookieStore = await cookies();
  const pendingRaw  = cookieStore.get(`vsc_pending_${code}`)?.value;
  if (!pendingRaw) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  let pending: { codeChallenge: string; state: string; redirectUri: string };
  try {
    pending = JSON.parse(pendingRaw) as typeof pending;
  } catch {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Verify PKCE: SHA-256(verifier) must equal the stored challenge
  const computedChallenge = createHash("sha256")
    .update(code_verifier)
    .digest("base64url");

  if (computedChallenge !== pending.codeChallenge) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  if (pending.redirectUri !== redirect_uri) {
    return NextResponse.json({ error: "redirect_uri_mismatch" }, { status: 400 });
  }

  // Require an authenticated browser session to know who this is
  const browserSession = await getSession(ghCfg.sessionSecret);
  if (!browserSession) {
    return NextResponse.json({ error: "authorization_required" }, { status: 401 });
  }

  // Delete the one-time pending cookie
  cookieStore.delete(`vsc_pending_${code}`);

  const deviceId = req.headers.get("x-device-id") ?? "unknown";

  const pair = await createVscodeSession(
    cfg,
    browserSession.userId,
    browserSession.githubLogin,
    deviceId,
  );

  return NextResponse.json({
    session_token: pair.sessionToken,
    refresh_token: pair.refreshToken,
    session_id:    pair.sessionId,
    expires_at:    pair.expiresAt,
  });
}
