"use client";

// Drives the mock agent execution tick loop, advancing ReasoningNodes and
// ToolExecutions through their lifecycle states over time.
// In live mode, this hook would consume server-sent events instead of ticks.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentExecution } from "@/types/agentic.types";
import type { AgentTask } from "@/lib/agentic/task-router";
import {
  advanceNodes,
  advanceTools,
  buildMockExecution,
} from "@/lib/agentic/execution-simulator";

const NODE_TICK_MS = 900;

export interface UseAgentExecutionReturn {
  execution: AgentExecution | null;
  approveToolExecution: (toolId: string) => void;
}

export function useAgentExecution(
  agentId: string,
  threadId: string,
  task: AgentTask,
  active: boolean,
): UseAgentExecutionReturn {
  const [execution, setExecution] = useState<AgentExecution | null>(null);
  const executionRef = useRef<AgentExecution | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<() => void>(() => undefined);
  const nodeIdxRef = useRef(0);
  const toolIdxRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const current = executionRef.current;
    if (!current || current.status === "waiting-approval" || current.status === "complete") return;

    const nodes = advanceNodes(current.nodes, nodeIdxRef.current);
    const tools = advanceTools(current.tools, toolIdxRef.current);
    const pendingApproval = tools.find((tool) => tool.status === "running" && tool.requiresApproval);

    if (pendingApproval) {
      const next = { ...current, nodes, tools, status: "waiting-approval" as const };
      executionRef.current = next;
      setExecution(next);
      return;
    }

    nodeIdxRef.current += 1;
    if (nodeIdxRef.current % 2 === 0) toolIdxRef.current += 1;
    const allDone = nodeIdxRef.current > current.nodes.length;
    const next: AgentExecution = {
      ...current,
      nodes,
      tools,
      status: allDone ? "complete" : "running",
      completedAt: allDone ? Date.now() : undefined,
    };
    executionRef.current = next;
    setExecution(next);

    if (!allDone) timerRef.current = setTimeout(() => tickRef.current(), NODE_TICK_MS);
  }, []);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const start = useCallback(() => {
    clearTimer();
    nodeIdxRef.current = 0;
    toolIdxRef.current = 0;
    const exec = buildMockExecution(agentId, threadId, task);
    executionRef.current = exec;
    setExecution(exec);
    timerRef.current = setTimeout(() => tickRef.current(), NODE_TICK_MS);
  }, [agentId, clearTimer, task, threadId]);

  const approveToolExecution = useCallback((toolId: string) => {
    const current = executionRef.current;
    if (!current) return;
    const tools = current.tools.map((t) =>
        t.id === toolId ? { ...t, status: "approved" as const } : t,
      );
    const next: AgentExecution = { ...current, tools, status: "running" };
    executionRef.current = next;
    setExecution(next);
    // Resume ticking after approval
    clearTimer();
    timerRef.current = setTimeout(() => tickRef.current(), NODE_TICK_MS);
  }, [clearTimer]);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      if (active) {
        start();
        return;
      }
      clearTimer();
      executionRef.current = null;
      setExecution(null);
    }, 0);

    return () => {
      clearTimeout(startTimer);
      clearTimer();
    };
  }, [active, start, clearTimer]);

  return { execution, approveToolExecution };
}
