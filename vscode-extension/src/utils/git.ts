import * as cp from "child_process";
import * as path from "path";

export interface GitMetadata {
  branch: string;
  commitHash: string;
  /** Remote hostname only — never includes credentials or tokens. */
  remoteHostname: string | null;
}

export async function getGitMetadata(workspaceRoot: string): Promise<GitMetadata | null> {
  try {
    const [branch, commit, remote] = await Promise.all([
      run(["rev-parse", "--abbrev-ref", "HEAD"], workspaceRoot),
      run(["rev-parse", "HEAD"], workspaceRoot),
      run(["remote", "get-url", "origin"], workspaceRoot).catch(() => null),
    ]);

    const remoteHostname = extractHostname(remote ?? "");

    return {
      branch:         branch.trim(),
      commitHash:     commit.trim(),
      remoteHostname: remoteHostname ?? null,
    };
  } catch {
    return null;
  }
}

function run(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.execFile("git", args, { cwd, encoding: "utf8", timeout: 5000 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

/** Extract hostname from a git remote URL, stripping any embedded credentials. */
function extractHostname(remoteUrl: string): string | null {
  if (!remoteUrl) return null;
  // SSH: git@github.com:org/repo.git  → github.com
  const sshMatch = /^(?:[^@]+@)?([^:/]+)[:/]/.exec(remoteUrl);
  if (sshMatch) return sshMatch[1];
  // HTTPS: https://user:pass@github.com/org/repo.git → github.com
  try {
    const url = new URL(remoteUrl);
    return url.hostname;
  } catch {
    return null;
  }
}
