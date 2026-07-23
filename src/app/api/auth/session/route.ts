import { NextResponse } from "next/server";
import { getGitHubConfig } from "@/lib/github/config";
import { getSession } from "@/lib/github/session";

export const runtime = "nodejs";

/**
 * GET /api/auth/session
 * Returns the signed-in user's public identity, or null if not signed in.
 * Never returns the encrypted access token or any other credential.
 */
export async function GET() {
  const config = getGitHubConfig();
  if (!config) {
    return NextResponse.json({ user: null });
  }

  const session = await getSession(config.sessionSecret);
  if (!session) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      login: session.githubLogin,
      githubUserId: session.githubUserId,
    },
  });
}
