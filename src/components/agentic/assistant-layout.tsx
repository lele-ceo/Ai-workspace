"use client";

// AssistantLayout: responsive multi-pane shell for the AetherisUI agentic workspace.
// Desktop: [sidebar] [thread] [canvas] [inspector]
// Tablet:  [thread] with inspector as a slide-in panel
// Mobile:  [thread] only; canvas and inspector are drawers
//
// Panes are shown/hidden by booleans — no resizable-panel dependency.
// Introduce resizable panels only once the dependency decision is documented.

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRight, LayoutPanelTop, X } from "lucide-react";

// ── Column width constants (Tailwind) ─────────────────────────────────────────
const INSPECTOR_WIDTH = "w-72";
const CANVAS_WIDTH = "w-96";

// ── Pane toggle button ────────────────────────────────────────────────────────

function PaneToggle({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${active ? "Close" : "Open"} ${label}`}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-indigo-400 ${
        active
          ? "bg-white/10 text-white"
          : "text-white/40 hover:bg-white/6 hover:text-white/70"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Overlay pane (tablet / mobile) ───────────────────────────────────────────

function OverlayPane({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          {/* Pane */}
          <motion.aside
            key="pane"
            role="complementary"
            aria-label={label}
            className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-white/10 bg-[#0a0b0f] lg:hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="flex h-10 items-center justify-between border-b border-white/8 px-4">
              <span className="text-[13px] font-medium text-white">{label}</span>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${label}`}
                className="rounded p-1 text-white/40 hover:text-white/70 focus-visible:outline-2 focus-visible:outline-indigo-400"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── AssistantLayout ───────────────────────────────────────────────────────────

export interface AssistantLayoutProps {
  /** Fixed left sidebar (thread list, navigation). */
  sidebar: ReactNode;
  /** Main thread workspace (messages + composer). */
  thread: ReactNode;
  /** Right canvas pane: artifacts, docs, diagrams. */
  canvas?: ReactNode;
  /** Far-right inspector pane: agent status, timeline. */
  inspector?: ReactNode;
  /** Bottom status bar (budget, latency, MCP). */
  statusBar?: ReactNode;
}

export function AssistantLayout({
  sidebar,
  thread,
  canvas,
  inspector,
  statusBar,
}: AssistantLayoutProps) {
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#07090f] text-white">
      {/* ── Top action row (pane toggles) ──────────────────────────────────── */}
      {(canvas || inspector) && (
        <div className="flex h-9 shrink-0 items-center justify-end gap-1 border-b border-white/8 bg-black/20 px-3">
          {canvas && (
            <PaneToggle
              label="Canvas"
              active={canvasOpen}
              icon={<LayoutPanelTop className="size-4" aria-hidden />}
              onClick={() => setCanvasOpen((v) => !v)}
            />
          )}
          {inspector && (
            <PaneToggle
              label="Inspector"
              active={inspectorOpen}
              icon={<PanelRight className="size-4" aria-hidden />}
              onClick={() => setInspectorOpen((v) => !v)}
            />
          )}
        </div>
      )}

      {/* ── Main body ──────────────────────────────────────────────────────── */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar — always visible on desktop, hidden on mobile (handled by
            the existing ChatLayout sidebar/drawer implementation) */}
        <nav
          aria-label="Workspace navigation"
          className="hidden h-full w-56 shrink-0 border-r border-white/8 lg:flex lg:flex-col"
        >
          {sidebar}
        </nav>

        {/* Thread workspace */}
        <main
          className="flex flex-1 flex-col overflow-hidden"
          aria-label="Conversation thread"
        >
          {thread}
        </main>

        {/* Canvas pane — desktop inline, mobile overlay */}
        {canvas && (
          <>
            {/* Desktop inline */}
            <AnimatePresence initial={false}>
              {canvasOpen && (
                <motion.aside
                  key="canvas-desktop"
                  aria-label="Artifacts canvas"
                  className={`hidden h-full shrink-0 flex-col border-l border-white/8 ${CANVAS_WIDTH} lg:flex`}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: undefined, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                >
                  {canvas}
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Mobile overlay */}
            <OverlayPane
              open={canvasOpen}
              onClose={() => setCanvasOpen(false)}
              label="Canvas"
            >
              {canvas}
            </OverlayPane>
          </>
        )}

        {/* Inspector pane — desktop inline, mobile overlay */}
        {inspector && (
          <>
            {/* Desktop inline */}
            <AnimatePresence initial={false}>
              {inspectorOpen && (
                <motion.aside
                  key="inspector-desktop"
                  aria-label="Agent inspector"
                  className={`hidden h-full shrink-0 flex-col border-l border-white/8 ${INSPECTOR_WIDTH} lg:flex`}
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: undefined, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                >
                  {inspector}
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Mobile overlay */}
            <OverlayPane
              open={inspectorOpen}
              onClose={() => setInspectorOpen(false)}
              label="Inspector"
            >
              {inspector}
            </OverlayPane>
          </>
        )}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      {statusBar}
    </div>
  );
}
