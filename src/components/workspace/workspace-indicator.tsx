"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MonitorSmartphone,
  Circle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Clock,
} from "lucide-react";
import type { WorkspaceConnection } from "@/types/vscode-session.types";

interface WorkspaceIndicatorProps {
  /** Poll interval in ms. Default: 30 000 (30 s). */
  pollIntervalMs?: number;
}

interface ApiResponse {
  connections: WorkspaceConnection[];
}

function formatRelative(isoString: string | null): string {
  if (!isoString) return "never";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

function ConnectionRow({ c }: { c: WorkspaceConnection }) {
  return (
    <div className="flex items-start gap-2 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <span
        className={`mt-1 flex-none w-2 h-2 rounded-full ${
          c.online ? "bg-emerald-400" : "bg-zinc-500"
        }`}
        aria-label={c.online ? "online" : "offline"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100 truncate">
          {c.workspaceName ?? c.deviceId}
        </p>
        <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 flex-none" />
          {c.online ? "active" : formatRelative(c.lastSeenAt)}
          {c.contextUpdatedAt && (
            <>
              <span className="mx-1">·</span>
              <FolderOpen className="w-3 h-3 flex-none" />
              synced {formatRelative(c.contextUpdatedAt)}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function WorkspaceIndicator({
  pollIntervalMs = 30_000,
}: WorkspaceIndicatorProps) {
  const [connections, setConnections] = useState<WorkspaceConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/vscode/workspace", { credentials: "same-origin" });
        if (!active) return;
        if (!res.ok) {
          if (res.status === 401) {
            setConnections([]);
            setError(false);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!active) return;
        setConnections(data.connections ?? []);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void poll();
    const id = setInterval(() => void poll(), pollIntervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  // Hide completely if there are no connections and no error
  if (!loading && !error && connections.length === 0) return null;

  const onlineCount = connections.filter((c) => c.online).length;
  const totalCount  = connections.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label="VS Code workspace connections"
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          transition-colors focus-visible:outline-2 focus-visible:outline-offset-2
          ${
            error
              ? "bg-red-900/40 text-red-400 focus-visible:outline-red-400"
              : onlineCount > 0
              ? "bg-emerald-900/40 text-emerald-300 focus-visible:outline-emerald-400"
              : "bg-zinc-800 text-zinc-400 focus-visible:outline-zinc-400"
          }
        `}
      >
        {loading ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : error ? (
          <Circle className="w-3 h-3 text-red-400" />
        ) : (
          <MonitorSmartphone className="w-3.5 h-3.5" />
        )}

        <span>
          {loading
            ? "…"
            : error
            ? "VS Code error"
            : `${onlineCount}/${totalCount} VS Code`}
        </span>

        {!loading && !error && totalCount > 0 && (
          expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        )}
      </button>

      <AnimatePresence>
        {expanded && !loading && !error && totalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="
              absolute right-0 top-full mt-1 z-50
              w-72 rounded-xl border border-white/10
              bg-zinc-900/95 backdrop-blur-sm shadow-xl
              overflow-hidden
            "
          >
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                VS Code Workspaces
              </p>
            </div>
            <div className="divide-y divide-white/5 pb-1">
              {connections.map((c) => (
                <ConnectionRow key={c.sessionId} c={c} />
              ))}
            </div>
            <div className="px-3 py-2 border-t border-white/5">
              <p className="text-xs text-zinc-600">
                Read-only · context available in chat
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
