import { NextResponse } from "next/server";
import { getGitHubConfig } from "@/lib/github/config";

export const runtime = "nodejs";

/**
 * GET /api/auth/github
 * Redirects the user to GitHub to begin the OAuth flow.
 * A random `state` parameter is set in a short-lived cookie to prevent CSRF.
 */
export function GET() {
  const config = getGitHubConfig();
  if (!config) {
    return NextResponse.json(
      { error: "github_not_configured" },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: "read:user",
    state,
  });
  const url = `https://github.com/login/oauth/authorize?${params.toString()}`;

  const response = NextResponse.redirect(url);
  response.cookies.set({
    name: "gh_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return response;
}
