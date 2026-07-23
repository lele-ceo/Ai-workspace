import { createClient } from "@supabase/supabase-js";
import type { GitHubConfig } from "./config";

export function getDatabase(config: GitHubConfig) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
