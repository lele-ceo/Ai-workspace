import { NextRequest, NextResponse } from "next/server";
import { getVscodeConfig } from "@/lib/vscode/config";
import {
  extractBearerToken,
  validateVscodeToken,
  heartbeatSession,
} from "@/lib/vscode/session";

export const runtime = "nodejs";

/**
 * POST /api/vscode/session/heartbeat
 * Keeps the session alive. Returns 200 with updated server time on success.
 */
export async function POST(req: NextRequest) {
  const cfg = getVscodeConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await validateVscodeToken(cfg, token);
  if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const ok = await heartbeatSession(cfg, session.id);
  if (!ok) return NextResponse.json({ error: "heartbeat_failed" }, { status: 500 });

  return NextResponse.json({
    session_id: session.id,
    server_time: new Date().toISOString(),
    expires_at: session.expires_at,
  });
}
