"use client";

import { useEffect, useState } from "react";
import { GitBranch, LogOut, Loader2 } from "lucide-react";

interface GitHubUser {
  login: string;
  githubUserId: number;
}

type Status = "loading" | "connected" | "disconnected";

export function GitHubConnection() {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data: { user: GitHubUser | null }) => {
        if (data.user) {
          setUser(data.user);
          setStatus("connected");
        } else {
          setStatus("disconnected");
        }
      })
      .catch(() => setStatus("disconnected"));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[var(--text-muted)]">
        <Loader2 className="size-3.5 animate-spin" />
        <span>GitHub</span>
      </div>
    );
  }

  if (status === "connected" && user) {
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <GitBranch className="size-3.5 shrink-0 text-[var(--accent)]" />
        <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">
          {user.login}
        </span>
        <a
          href="/api/auth/signout"
          aria-label="Disconnect GitHub"
          className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <LogOut className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/github"
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <GitBranch className="size-3.5" />
      Connect GitHub
    </a>
  );
}
