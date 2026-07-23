/**
 * AgentGuard integration test.
 *
 * Prerequisites:
 *   1. AgentGuard running at AGENTGUARD_URL (default http://localhost:3939)
 *   2. ANTHROPIC_API_KEY set in the environment
 *
 * Run with:
 *   ANTHROPIC_API_KEY=sk-ant-... bun test src/lib/ai/agentguard.integration.test.ts
 *
 * The test is skipped automatically when AGENTGUARD_URL is not reachable or
 * ANTHROPIC_API_KEY is absent — so it never blocks CI that doesn't spin up AgentGuard.
 */

import { test, expect, describe, beforeAll } from "bun:test";

const AGENTGUARD_URL = process.env.AGENTGUARD_URL ?? "http://localhost:3939";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// ── Helpers ────────────────────────────────────────────────────────────────────

async function isAgentGuardReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENTGUARD_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

interface ActivateResponse {
  agent_id: string;
  proxy_key: string;
  provider: string;
  budget_usd: number;
  spent_usd: number;
  status: string;
}

async function registerAgent(budgetUsd: number): Promise<ActivateResponse> {
  const res = await fetch(`${AGENTGUARD_URL}/api/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "anthropic",
      api_key: ANTHROPIC_API_KEY,
      monthly_budget_usd: budgetUsd,
      alert_email: "test@example.com",
    }),
  });
  if (!res.ok) throw new Error(`activate failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<ActivateResponse>;
}

interface SpendingRecord {
  id: number;
  agent_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  created_at: string;
}

async function getSpending(agentId: string): Promise<SpendingRecord[]> {
  const res = await fetch(`${AGENTGUARD_URL}/api/agents/${agentId}/spending`);
  if (!res.ok) throw new Error(`spending fetch failed: ${res.status}`);
  const data = await res.json() as { records?: SpendingRecord[] };
  return data.records ?? [];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("AgentGuard integration", () => {
  let reachable = false;

  beforeAll(async () => {
    reachable = await isAgentGuardReachable();
    if (!reachable) {
      console.warn("[skip] AgentGuard not reachable at", AGENTGUARD_URL);
    }
    if (!ANTHROPIC_API_KEY) {
      console.warn("[skip] ANTHROPIC_API_KEY not set");
    }
  });

  // ── Health check ─────────────────────────────────────────────────────────────

  test("AgentGuard /health returns 200", async () => {
    if (!reachable) return; // soft skip
    const res = await fetch(`${AGENTGUARD_URL}/health`);
    expect(res.status).toBe(200);
  });

  // ── Successful proxied call ───────────────────────────────────────────────────

  test("proxied Anthropic call succeeds and is logged in spending", async () => {
    if (!reachable || !ANTHROPIC_API_KEY) return; // soft skip

    // Register with a generous budget so the call goes through.
    const agent = await registerAgent(10);
    expect(agent.agent_id).toBeTruthy();
    expect(agent.proxy_key).toBeTruthy();
    expect(agent.status).toBe("active");

    // Make a real (non-streaming) call through AgentGuard.
    const res = await fetch(`${AGENTGUARD_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": ANTHROPIC_API_KEY,
        "X-Ahrply-Agent-ID": agent.agent_id,
        "X-Ahrply-Proxy-Key": agent.proxy_key,
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 16,
        messages: [{ role: "user", content: "Say only: OK" }],
      }),
    });

    // AgentGuard should forward the request and return a normal Anthropic response.
    expect(res.status).toBe(200);

    const body = await res.json() as { content?: Array<{ text?: string }> };
    expect(body.content?.[0]?.text).toBeTruthy();

    // AgentGuard attaches cost headers.
    const cost = res.headers.get("x-ahrply-cost");
    expect(cost).not.toBeNull();
    expect(parseFloat(cost!)).toBeGreaterThan(0);

    // Spending record should appear in the log within a short window.
    await new Promise((r) => setTimeout(r, 500));
    const records = await getSpending(agent.agent_id);
    expect(records.length).toBeGreaterThanOrEqual(1);
    expect(records[0].cost_usd).toBeGreaterThan(0);
  }, 30_000); // 30s — allows for cold-start latency

  // ── Budget enforcement ────────────────────────────────────────────────────────

  test("budget_exceeded: $0.01 budget blocks subsequent calls", async () => {
    if (!reachable || !ANTHROPIC_API_KEY) return; // soft skip

    // Register with a one-cent budget — will be exhausted after the first call
    // (haiku costs ~$0.001 for a tiny message, so the second attempt is blocked).
    const agent = await registerAgent(0.01);

    const callOnce = () =>
      fetch(`${AGENTGUARD_URL}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": ANTHROPIC_API_KEY,
          "X-Ahrply-Agent-ID": agent.agent_id,
          "X-Ahrply-Proxy-Key": agent.proxy_key,
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 16,
          messages: [{ role: "user", content: "Say only: OK" }],
        }),
      });

    // First call — may succeed or immediately hit the tiny budget.
    const first = await callOnce();
    // Second call — must be blocked.
    const second = await callOnce();

    // At least one of the two calls must be a 429.
    const statuses = [first.status, second.status];
    expect(statuses).toContain(429);

    // The 429 body must describe budget_exceeded.
    const blocked = first.status === 429 ? first : second;
    const errBody = await blocked.json() as { error?: { type?: string } };
    expect(errBody.error?.type).toBe("budget_exceeded");
  }, 30_000);
});
