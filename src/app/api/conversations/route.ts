import { NextRequest, NextResponse } from "next/server";
import { persistenceDatabase, requirePersonalTenant } from "@/lib/persistence/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const tenant = await requirePersonalTenant();
  const db = persistenceDatabase();
  if (!tenant || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const cursor = req.nextUrl.searchParams.get("cursor");
  let query = db
    .from("conversations")
    .select("id,title,pinned,archived_at,updated_at,created_at")
    .eq("organization_id", tenant.organizationId)
    .eq("workspace_id", tenant.workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (cursor) query = query.lt("updated_at", cursor);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "persistence_unavailable" }, { status: 503 });
  const rows = data ?? [];
  const page = rows.slice(0, PAGE_SIZE);
  return NextResponse.json({ conversations: page, nextCursor: rows.length > PAGE_SIZE ? page.at(-1)?.updated_at ?? null : null });
}

export async function POST(req: NextRequest) {
  const tenant = await requirePersonalTenant();
  const db = persistenceDatabase();
  if (!tenant || !db) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const title = typeof (body as { title?: unknown }).title === "string" ? (body as { title: string }).title.trim() : "New chat";
  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });

  const { data, error } = await db.from("conversations").insert({
    organization_id: tenant.organizationId,
    workspace_id: tenant.workspaceId,
    created_by: tenant.user.userId,
    title,
  }).select("id,title,pinned,archived_at,updated_at,created_at").single();
  if (error || !data) return NextResponse.json({ error: "persistence_unavailable" }, { status: 503 });
  await db.from("conversation_participants").insert({ conversation_id: data.id, user_id: tenant.user.userId, role: "owner" });
  return NextResponse.json({ conversation: data }, { status: 201 });
}
