"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialState,
  reducer,
  selectActiveThread,
  type AppState,
} from "@/store/app-store";
import type { Agent } from "@/types/agent.types";
import type { Model, ProviderTab } from "@/types/model.types";
import type { Thread } from "@/types/thread.types";
import type { Message } from "@/types/message.types";
import type { Attachment } from "@/types/attachment.types";
import { AGENTS, DEFAULT_AGENT_ID, getAgent } from "@/lib/mock/agents";
import { DEFAULT_MODEL_ID, MODELS, getModel, recommendedSubModel } from "@/lib/mock/models";
import { mockProvider } from "@/lib/ai/mock.provider";
import { anthropicProvider, BudgetExceededError } from "@/lib/ai/anthropic.provider";
import {
  DEFAULT_MODEL_ROUTING_PREFERENCES,
  recommendModel,
  type ModelRecommendation,
  type ModelRoutingPreferences,
  type RoutingPriority,
} from "@/lib/model-routing";
import {
  canChargeMockTurn,
  DEFAULT_MOCK_SPENDING,
  estimateMockTurnCost,
  getMockSpendStatus,
  type MockSpending,
  type MockSpendStatus,
} from "@/lib/mock-spending";
import { uid } from "@/lib/utils";

// Switch to the real Anthropic provider (via AgentGuard) by setting
// NEXT_PUBLIC_USE_REAL_AI=true in your .env.local. Without it the mock is used.
const USE_REAL_AI = process.env.NEXT_PUBLIC_USE_REAL_AI === "true";
const activeProvider = USE_REAL_AI ? anthropicProvider : mockProvider;
const MODEL_ROUTING_STORAGE_KEY = "ai-assistant:model-routing";
const MOCK_SPENDING_STORAGE_KEY = "ai-assistant:mock-spending";

function readModelRoutingPreferences(): ModelRoutingPreferences {
  if (typeof window === "undefined") return DEFAULT_MODEL_ROUTING_PREFERENCES;
  try {
    const saved = window.localStorage.getItem(MODEL_ROUTING_STORAGE_KEY);
    if (!saved) return DEFAULT_MODEL_ROUTING_PREFERENCES;
    const parsed = JSON.parse(saved) as Partial<ModelRoutingPreferences>;
    if (
      typeof parsed.smartRouting === "boolean" &&
      (parsed.priority === "speed" || parsed.priority === "balanced" || parsed.priority === "quality" || parsed.priority === "cost")
    ) {
      return { smartRouting: parsed.smartRouting, priority: parsed.priority };
    }
  } catch {
    // Local preferences are optional; malformed browser storage must not
    // prevent the workspace from rendering.
  }
  return DEFAULT_MODEL_ROUTING_PREFERENCES;
}

function persistModelRoutingPreferences(preferences: ModelRoutingPreferences) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MODEL_ROUTING_STORAGE_KEY, JSON.stringify(preferences));
  }
}

function readMockSpending(): MockSpending {
  if (typeof window === "undefined") return DEFAULT_MOCK_SPENDING;
  try {
    const saved = window.localStorage.getItem(MOCK_SPENDING_STORAGE_KEY);
    if (!saved) return DEFAULT_MOCK_SPENDING;
    const parsed = JSON.parse(saved) as Partial<MockSpending>;
    if (
      typeof parsed.monthlyCapUsd === "number" && parsed.monthlyCapUsd > 0 &&
      typeof parsed.spentUsd === "number" && parsed.spentUsd >= 0
    ) {
      return { monthlyCapUsd: parsed.monthlyCapUsd, spentUsd: parsed.spentUsd };
    }
  } catch {
    // Mock spending is optional local state; invalid storage falls back safely.
  }
  return DEFAULT_MOCK_SPENDING;
}

function persistMockSpending(spending: MockSpending) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MOCK_SPENDING_STORAGE_KEY, JSON.stringify(spending));
  }
}

export interface AppContextValue {
  // data
  models: Model[];
  agents: Agent[];
  threads: Thread[];
  activeThread: Thread;
  activeThreadId: string;
  activeModel: Model;
  activeAgent: Agent;
  /** Name of the active sub-model variant (defaults to the recommended pick). */
  activeSubModel: string;
  // ui state
  sidebarOpen: boolean;
  agentDrawerOpen: boolean;
  composerValue: string;
  /** Files staged in the composer (loaded client-side, not yet sent). */
  composerAttachments: Attachment[];
  searchQuery: string;
  isStreaming: boolean;
  /** True after AgentGuard refuses a request because its budget is exhausted. */
  budgetBlocked: boolean;
  modelRoutingPreferences: ModelRoutingPreferences;
  modelRecommendation: ModelRecommendation;
  mockSpending: MockSpending;
  mockSpendStatus: MockSpendStatus;
  isLiveMode: boolean;
  // ui actions
  setSidebarOpen: (open: boolean) => void;
  setAgentDrawerOpen: (open: boolean) => void;
  setComposerValue: (value: string) => void;
  /** Load picked files entirely client-side (object URLs, no upload) and stage them. */
  addAttachments: (files: FileList | File[]) => void;
  removeAttachment: (id: string) => void;
  setSearchQuery: (value: string) => void;
  setSmartRouting: (enabled: boolean) => void;
  setRoutingPriority: (priority: RoutingPriority) => void;
  setMockMonthlyCap: (capUsd: number) => void;
  resetMockSpending: () => void;
  // conversation actions
  selectThread: (id: string) => void;
  createThread: () => void;
  pinThread: (id: string) => void;
  selectModel: (id: ProviderTab, subModel?: string) => void;
  selectAgent: (id: string) => void;
  sendMessage: (text: string) => void;
  /** Edit a sent user message in place, then regenerate a fresh assistant reply. */
  editMessage: (messageId: string, content: string) => void;
  stopStreaming: () => void;
  /** Instantly swap an assistant message to its alternative predefined variant. */
  swapVariant: (messageId: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Mirror committed state for use inside async callbacks / event handlers
  // without stale closures. Synced after commit (never written during render).
  const stateRef = useRef<AppState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const abortRef = useRef<AbortController | null>(null);
  const [liveBudgetBlocked, setLiveBudgetBlocked] = useState(false);
  const [modelRoutingPreferences, setModelRoutingPreferences] = useState<ModelRoutingPreferences>(
    readModelRoutingPreferences,
  );
  const [mockSpending, setMockSpending] = useState<MockSpending>(readMockSpending);

  const activeThread = selectActiveThread(state);
  const activeModel = getModel(activeThread.modelId);
  const activeAgent = getAgent(activeThread.agentId);
  const activeSubModel = activeThread.subModel ?? recommendedSubModel(activeThread.modelId);
  const isStreaming = state.streamingMessageId !== null;
  const mockSpendStatus = getMockSpendStatus(mockSpending);
  const budgetBlocked = liveBudgetBlocked || (!USE_REAL_AI && mockSpendStatus.blocked);
  const modelRecommendation = useMemo(
    () => recommendModel(state.composerValue, MODELS, modelRoutingPreferences),
    [state.composerValue, modelRoutingPreferences],
  );

  const setSidebarOpen = useCallback((open: boolean) => dispatch({ type: "SET_SIDEBAR", open }), []);
  const setAgentDrawerOpen = useCallback((open: boolean) => dispatch({ type: "SET_AGENT_DRAWER", open }), []);
  const setComposerValue = useCallback((value: string) => dispatch({ type: "SET_COMPOSER_VALUE", value }), []);
  const setSearchQuery = useCallback((value: string) => dispatch({ type: "SET_SEARCH", value }), []);
  const setSmartRouting = useCallback((enabled: boolean) => {
    setModelRoutingPreferences((current) => {
      const next = { ...current, smartRouting: enabled };
      persistModelRoutingPreferences(next);
      return next;
    });
  }, []);
  const setRoutingPriority = useCallback((priority: RoutingPriority) => {
    setModelRoutingPreferences((current) => {
      const next = { ...current, priority };
      persistModelRoutingPreferences(next);
      return next;
    });
  }, []);
  const setMockMonthlyCap = useCallback((capUsd: number) => {
    if (!Number.isFinite(capUsd) || capUsd <= 0) return;
    setMockSpending((current) => {
      const next = { ...current, monthlyCapUsd: Math.round(capUsd * 100) / 100 };
      persistMockSpending(next);
      return next;
    });
  }, []);
  const resetMockSpending = useCallback(() => {
    setMockSpending((current) => {
      const next = { ...current, spentUsd: 0 };
      persistMockSpending(next);
      return next;
    });
  }, []);
  const selectThread = useCallback((id: string) => dispatch({ type: "SELECT_THREAD", id }), []);
  const pinThread = useCallback((id: string) => dispatch({ type: "PIN_THREAD", id }), []);

  const createThread = useCallback(() => {
    const thread: Thread = {
      id: uid("t"),
      title: "New Chat",
      agentId: DEFAULT_AGENT_ID,
      modelId: DEFAULT_MODEL_ID,
      pinned: false,
      messages: [],
      updatedAt: Date.now(),
    };
    dispatch({ type: "CREATE_THREAD", thread });
  }, []);

  // Files are turned into object URLs in the browser — no upload, no backend.
  const addAttachments = useCallback((files: FileList | File[]) => {
    const attachments: Attachment[] = Array.from(files).map((file) => ({
      id: uid("f"),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    if (attachments.length) dispatch({ type: "ADD_ATTACHMENTS", attachments });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    const target = stateRef.current.composerAttachments.find((a) => a.id === id);
    if (target) URL.revokeObjectURL(target.url);
    dispatch({ type: "REMOVE_ATTACHMENT", id });
  }, []);

  const selectModel = useCallback((id: ProviderTab, subModel?: string) => {
    dispatch({
      type: "SET_MODEL",
      threadId: stateRef.current.activeThreadId,
      modelId: id,
      subModel: subModel ?? recommendedSubModel(id),
    });
  }, []);

  const selectAgent = useCallback((id: string) => {
    const agent = getAgent(id);
    dispatch({
      type: "SET_AGENT",
      threadId: stateRef.current.activeThreadId,
      agentId: id,
      modelId: agent.defaultModel,
      subModel: recommendedSubModel(agent.defaultModel),
    });
  }, []);

  const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

  const swapVariant = useCallback((messageId: string) => {
    dispatch({ type: "SWAP_VARIANT", threadId: stateRef.current.activeThreadId, messageId });
  }, []);

  // Appends a streaming assistant message and consumes the mock provider's
  // chunk stream into it. Shared by both first-send and edit-and-regenerate.
  const streamTurn = useCallback((thread: Thread, history: Message[]) => {
    const threadId = thread.id;
    const assistantId = uid("m");
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      steps: [],
      modelId: thread.modelId,
      agentId: thread.agentId,
      streaming: true,
      createdAt: Date.now(),
    };

    dispatch({ type: "APPEND_MESSAGE", threadId, message: assistantMessage });
    dispatch({ type: "START_STREAM", messageId: assistantId });

    const controller = new AbortController();
    abortRef.current = controller;

    void (async () => {
      try {
        const stream = activeProvider.sendMessage(history, {
          modelId: thread.modelId,
          agentId: thread.agentId,
          signal: controller.signal,
        });
        for await (const chunk of stream) {
          if (chunk.type === "reasoning_step") {
            dispatch({
              type: "ADD_STEP",
              threadId,
              messageId: assistantId,
              step: { id: chunk.id, label: chunk.label, status: "running" },
            });
          } else if (chunk.type === "retry_variant") {
            dispatch({ type: "SET_RETRY_VARIANT", threadId, messageId: assistantId, content: chunk.content });
          } else {
            dispatch({ type: "APPEND_DELTA", threadId, messageId: assistantId, content: chunk.content });
          }
        }
      } catch (err) {
        // Budget exceeded: surface a human-readable message in the chat instead
        // of crashing. All other errors are re-thrown so they surface in dev tools.
        if (err instanceof BudgetExceededError) {
          const spent = err.spent_usd != null ? ` (spent: $${err.spent_usd.toFixed(2)})` : "";
          // This is a UX lock only. AgentGuard remains the authoritative,
          // server-side hard gate, so a refresh or a crafted request cannot
          // bypass the monthly budget.
          setLiveBudgetBlocked(true);
          dispatch({
            type: "APPEND_DELTA",
            threadId,
            messageId: assistantId,
            content: `⚠️ **Monthly AI budget reached${spent}.** Please contact the operator or wait until next month.`,
          });
        } else if ((err as { name?: string }).name !== "AbortError") {
          dispatch({
            type: "APPEND_DELTA",
            threadId,
            messageId: assistantId,
            content: "⚠️ **Something went wrong.** Please try again.",
          });
          console.error("[AnthropicProvider]", err);
        }
      } finally {
        dispatch({ type: "END_STREAM", threadId, messageId: assistantId });
        if (abortRef.current === controller) abortRef.current = null;
      }
    })();
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    const attachments = stateRef.current.composerAttachments;
    // Send when there is text OR at least one attached file (ChatGPT-style).
    if (
      (!trimmed && attachments.length === 0) ||
      stateRef.current.streamingMessageId ||
      budgetBlocked
    ) return;

    const thread = selectActiveThread(stateRef.current);
    if (!USE_REAL_AI) {
      const estimatedCost = estimateMockTurnCost(getModel(thread.modelId));
      if (!canChargeMockTurn(mockSpending, estimatedCost)) return;
      setMockSpending((current) => {
        const next = { ...current, spentUsd: Number((current.spentUsd + estimatedCost).toFixed(2)) };
        persistMockSpending(next);
        return next;
      });
    }
    const userMessage: Message = {
      id: uid("m"),
      role: "user",
      content: trimmed,
      ...(attachments.length ? { attachments } : {}),
      createdAt: Date.now(),
    };

    dispatch({ type: "APPEND_MESSAGE", threadId: thread.id, message: userMessage });
    dispatch({ type: "SET_COMPOSER_VALUE", value: "" });
    dispatch({ type: "CLEAR_ATTACHMENTS" });
    streamTurn(thread, [...thread.messages, userMessage]);
  }, [budgetBlocked, mockSpending, streamTurn]);

  // Edit a previously-sent user message in place, then regenerate a reply. The
  // new answer is appended (the app never branches history — see docs/handoff.md).
  const editMessage = useCallback((messageId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed || stateRef.current.streamingMessageId) return;

    const thread = selectActiveThread(stateRef.current);
    const index = thread.messages.findIndex((m) => m.id === messageId);
    if (index === -1 || thread.messages[index].role !== "user") return;

    dispatch({ type: "EDIT_MESSAGE", threadId: thread.id, messageId, content: trimmed });
    const edited: Message = { ...thread.messages[index], content: trimmed };
    const history = [...thread.messages.slice(0, index), edited];
    streamTurn(thread, history);
  }, [streamTurn]);

  const value = useMemo<AppContextValue>(
    () => ({
      models: MODELS,
      agents: AGENTS,
      threads: state.threads,
      activeThread,
      activeThreadId: state.activeThreadId,
      activeModel,
      activeAgent,
      activeSubModel,
      sidebarOpen: state.sidebarOpen,
      agentDrawerOpen: state.agentDrawerOpen,
      composerValue: state.composerValue,
      composerAttachments: state.composerAttachments,
      searchQuery: state.searchQuery,
      isStreaming,
      budgetBlocked,
      modelRoutingPreferences,
      modelRecommendation,
      mockSpending,
      mockSpendStatus,
      isLiveMode: USE_REAL_AI,
      setSidebarOpen,
      setAgentDrawerOpen,
      setComposerValue,
      addAttachments,
      removeAttachment,
      setSearchQuery,
      setSmartRouting,
      setRoutingPriority,
      setMockMonthlyCap,
      resetMockSpending,
      selectThread,
      createThread,
      pinThread,
      selectModel,
      selectAgent,
      sendMessage,
      editMessage,
      stopStreaming,
      swapVariant,
    }),
    [
      state.threads,
      state.activeThreadId,
      state.sidebarOpen,
      state.agentDrawerOpen,
      state.composerValue,
      state.composerAttachments,
      state.searchQuery,
      activeThread,
      activeModel,
      activeAgent,
      activeSubModel,
      isStreaming,
      budgetBlocked,
      modelRoutingPreferences,
      modelRecommendation,
      mockSpending,
      mockSpendStatus,
      setSidebarOpen,
      setAgentDrawerOpen,
      setComposerValue,
      addAttachments,
      removeAttachment,
      setSearchQuery,
      setSmartRouting,
      setRoutingPriority,
      setMockMonthlyCap,
      resetMockSpending,
      selectThread,
      createThread,
      pinThread,
      selectModel,
      selectAgent,
      sendMessage,
      editMessage,
      stopStreaming,
      swapVariant,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
