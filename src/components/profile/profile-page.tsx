"use client";

import { Check, Pencil, UserRound } from "lucide-react";
import { useState } from "react";
import { WorkspacePageShell } from "@/components/layout/workspace-page-shell";
import { useApp } from "@/hooks/use-app";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

interface Profile {
  displayName: string;
  username: string;
  bio: string;
  language: string;
  timezone: string;
}

const DEFAULT_PROFILE: Profile = {
  displayName: "Workspace user",
  username: "workspace-user",
  bio: "Building with AI, one focused iteration at a time.",
  language: "English",
  timezone: "Europe/Rome",
};

export function ProfilePage() {
  const { threads } = useApp();
  const [profile, setProfile] = useLocalStorageState<Profile>("ai-assistant:profile", DEFAULT_PROFILE);
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const messageCount = threads.reduce((total, thread) => total + thread.messages.length, 0);

  const save = () => {
    setProfile(draft);
    setEditing(false);
  };

  return (
    <WorkspacePageShell title="Profile" description="Your local workspace identity and usage overview.">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-semibold text-white">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{profile.displayName}</h2>
              <p className="text-sm text-[var(--text-secondary)]">@{profile.username}</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{profile.bio}</p>
            </div>
            <button type="button" onClick={() => { setDraft(profile); setEditing(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <Pencil className="size-3.5" /> Edit
            </button>
          </div>
        </section>

        {editing && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" value={draft.displayName} onChange={(displayName) => setDraft({ ...draft, displayName })} />
              <Field label="Username" value={draft.username} onChange={(username) => setDraft({ ...draft, username })} />
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Bio</span><textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label>
              <Field label="Language" value={draft.language} onChange={(language) => setDraft({ ...draft, language })} />
              <Field label="Timezone" value={draft.timezone} onChange={(timezone) => setDraft({ ...draft, timezone })} />
            </div>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">Cancel</button><button type="button" onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"><Check className="size-3.5" /> Save profile</button></div>
          </section>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="Conversations" value={String(threads.length)} />
          <Stat label="Messages" value={String(messageCount)} />
          <Stat label="Plan" value="Local beta" />
        </section>
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]"><div className="flex items-center gap-2 text-[var(--text-primary)]"><UserRound className="size-4 text-[var(--accent)]" /> Workspace profile</div><p className="mt-2">This profile stays in this browser until account sync is introduced.</p></section>
      </div>
    </WorkspacePageShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{value}</p></div>;
}
