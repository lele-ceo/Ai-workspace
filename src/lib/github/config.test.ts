import { expect, test } from "bun:test";
import { getGitHubConfig } from "./config";

test("requires every server-only GitHub connection variable", () => {
  expect(getGitHubConfig({ GITHUB_APP_ID: "1" })).toBeNull();
  expect(getGitHubConfig({
    GITHUB_APP_ID: "1", GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret",
    GITHUB_APP_PRIVATE_KEY: "line1\\nline2", GITHUB_SESSION_SECRET: "session",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "role",
  })).toMatchObject({ privateKey: "line1\nline2" });
});
