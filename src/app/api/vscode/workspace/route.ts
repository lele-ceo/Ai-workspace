import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getVscodeConfig } from "@/lib/vscode/config";
import { getGitHubConfig } from "@/lib/github/config";
import { getSession } from "@/lib/github/session";
import type { WorkspaceConnection } from "@/types/vscode-session.types";

export const runtime = "nodejs";

/**
 * GET /api/vscode/workspace
 * Returns connected VS Code workspaces for the authenticated browser session.
 * Used by the web UI WorkspaceIndicator component.
 */
export async function GET() {
  const cfg   = getVscodeConfig();
  const ghCfg = getGitHubConfig();
  if (!cfg || !ghCfg) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const browserSession = await getSession(ghCfg.sessionSecret);
  if (!browserSession) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Find active (non-revoked, non-expired) VS Code sessions for this user
  const { data: sessions, error } = await db
    .from("vscode_sessions")
    .select("id, device_id, github_login, created_at, last_heartbeat_at, expires_at")
    .eq("user_id", browserSession.userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("last_heartbeat_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  if (!sessions?.length) {
    return NextResponse.json({ connections: [] });
  }

  // For each session, find the most-recently uploaded workspace context
  const sessionIds = sessions.map((s) => s.id as string);
  const { data: contexts } = await db
    .from("workspace_contexts")
    .select("session_id, workspace_id, context->workspaceName, uploaded_at, content_hash")
    .in("session_id", sessionIds)
    .order("uploaded_at", { ascending: false });

  // Map: session_id → latest context row
  type CtxRow = NonNullable<typeof contexts>[number];
  const ctxBySession = new Map<string, CtxRow>();
  for (const ctx of contexts ?? []) {
    if (!ctxBySession.has(ctx.session_id as string)) {
      ctxBySession.set(ctx.session_id as string, ctx);
    }
  }

  const HEARTBEAT_STALE_MS = 90_000; // 90 s — 1.5× heartbeat interval
  const now = Date.now();

  const connections: WorkspaceConnection[] = sessions.map((s) => {
    const ctx = ctxBySession.get(s.id as string);
    const lastBeat = s.last_heartbeat_at ? new Date(s.last_heartbeat_at as string).getTime() : 0;
    const online = lastBeat > 0 && now - lastBeat < HEARTBEAT_STALE_MS;

    return {
      sessionId:      s.id as string,
      deviceId:       s.device_id as string,
      workspaceId:    ctx ? (ctx.workspace_id as string) : null,
      workspaceName:  ctx ? (ctx.workspaceName as string | null) : null,
      online,
      lastSeenAt:     s.last_heartbeat_at as string | null,
      contextHash:    ctx ? (ctx.content_hash as string) : null,
      contextUpdatedAt: ctx ? (ctx.uploaded_at as string) : null,
    };
  });

  return NextResponse.json({ connections });
}
