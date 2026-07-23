export interface VscodeConfig {
  sessionSecret: string;   // used to sign VS Code session tokens
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  appBaseUrl: string;      // e.g. https://aetherisui.app
}

export function getVscodeConfig(env: NodeJS.ProcessEnv = process.env): VscodeConfig | null {
  const sessionSecret        = env.VSCODE_SESSION_SECRET?.trim();
  const supabaseUrl          = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const appBaseUrl           = env.NEXT_PUBLIC_APP_URL?.trim() ?? env.VERCEL_URL?.trim();

  if (!sessionSecret || !supabaseUrl || !supabaseServiceRoleKey || !appBaseUrl) return null;
  return { sessionSecret, supabaseUrl, supabaseServiceRoleKey, appBaseUrl };
}
