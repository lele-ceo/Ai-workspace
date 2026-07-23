import { expect, test } from "bun:test";
import {
  getAgentGuardConfig,
  resolveModel,
  validateChatRequest,
} from "./chat-contract";

test("accepts a bounded Claude chat request", () => {
  const result = validateChatRequest({
    model: "claude",
    messages: [{ role: "user", content: "Hello" }],
  });
  expect(result.ok).toBe(true);
});

test("rejects providers that do not have a configured live backend", () => {
  const result = validateChatRequest({
    model: "chatgpt",
    messages: [{ role: "user", content: "Hello" }],
  });
  expect(result).toEqual({ ok: false, error: "Only the Claude provider is available in live mode." });
});

test("rejects malformed messages before reaching the provider", () => {
  const result = validateChatRequest({ model: "claude", messages: [{ role: "system", content: "no" }] });
  expect(result.ok).toBe(false);
});

test("requires all AgentGuard credentials and a valid proxy URL", () => {
  expect(getAgentGuardConfig({ ANTHROPIC_API_KEY: "key" })).toBeNull();
  expect(getAgentGuardConfig({
    ANTHROPIC_API_KEY: "key",
    AGENTGUARD_URL: "not-a-url",
    AGENTGUARD_AGENT_ID: "agent",
    AGENTGUARD_PROXY_KEY: "proxy",
  })).toBeNull();
  expect(getAgentGuardConfig({
    ANTHROPIC_API_KEY: "key",
    AGENTGUARD_URL: "https://guard.example.com",
    AGENTGUARD_AGENT_ID: "agent",
    AGENTGUARD_PROXY_KEY: "proxy",
  })).toEqual({
    apiKey: "key",
    baseURL: "https://guard.example.com",
    agentId: "agent",
    proxyKey: "proxy",
  });
});

test("resolves the only configured provider model", () => {
  expect(resolveModel("claude")).toBe("claude-sonnet-4-5-20250929");
});
