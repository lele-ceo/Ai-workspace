import { createHmac, randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { VscodeConfig } from "./config";
import type { VscodeSession } from "@/types/vscode-session.types";

const TOKEN_TTL_S    = 60 * 60 * 24 * 7;  // 7 days
const REFRESH_TTL_S  = 60 * 60 * 24 * 30; // 30 days

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export interface TokenPair {
  sessionToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: number; // unix seconds
}

export async function createVscodeSession(
  config: VscodeConfig,
  userId: string,
  githubLogin: string,
  deviceId: string,
): Promise<TokenPair> {
  const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawToken    = generateToken();
  const rawRefresh  = generateToken();
  const nowSec      = Math.floor(Date.now() / 1000);
  const expiresAt   = new Date((nowSec + TOKEN_TTL_S) * 1000);
  const refreshExp  = new Date((nowSec + REFRESH_TTL_S) * 1000);

  const { data, error } = await db
    .from("vscode_sessions")
    .insert({
      user_id:          userId,
      github_login:     githubLogin,
      device_id:        deviceId,
      token_hash:       hashToken(rawToken),
      refresh_hash:     hashToken(rawRefresh),
      expires_at:       expiresAt.toISOString(),
      refresh_expires_at: refreshExp.toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create vscode session: ${error?.message}`);

  return {
    sessionToken: rawToken,
    refreshToken:  rawRefresh,
    sessionId:     data.id as string,
    expiresAt:     nowSec + TOKEN_TTL_S,
  };
}

export async function validateVscodeToken(
  config: VscodeConfig,
  rawToken: string,
): Promise<VscodeSession | null> {
  const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const hash = hashToken(rawToken);
  const { data } = await db
    .from("vscode_sessions")
    .select("*")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data) return null;
  return data as unknown as VscodeSession;
}

export async function refreshVscodeToken(
  config: VscodeConfig,
  rawRefreshToken: string,
  sessionId: string,
): Promise<TokenPair | null> {
  const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const hash = hashToken(rawRefreshToken);
  const nowIso = new Date().toISOString();

  const { data: session } = await db
    .from("vscode_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("refresh_hash", hash)
    .is("revoked_at", null)
    .gt("refresh_expires_at", nowIso)
    .single();

  if (!session) return null;

  const rawToken   = generateToken();
  const rawRefresh = generateToken();
  const nowSec     = Math.floor(Date.now() / 1000);
  const expiresAt  = new Date((nowSec + TOKEN_TTL_S) * 1000);
  const refreshExp = new Date((nowSec + REFRESH_TTL_S) * 1000);

  await db.from("vscode_sessions").update({
    token_hash:           hashToken(rawToken),
    refresh_hash:         hashToken(rawRefresh),
    expires_at:           expiresAt.toISOString(),
    refresh_expires_at:   refreshExp.toISOString(),
    last_heartbeat_at:    nowIso,
  }).eq("id", sessionId);

  return {
    sessionToken: rawToken,
    refreshToken:  rawRefresh,
    sessionId,
    expiresAt:     nowSec + TOKEN_TTL_S,
  };
}

export async function revokeVscodeSession(
  config: VscodeConfig,
  sessionId: string,
): Promise<void> {
  const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await db.from("vscode_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function heartbeatSession(
  config: VscodeConfig,
  sessionId: string,
): Promise<boolean> {
  const db = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await db.from("vscode_sessions")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);
  return !error;
}

/** Extract bearer token from Authorization header. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
