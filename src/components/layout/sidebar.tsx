"use client";

import Link from "next/link";
import { Settings, Pin, Plus, Search, Sparkles, UserRound, X } from "lucide-react";
import { useApp } from "@/hooks/use-app";
import { useHydrated } from "@/hooks/use-hydrated";
import type { Thread } from "@/types/thread.types";
import { cn, dateBucket, relativeTime, type DateBucket } from "@/lib/utils";

const BUCKET_ORDER: DateBucket[] = ["Today", "Yesterday", "Earlier"];

interface SidebarProps {
  /** Rendered as the mobile drawer — shows a close button. */
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const {
    threads,
    activeThreadId,
    searchQuery,
    setSearchQuery,
    selectThread,
    createThread,
    pinThread,
  } = useApp();
  const hydrated = useHydrated();

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? threads.filter((t) => t.title.toLowerCase().includes(q)) : threads;
  const pinned = filtered.filter((t) => t.pinned);
  const rest = filtered.filter((t) => !t.pinned);

  const buckets = BUCKET_ORDER.map((label) => ({
    label,
    items: rest.filter((t) => dateBucket(t.updatedAt) === label),
  })).filter((b) => b.items.length > 0);

  return (
    <aside className="flex h-dvh w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <Sparkles className="size-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold tracking-tight">assistant</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-auto rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] md:hidden"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={createThread}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Plus className="size-4" /> New Chat
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-hover)] px-2.5 py-1.5">
          <Search className="size-3.5 text-[var(--text-muted)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads"
            aria-label="Search threads"
            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 py-2 scrollbar-hidden">
        {pinned.length > 0 && (
          <ThreadGroup label="Pinned" icon>
            {pinned.map((t) => (
              <ThreadItem
                key={t.id}
                thread={t}
                active={t.id === activeThreadId}
                hydrated={hydrated}
                onSelect={selectThread}
                onPin={pinThread}
              />
            ))}
          </ThreadGroup>
        )}
        {buckets.map((bucket) => (
          <ThreadGroup key={bucket.label} label={bucket.label}>
            {bucket.items.map((t) => (
              <ThreadItem
                key={t.id}
                thread={t}
                active={t.id === activeThreadId}
                hydrated={hydrated}
                onSelect={selectThread}
                onPin={pinThread}
              />
            ))}
          </ThreadGroup>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-[var(--text-muted)]">No threads found</p>
        )}
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><UserRound className="size-3.5" /> Profile</Link>
        <Link href="/settings" className="flex items-center gap-2 rounded-lg px-2 py-2 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"><Settings className="size-3.5" /> Settings</Link>
      </div>
    </aside>
  );
}

function ThreadGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <p className="flex items-center gap-1 px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {icon && <Pin className="size-2.5" />} {label}
      </p>
      <ul>{children}</ul>
    </div>
  );
}

function ThreadItem({
  thread,
  active,
  hydrated,
  onSelect,
  onPin,
}: {
  thread: Thread;
  active: boolean;
  hydrated: boolean;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => onSelect(thread.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          active ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{thread.title}</span>
        <span className="shrink-0 text-[11px] text-[var(--text-muted)]">
          {hydrated ? relativeTime(thread.updatedAt) : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onPin(thread.id)}
        aria-label={thread.pinned ? "Unpin thread" : "Pin thread"}
        className={cn(
          "absolute right-1.5 top-1.5 rounded p-0.5 text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[var(--text-primary)] focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100",
          thread.pinned && "text-[var(--accent)] opacity-100",
        )}
      >
        <Pin className="size-3" />
      </button>
    </li>
  );
}
