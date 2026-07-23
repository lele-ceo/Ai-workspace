"use client";

// AgentInspector: right-pane panel showing agent identity, execution status,
// timeline events, and tool states for the active agent turn.

import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Pause,
  ChevronRight,
} from "lucide-react";
import type { AgentExecution, AgentStatus } from "@/types/agentic.types";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentStatus }) {
  const config: Record<AgentStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    idle: {
      icon: <Clock className="size-3" aria-hidden />,
      label: "Idle",
      cls: "text-white/40 bg-white/5 border-white/10",
    },
    running: {
      icon: <Loader2 className="size-3 animate-spin" aria-hidden />,
      label: "Running",
      cls: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
    },
    "waiting-approval": {
      icon: <Pause className="size-3" aria-hidden />,
      label: "Awaiting approval",
      cls: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    },
    blocked: {
      icon: <AlertCircle className="size-3" aria-hidden />,
      label: "Blocked",
      cls: "text-red-400 bg-red-500/10 border-red-500/20",
    },
    complete: {
      icon: <CheckCircle2 className="size-3" aria-hidden />,
      label: "Complete",
      cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
  };

  const { icon, label, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}
      role="status"
      aria-label={`Agent status: ${label}`}
    >
      {icon}
      {label}
    </span>
  );
}

// ── Timeline event ────────────────────────────────────────────────────────────

function TimelineEvent({
  label,
  time,
  active,
  complete,
}: {
  label: string;
  time?: number;
  active: boolean;
  complete: boolean;
}) {
  return (
    <motion.li
      layout
      className="flex items-start gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mt-0.5 flex flex-col items-center">
        <div
          className={`size-2 rounded-full transition-colors ${
            complete
              ? "bg-emerald-500"
              : active
                ? "bg-indigo-400 ring-2 ring-indigo-400/25"
                : "bg-white/15"
          }`}
          aria-hidden
        />
        <div className="mt-1 h-full w-px bg-white/8" aria-hidden />
      </div>
      <div className="pb-3">
        <p
          className={`text-[12px] ${active ? "text-white" : complete ? "text-white/50" : "text-white/25"}`}
        >
          {label}
        </p>
        {time && complete && (
          <p className="mt-0.5 text-[10px] tabular-nums text-white/25">
            {new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        )}
      </div>
    </motion.li>
  );
}

// ── AgentInspector ────────────────────────────────────────────────────────────

export interface AgentInspectorProps {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  execution: AgentExecution | null;
  estimatedCostUsd?: number;
}

export function AgentInspector({
  agentName,
  agentAvatar,
  agentColor,
  execution,
  estimatedCostUsd,
}: AgentInspectorProps) {
  return (
    <aside
      className="flex h-full flex-col gap-4 overflow-y-auto p-4"
      aria-label="Agent inspector"
    >
      {/* Identity */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: agentColor }}
          aria-hidden
        >
          {agentAvatar}
        </div>
        <div>
          <p className="text-[13px] font-medium text-white">{agentName}</p>
          <p className="text-[11px] text-white/40">Active agent</p>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        <motion.div
          key={execution?.status ?? "idle"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          <StatusBadge status={execution?.status ?? "idle"} />
        </motion.div>
      </AnimatePresence>

      {/* Cost estimate (mock only) */}
      {estimatedCostUsd !== undefined && (
        <div className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-white/30 mb-0.5">
            Est. turn cost (mock)
          </p>
          <p className="text-[13px] tabular-nums text-white/70">
            {estimatedCostUsd < 0.0001
              ? "<$0.0001"
              : `$${estimatedCostUsd.toFixed(5)}`}
          </p>
        </div>
      )}

      {/* Timeline */}
      {execution && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/30">
            <ChevronRight className="size-3" aria-hidden />
            Execution timeline
          </h2>
          <ul className="space-y-0" aria-label="Agent execution timeline">
            <AnimatePresence initial={false}>
              {execution.nodes.map((node) => (
                <TimelineEvent
                  key={node.id}
                  label={node.label}
                  time={node.createdAt}
                  active={node.status === "running"}
                  complete={node.status === "completed"}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!execution && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <Bot className="size-8 text-white/15" aria-hidden />
          <p className="text-[12px] text-white/30">
            Execution trace will appear here
          </p>
        </div>
      )}
    </aside>
  );
}
