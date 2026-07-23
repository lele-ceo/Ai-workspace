import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getVscodeConfig } from "@/lib/vscode/config";
import { getGitHubConfig } from "@/lib/github/config";
import { getSession } from "@/lib/github/session";

export const runtime = "nodejs";

/**
 * GET /api/vscode/auth/start
 *
 * Initiates the VS Code ↔ server auth handshake.
 * If the user already has a valid browser session, we store the pending PKCE
 * request and redirect straight to the token endpoint helper page.
 * If not, we bounce them through GitHub OAuth first, then return here.
 *
 * Query params (from extension):
 *   code_challenge        PKCE S256 challenge
 *   code_challenge_method must be "S256"
 *   state                 CSRF token from extension
 *   redirect_uri          vscode://aetherisui.aetheris-workspace/callback
 */
export async function GET(req: NextRequest) {
  const cfg = getVscodeConfig();
  const ghCfg = getGitHubConfig();

  if (!cfg || !ghCfg) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const codeChallenge = searchParams.get("code_challenge");
  const method        = searchParams.get("code_challenge_method");
  const state         = searchParams.get("state");
  const redirectUri   = searchParams.get("redirect_uri");

  if (!codeChallenge || method !== "S256" || !state || !redirectUri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Reject non-vscode redirect URIs
  if (!redirectUri.startsWith("vscode://") && !redirectUri.startsWith("vscode-insiders://")) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const cookieStore = await cookies();

  // Store pending PKCE data in a short-lived server-side cookie (not sent to client)
  const pendingKey = `vsc_pending_${randomBytes(8).toString("hex")}`;
  cookieStore.set(pendingKey, JSON.stringify({ codeChallenge, state, redirectUri }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  // Check if user already has a valid browser session
  const session = await getSession(ghCfg.sessionSecret);
  if (session) {
    // Already authenticated — redirect to the code-exchange helper
    const url = new URL("/api/vscode/auth/exchange", req.url);
    url.searchParams.set("pending_key", pendingKey);
    return NextResponse.redirect(url);
  }

  // Need to authenticate first — bounce through GitHub OAuth
  const githubState  = `vscode:${pendingKey}`;
  const githubParams = new URLSearchParams({
    client_id:    ghCfg.clientId,
    redirect_uri: new URL("/api/auth/callback/github", req.url).toString(),
    scope:        "read:user",
    state:        githubState,
  });

  cookieStore.set(`gh_state_${pendingKey}`, githubState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(
    `https://github.com/login/oauth/authorize?${githubParams}`,
  );
}
