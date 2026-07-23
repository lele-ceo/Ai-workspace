"use client";

// Bottom-anchored status bar: budget health, mock latency, and active MCP
// connection state. Live mode delegates enforcement to AgentGuard; this bar
// shows a clearly-labelled simulation in mock mode.

import { motion } from "framer-motion";
import { Activity, Cpu, ShieldAlert, Wifi, WifiOff, AlertTriangle } from "lucide-react";

export interface BudgetStatusBarProps {
  /** USD spent this session (mock-only). */
  spentUsd: number;
  /** USD cap before the warning state activates. */
  warnUsd: number;
  /** USD cap before the hard block activates. */
  capUsd: number;
  /** Whether we are in live (AgentGuard) mode or mock mode. */
  isLive: boolean;
  /** Simulated latency in ms. */
  latencyMs?: number;
  /** Whether the simulated MCP server is connected. */
  mcpConnected?: boolean;
}

function formatUsd(v: number): string {
  return v < 0.01 ? `<$0.01` : `$${v.toFixed(3)}`;
}

export function BudgetStatusBar({
  spentUsd,
  warnUsd,
  capUsd,
  isLive,
  latencyMs,
  mcpConnected = false,
}: BudgetStatusBarProps) {
  const pct = capUsd > 0 ? Math.min(1, spentUsd / capUsd) : 0;
  const isWarning = !isLive && spentUsd >= warnUsd;
  const isBlocked = !isLive && spentUsd >= capUsd;

  const barColor = isBlocked
    ? "bg-red-500"
    : isWarning
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <footer
      role="status"
      aria-label="Workspace status"
      className="flex h-8 items-center gap-4 border-t border-white/8 bg-black/40 px-4 backdrop-blur-sm"
    >
      {/* Budget indicator */}
      <div className="flex items-center gap-2">
        {isBlocked ? (
          <ShieldAlert className="size-3.5 text-red-400" aria-hidden />
        ) : isWarning ? (
          <AlertTriangle className="size-3.5 text-amber-400" aria-hidden />
        ) : (
          <Activity className="size-3.5 text-emerald-400" aria-hidden />
        )}

        {isLive ? (
          <span className="text-[11px] text-white/40">
            Live — budget via AgentGuard
          </span>
        ) : (
          <div className="flex items-center gap-2" aria-label={`Mock spend: ${formatUsd(spentUsd)} of ${formatUsd(capUsd)}`}>
            <span
              className={`text-[11px] tabular-nums ${isBlocked ? "text-red-400" : isWarning ? "text-amber-400" : "text-white/50"}`}
            >
              {formatUsd(spentUsd)}
            </span>
            {/* Progress bar */}
            <div
              className="relative h-1 w-16 overflow-hidden rounded-full bg-white/10"
              aria-hidden
            >
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                initial={false}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <span className="text-[11px] text-white/30">{formatUsd(capUsd)}</span>
            <span className="text-[10px] text-white/20">(mock)</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-3 w-px bg-white/10" aria-hidden />

      {/* Model latency */}
      {latencyMs !== undefined && (
        <div className="flex items-center gap-1.5" aria-label={`Latency: ${latencyMs}ms`}>
          <Cpu className="size-3.5 text-white/30" aria-hidden />
          <span className="text-[11px] tabular-nums text-white/40">
            {latencyMs}ms
          </span>
        </div>
      )}

      {/* MCP server connection */}
      <div
        className="ml-auto flex items-center gap-1.5"
        aria-label={mcpConnected ? "MCP server connected" : "MCP server offline"}
      >
        {mcpConnected ? (
          <Wifi className="size-3.5 text-sky-400" aria-hidden />
        ) : (
          <WifiOff className="size-3.5 text-white/20" aria-hidden />
        )}
        <span className={`text-[11px] ${mcpConnected ? "text-sky-400" : "text-white/25"}`}>
          MCP
        </span>
      </div>
    </footer>
  );
}
