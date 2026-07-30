import { expect, test } from "bun:test";
import {
  getAgentGuardConfig,
  PROVIDER_MODELS,
  resolveModel,
  validateChatRequest,
} from "./chat-contract";

test("accepts a bounded Claude chat request", () => {
  const result = validateChatRequest({
    model: "claude",
    messages: [{ role: "user", content: "Hello" }],
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.provider).toBe("claude");
    expect(result.value.model).toBe(PROVIDER_MODELS.claude);
  }
});

test("accepts all known providers", () => {
  for (const provider of Object.keys(PROVIDER_MODELS)) {
    const result = validateChatRequest({
      model: provider,
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result.ok).toBe(true);
  }
});

test("rejects an unknown provider", () => {
  const result = validateChatRequest({
    model: "unknown-llm",
    messages: [{ role: "user", content: "Hello" }],
  });
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toContain("Unknown provider");
});

test("rejects malformed messages before reaching the provider", () => {
  const result = validateChatRequest({ model: "claude", messages: [{ role: "system", content: "no" }] });
  expect(result.ok).toBe(false);
});

test("requires all AgentGuard credentials and a valid proxy URL", () => {
  expect(getAgentGuardConfig({ ANTHROPIC_API_KEY: "key" })).toBeNull();
  expect(
    getAgentGuardConfig({
      ANTHROPIC_API_KEY: "key",
      AGENTGUARD_URL: "not-a-url",
      AGENTGUARD_AGENT_ID: "agent",
      AGENTGUARD_PROXY_KEY: "proxy",
    }),
  ).toBeNull();
  expect(
    getAgentGuardConfig({
      ANTHROPIC_API_KEY: "key",
      AGENTGUARD_URL: "https://guard.example.com",
      AGENTGUARD_AGENT_ID: "agent",
      AGENTGUARD_PROXY_KEY: "proxy",
    }),
  ).toEqual({
    apiKey: "key",
    baseURL: "https://guard.example.com",
    agentId: "agent",
    proxyKey: "proxy",
  });
});

test("resolveModel returns canonical model IDs", () => {
  expect(resolveModel("claude")).toBe("claude-sonnet-4-5-20250929");
  expect(resolveModel("chatgpt")).toBe("gpt-4o");
  expect(resolveModel("gemini")).toBe("gemini-2.0-flash");
  expect(resolveModel("perplexity")).toBe("llama-3.1-sonar-small-128k-online");
  expect(resolveModel("base")).toBe("claude-sonnet-4-5-20250929");
  expect(resolveModel("unknown")).toBe("");
});
