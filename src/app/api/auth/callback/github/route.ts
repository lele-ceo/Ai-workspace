import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getGitHubConfig } from "@/lib/github/config";
import { getDatabase } from "@/lib/github/database";
import { encrypt } from "@/lib/github/encrypt";
import { encodeSession, sessionCookieOptions } from "@/lib/github/session";

export const runtime = "nodejs";

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days in seconds

/**
 * GET /api/auth/callback/github
 * GitHub redirects here with `code` and `state` after the user authorises.
 * We verify state, exchange the code for a token, fetch the user's identity,
 * store the encrypted token in Supabase and set a signed session cookie.
 */
export async function GET(req: NextRequest) {
  const config = getGitHubConfig();
  if (!config) {
    return NextResponse.json(
      { error: "github_not_configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/?github_error=${encodeURIComponent(errorParam)}`, req.url),
    );
  }

  // CSRF check
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gh_oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    return NextResponse.json({ error: "state_mismatch" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      }),
    },
  );

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: "token_exchange_failed" },
      { status: 502 },
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.json(
      { error: tokenData.error ?? "no_access_token" },
      { status: 400 },
    );
  }

  // Fetch GitHub user identity
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!userRes.ok) {
    return NextResponse.json(
      { error: "user_fetch_failed" },
      { status: 502 },
    );
  }

  const githubUser = (await userRes.json()) as {
    id: number;
    login: string;
  };

  const encryptedToken = encrypt(tokenData.access_token, config.sessionSecret);

  // Upsert into Supabase
  const db = getDatabase(config);
  const userId = randomUUID();
  const { error: dbError } = await db.from("github_connections").upsert(
    {
      id: userId,
      github_user_id: githubUser.id,
      github_login: githubUser.login,
      encrypted_access_token: encryptedToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "github_user_id" },
  );

  if (dbError) {
    console.error("[auth/callback] supabase upsert error:", dbError.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Fetch the row to get the canonical UUID (may differ on update)
  const { data: row } = await db
    .from("github_connections")
    .select("id")
    .eq("github_user_id", githubUser.id)
    .single();

  const sessionPayload = {
    userId: (row as { id: string } | null)?.id ?? userId,
    githubLogin: githubUser.login,
    githubUserId: githubUser.id,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL,
  };

  const signed = encodeSession(sessionPayload, config.sessionSecret);
  const response = NextResponse.redirect(new URL("/", req.url));

  // Clear the CSRF state cookie and set the session cookie
  response.cookies.delete("gh_oauth_state");
  response.cookies.set(sessionCookieOptions(signed, SESSION_TTL));
  return response;
}
