"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, PanelLeft, RotateCcw, Users } from "lucide-react";
import { useApp } from "@/hooks/use-app";
import { Sidebar } from "./sidebar";
import { TopProviderBar } from "./top-provider-bar";
import { AgentDrawer } from "./agent-drawer";
import { Conversation } from "@/components/chat/conversation";
import { Composer } from "@/components/composer/composer";
import { ModelSelector } from "@/components/composer/model-selector";

// Shell: fixed desktop sidebar + animated mobile drawer, a header whose hover
// zone reveals the provider bar, then the scrollable conversation and the
// pinned composer. No right panel — everything is on-demand (per spec).
export function ChatLayout() {
  const {
    activeThread,
    activeAgent,
    sidebarOpen,
    setSidebarOpen,
    setAgentDrawerOpen,
    isLiveMode,
    mockSpending,
    mockSpendStatus,
    resetMockSpending,
  } = useApp();

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Persistent topbar model switcher — the sole model chooser on desktop. */}
        <div className="hidden md:block">
          <TopProviderBar />
        </div>

        <header className="border-b border-[var(--border)] px-3 py-3 md:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] md:hidden"
            >
              <PanelLeft className="size-4" />
            </button>
            <h1 className="truncate text-sm font-medium text-[var(--text-primary)]">
              {activeThread.messages.length === 0 ? "New Chat" : activeThread.title}
            </h1>

            {/* Agent-management trigger — mobile only (desktop uses the composer
                agent selector). The bottom edge is owned by the composer, so the
                app-bar action is the native-appropriate trigger here. */}
            <button
              type="button"
              onClick={() => setAgentDrawerOpen(true)}
              aria-label="Manage agents"
              aria-haspopup="dialog"
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:hidden"
            >
              <span
                className="flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: activeAgent.color }}
                aria-hidden
              >
                {activeAgent.avatar}
              </span>
              <Users className="size-4" />
            </button>
          </div>

          {/* Model selector — mobile only. On desktop it lives in the composer;
              below md the composer hides it and it relocates here, under the
              "New Chat" title. Same ModelSelector component/popup, opened
              downward. The Specialist (AgentSelector) stays in the composer. */}
          <div className="mt-2 md:hidden">
            <ModelSelector placement="down" />
          </div>
        </header>

        {!isLiveMode && (mockSpendStatus.warning || mockSpendStatus.blocked) && (
          <div
            role="status"
            className="flex items-center gap-2 border-b border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-100 md:px-4"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-300" aria-hidden />
            <span>
              {mockSpendStatus.blocked
                ? `Mock monthly limit reached ($${mockSpending.spentUsd.toFixed(2)} / $${mockSpending.monthlyCapUsd.toFixed(2)}). New mock requests are blocked.`
                : `Mock spending warning: ${mockSpendStatus.percentUsed}% of the $${mockSpending.monthlyCapUsd.toFixed(2)} monthly cap is used.`}
            </span>
            <button
              type="button"
              onClick={resetMockSpending}
              className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
        )}

        <Conversation />
        <Composer />
      </div>

      <AgentDrawer />
    </div>
  );
}
