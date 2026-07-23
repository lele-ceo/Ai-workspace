import { getDatabase } from "@/lib/github/database";
import { getGitHubConfig } from "@/lib/github/config";
import { getSession, type SessionPayload } from "@/lib/github/session";

export interface TenantContext {
  user: SessionPayload;
  organizationId: string;
  workspaceId: string;
}

function personalOrganizationSlug(userId: string): string {
  return `personal-${userId}`;
}

/**
 * Resolves a signed browser session to a server-authorized personal tenant.
 * Client-provided tenant identifiers are intentionally never accepted here.
 */
export async function requirePersonalTenant(): Promise<TenantContext | null> {
  const config = getGitHubConfig();
  if (!config) return null;
  const user = await getSession(config.sessionSecret);
  if (!user) return null;

  const db = getDatabase(config);
  const { error: userError } = await db.from("app_users").upsert({
    id: user.userId,
    github_login: user.githubLogin,
    deleted_at: null,
  });
  if (userError) throw new Error(`Unable to provision user: ${userError.message}`);

  const slug = personalOrganizationSlug(user.userId);
  const { data: organization, error: organizationError } = await db
    .from("organizations")
    .upsert({ name: `${user.githubLogin}'s workspace`, slug }, { onConflict: "slug" })
    .select("id")
    .single();
  if (organizationError || !organization) {
    throw new Error(`Unable to provision organization: ${organizationError?.message ?? "unknown error"}`);
  }

  const { error: membershipError } = await db.from("organization_memberships").upsert({
    organization_id: organization.id,
    user_id: user.userId,
    role: "owner",
    revoked_at: null,
  });
  if (membershipError) throw new Error(`Unable to provision membership: ${membershipError.message}`);

  const workspaceKey = `personal-${user.userId}`;
  const { data: workspace, error: workspaceError } = await db
    .from("workspaces")
    .upsert(
      {
        organization_id: organization.id,
        external_key: workspaceKey,
        name: "Personal workspace",
        created_by: user.userId,
        deleted_at: null,
      },
      { onConflict: "organization_id,external_key" },
    )
    .select("id")
    .single();
  if (workspaceError || !workspace) {
    throw new Error(`Unable to provision workspace: ${workspaceError?.message ?? "unknown error"}`);
  }

  return { user, organizationId: organization.id, workspaceId: workspace.id };
}

export function persistenceDatabase() {
  const config = getGitHubConfig();
  if (!config) return null;
  return getDatabase(config);
}
