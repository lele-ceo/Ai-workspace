import type { EnvSource } from "@/lib/env";

export interface GitHubConfig {
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  sessionSecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export function getGitHubConfig(env: EnvSource = process.env): GitHubConfig | null {
  const appId = env.GITHUB_APP_ID?.trim();
  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  const privateKey = env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const sessionSecret = env.GITHUB_SESSION_SECRET?.trim();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!appId || !clientId || !clientSecret || !privateKey || !sessionSecret || !supabaseUrl || !supabaseServiceRoleKey) return null;
  return { appId, clientId, clientSecret, privateKey, sessionSecret, supabaseUrl, supabaseServiceRoleKey };
}
