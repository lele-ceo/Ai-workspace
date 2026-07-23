import { getAgentGuardConfig } from "@/lib/ai/chat-contract";

export const dynamic = "force-dynamic";

export function GET() {
  const configured = Boolean(getAgentGuardConfig());
  return Response.json(
    { status: "ok", liveAiConfigured: configured },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
