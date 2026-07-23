import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { getVscodeConfig } from "@/lib/vscode/config";
import {
  extractBearerToken,
  validateVscodeToken,
} from "@/lib/vscode/session";
import type { RepositoryContext, ContextDelta } from "@/types/vscode-session.types";

export const runtime = "nodejs";

const MAX_PAYLOAD_BYTES = 1_048_576; // 1 MB

function db(cfg: ReturnType<typeof getVscodeConfig>) {
  if (!cfg) throw new Error("missing config");
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * POST /api/vscode/context
 * Full context upload. Body: { workspace_id, context: RepositoryContext }
 * Upserts into workspace_contexts table keyed by (session_id, workspace_id).
 */
export async function POST(req: NextRequest) {
  const cfg = getVscodeConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await validateVscodeToken(cfg, token);
  if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: { workspace_id: string; context: RepositoryContext };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { workspace_id, context } = body;
  if (!workspace_id || !context) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const contentHash = createHash("sha256")
    .update(JSON.stringify(context))
    .digest("hex");

  const { error } = await db(cfg)
    .from("workspace_contexts")
    .upsert(
      {
        session_id:    session.id,
        workspace_id,
        user_id:       session.user_id,
        context,
        content_hash:  contentHash,
        uploaded_at:   new Date().toISOString(),
      },
      { onConflict: "session_id,workspace_id" },
    );

  if (error) {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content_hash: contentHash });
}

/**
 * PATCH /api/vscode/context
 * Delta upload. Body: { workspace_id, delta: ContextDelta }
 * Merges changed/removed files into the stored context JSON.
 */
export async function PATCH(req: NextRequest) {
  const cfg = getVscodeConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await validateVscodeToken(cfg, token);
  if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let body: { workspace_id: string; delta: ContextDelta };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { workspace_id, delta } = body;
  if (!workspace_id || !delta) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const client = db(cfg);

  // Fetch the current context
  const { data: row } = await client
    .from("workspace_contexts")
    .select("context")
    .eq("session_id", session.id)
    .eq("workspace_id", workspace_id)
    .single();

  if (!row) {
    return NextResponse.json({ error: "no_full_context" }, { status: 409 });
  }

  const current = row.context as RepositoryContext;

  // Apply delta: replace changed selectedFiles, remove deleted paths
  const fileMap = new Map(current.selectedFiles.map((f) => [f.path, f]));
  for (const file of delta.updatedFiles) {
    fileMap.set(file.path, file);
  }
  for (const removedPath of delta.removedPaths) {
    fileMap.delete(removedPath);
  }
  const merged: RepositoryContext = {
    ...current,
    selectedFiles: Array.from(fileMap.values()),
    activeFile:    delta.activeFile ?? current.activeFile,
    version:       (current.version ?? 0) + 1,
    syncedAt:      delta.syncedAt,
  };

  const contentHash = createHash("sha256")
    .update(JSON.stringify(merged))
    .digest("hex");

  const { error } = await client
    .from("workspace_contexts")
    .update({
      context:      merged,
      content_hash: contentHash,
      uploaded_at:  new Date().toISOString(),
    })
    .eq("session_id", session.id)
    .eq("workspace_id", workspace_id);

  if (error) {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, content_hash: contentHash });
}

/**
 * DELETE /api/vscode/context?workspace_id=<id>
 * Removes context for the session/workspace pair.
 */
export async function DELETE(req: NextRequest) {
  const cfg = getVscodeConfig();
  if (!cfg) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await validateVscodeToken(cfg, token);
  if (!session) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspace_id = searchParams.get("workspace_id");
  if (!workspace_id) {
    return NextResponse.json({ error: "missing_workspace_id" }, { status: 400 });
  }

  await db(cfg)
    .from("workspace_contexts")
    .delete()
    .eq("session_id", session.id)
    .eq("workspace_id", workspace_id);

  return NextResponse.json({ ok: true });
}
