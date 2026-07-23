import { NextRequest, NextResponse } from "next/server";
import { getVscodeConfig } from "@/lib/vscode/config";
import {
  extractBearerToken,
  validateVscodeToken,
  revokeVscodeSession,
} from "@/lib/vscode/session";

export const runtime = "nodejs";

/**
 * POST /api/vscode/auth/revoke
 * Revokes the authenticated VS Code session. Requires bearer token.
 */
export async function POST(req: NextRequest) {
  const cfg = getVscodeConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await validateVscodeToken(cfg, token);
  if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  await revokeVscodeSession(cfg, session.id);
  return NextResponse.json({ revoked: true });
}
