"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle, ShieldCheck } from "lucide-react";
import type { ReasoningNode, ToolExecution } from "@/types/agentic.types";

// ── Node status icon ──────────────────────────────────────────────────────────

function NodeIcon({ status }: { status: ReasoningNode["status"] }) {
  if (status === "completed")
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" aria-hidden />;
  if (status === "running")
    return (
      <Loader2
        className="size-3.5 shrink-0 animate-spin text-indigo-400"
        aria-label="Running"
      />
    );
  if (status === "failed")
    return <XCircle className="size-3.5 shrink-0 text-red-400" aria-hidden />;
  return <Circle className="size-3.5 shrink-0 text-white/20" aria-hidden />;
}

// ── Single reasoning node row ─────────────────────────────────────────────────

function ReasoningNodeRow({ node }: { node: ReasoningNode }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2.5"
      aria-busy={node.status === "running"}
    >
      <NodeIcon status={node.status} />
      <span
        className={
          node.status === "completed"
            ? "text-white/70 text-xs"
            : node.status === "running"
              ? "text-white text-xs font-medium"
              : "text-white/30 text-xs"
        }
      >
        {node.label}
      </span>
      {node.confidence !== undefined && node.status === "completed" && (
        <span className="ml-auto text-[10px] tabular-nums text-white/30">
          {Math.round(node.confidence * 100)}%
        </span>
      )}
    </motion.li>
  );
}

// ── Tool execution chip ───────────────────────────────────────────────────────

function ToolChip({
  tool,
  onApprove,
}: {
  tool: ToolExecution;
  onApprove?: (id: string) => void;
}) {
  const colorMap: Record<ToolExecution["status"], string> = {
    idle: "border-white/10 text-white/30",
    running: "border-indigo-500/40 text-indigo-300 bg-indigo-500/5",
    completed: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    failed: "border-red-500/30 text-red-400 bg-red-500/5",
    approved: "border-sky-500/30 text-sky-400 bg-sky-500/5",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${colorMap[tool.status]}`}
    >
      {tool.status === "running" && (
        <Loader2 className="size-3 animate-spin" aria-hidden />
      )}
      {tool.status === "approved" && <ShieldCheck className="size-3" aria-hidden />}
      <span className="font-mono">{tool.tool}</span>
      {tool.requiresApproval && tool.status === "running" && onApprove && (
        <button
          type="button"
          onClick={() => onApprove(tool.id)}
          className="ml-1 rounded bg-sky-500/20 px-1.5 py-px text-[10px] text-sky-300 hover:bg-sky-500/30 focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          Approve
        </button>
      )}
    </motion.div>
  );
}

// ── ReasoningViewer ───────────────────────────────────────────────────────────

export interface ReasoningViewerProps {
  nodes: ReasoningNode[];
  tools: ToolExecution[];
  onApproveToolExecution?: (toolId: string) => void;
}

export function ReasoningViewer({
  nodes,
  tools,
  onApproveToolExecution,
}: ReasoningViewerProps) {
  if (nodes.length === 0) return null;

  return (
    <section
      aria-label="Agent reasoning trace"
      className="rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 space-y-3"
    >
      {/* Nodes */}
      <ol className="space-y-2" aria-label="Execution steps">
        <AnimatePresence initial={false}>
          {nodes.map((node) => (
            <ReasoningNodeRow key={node.id} node={node} />
          ))}
        </AnimatePresence>
      </ol>

      {/* Tools */}
      {tools.length > 0 && (
        <div
          role="list"
          aria-label="Active tools"
          className="flex flex-wrap gap-1.5 pt-1 border-t border-white/5"
        >
          {tools.map((tool) => (
            <div role="listitem" key={tool.id}>
              <ToolChip tool={tool} onApprove={onApproveToolExecution} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
