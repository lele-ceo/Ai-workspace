/**
 * Lightweight HMAC-SHA256-signed session cookie.
 *
 * The cookie value is:  base64(payload) + "." + base64(hmac)
 * The payload is a JSON object with a fixed set of fields.
 *
 * This module is Node.js-only (uses node:crypto).
 * It never stores or returns the encrypted access token — that lives
 * exclusively in Supabase and is retrieved server-side when needed.
 */

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "gh_session";
const ALGORITHM = "sha256";

export interface SessionPayload {
  userId: string;
  githubLogin: string;
  githubUserId: number;
  /** Unix timestamp (seconds) */
  expiresAt: number;
}

function sign(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest("base64url");
}

export function encodeSession(payload: SessionPayload, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export function decodeSession(
  value: string,
  secret: string,
): SessionPayload | null {
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = sign(encoded, secret);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(
  secret: string,
): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeSession(raw, secret);
}

export function sessionCookieOptions(value: string, ttlSeconds: number) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ttlSeconds,
  };
}
