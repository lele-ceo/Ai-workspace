"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function WorkspacePageShell({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="hidden md:block"><Sidebar /></div>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <ArrowLeft className="size-3.5" /> Back to chat
          </Link>
          <header className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
