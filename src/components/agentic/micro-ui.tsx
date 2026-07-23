"use client";

// AetherisUI micro-components: AIThinkingIndicator, NumberRoll, StreamdownMarkdown,
// and ExecutionChip. All motion-driven; respects prefers-reduced-motion via the
// existing framer-motion reducedMotion setting.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Markdown } from "@/components/chat/markdown";
import type { AgentTask } from "@/types/agentic.types";
import { getTaskUIConfig } from "@/lib/agentic/task-router";

// ── AIThinkingIndicator ───────────────────────────────────────────────────────
// Three-dot shimmer shown while the agent produces its first token.

export function AIThinkingIndicator() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-label="Agent is thinking"
      className="flex items-center gap-1 px-1 py-0.5"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-1.5 rounded-full bg-white/40"
          animate={
            reduceMotion
              ? {}
              : { opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }
          }
          transition={
            reduceMotion
              ? {}
              : {
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }
          }
        />
      ))}
    </div>
  );
}

// ── NumberRoll ────────────────────────────────────────────────────────────────
// Animated odometer-style numeric display for cost and token counters.

export interface NumberRollProps {
  value: number;
  decimals?: number;
  prefix?: string;
  className?: string;
}

export function NumberRoll({
  value,
  decimals = 4,
  prefix = "",
  className = "",
}: NumberRollProps) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(value);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    startRef.current = null;
    const duration = 400;

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const nextValue = fromRef.current + (value - fromRef.current) * eased;
      fromRef.current = nextValue;
      setDisplayed(nextValue);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion, value]);

  const visibleValue = reduceMotion ? value : displayed;

  return (
    <span
      className={`tabular-nums ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {prefix}
      {visibleValue.toFixed(decimals)}
    </span>
  );
}

// ── StreamdownMarkdown ────────────────────────────────────────────────────────
// Renders streaming markdown with a trailing cursor while streaming is active.

export interface StreamdownMarkdownProps {
  content: string;
  streaming?: boolean;
}

export function StreamdownMarkdown({ content, streaming }: StreamdownMarkdownProps) {
  return (
    <div className="relative">
      <Markdown content={content} />
      <AnimatePresence>
        {streaming && (
          <motion.span
            key="cursor"
            aria-hidden
            className="ml-0.5 inline-block h-[1em] w-0.5 align-text-bottom bg-white/60 rounded-sm"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ExecutionChip ─────────────────────────────────────────────────────────────
// Task-mode pill displayed in the composer and message headers.

export interface ExecutionChipProps {
  task: AgentTask;
  /** When true, show the chip in a smaller, inline variant. */
  compact?: boolean;
}

export function ExecutionChip({ task, compact = false }: ExecutionChipProps) {
  const config = getTaskUIConfig(task);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.colorClass} ${
        compact ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
      aria-label={`Task mode: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

// ── LoadingShimmer ────────────────────────────────────────────────────────────
// Generic skeleton for unloaded content blocks.

export function LoadingShimmer({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`space-y-2 ${className}`}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className="h-3 rounded bg-white/8"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
          animate={reduceMotion ? {} : { opacity: [0.4, 0.7, 0.4] }}
          transition={
            reduceMotion
              ? {}
              : { duration: 1.4, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }
          }
        />
      ))}
    </div>
  );
}
