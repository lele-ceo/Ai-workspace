import type { Model, ProviderTab } from "@/types/model.types";

export type TaskCategory =
  | "coding"
  | "writing"
  | "research"
  | "analysis"
  | "math"
  | "vision"
  | "translation"
  | "summarization"
  | "brainstorming"
  | "general";

export type RoutingPriority = "speed" | "balanced" | "quality" | "cost";

export interface ModelRoutingPreferences {
  smartRouting: boolean;
  priority: RoutingPriority;
}

export interface ModelRecommendation {
  modelId: ProviderTab;
  task: TaskCategory;
  confidence: number;
  reason: string;
}

const TASK_PATTERNS: Array<{ task: TaskCategory; pattern: RegExp }> = [
  { task: "coding", pattern: /\b(code|coding|bug|debug|typescript|javascript|react|api|database|sql|function|refactor)\b/i },
  { task: "research", pattern: /\b(research|search|sources?|citations?|compare|latest|find|investigate)\b/i },
  { task: "summarization", pattern: /\b(summarize|summary|tl;dr|brief|condense)\b/i },
  { task: "analysis", pattern: /\b(analy[sz]e|analysis|report|data|trend|metrics?|strategy)\b/i },
  { task: "math", pattern: /\b(math|equation|calculate|probability|algebra|statistics?|formula)\b/i },
  { task: "vision", pattern: /\b(image|photo|screenshot|visual|diagram|video|pdf)\b/i },
  { task: "translation", pattern: /\b(translat|language|italian|english|french|german|spanish)\b/i },
  { task: "writing", pattern: /\b(write|rewrite|email|copy|article|tone|grammar)\b/i },
  { task: "brainstorming", pattern: /\b(brainstorm|ideas?|name|creative|concept)\b/i },
];

const TASK_WEIGHTS: Record<TaskCategory, Partial<Record<ProviderTab, number>>> = {
  coding: { claude: 50, chatgpt: 45, gemini: 30, base: 20 },
  writing: { claude: 48, chatgpt: 42, base: 28, gemini: 25 },
  research: { perplexity: 52, gemini: 42, claude: 34, chatgpt: 32 },
  analysis: { claude: 46, chatgpt: 43, gemini: 40, base: 26 },
  math: { chatgpt: 48, claude: 44, gemini: 38, base: 24 },
  vision: { gemini: 50, chatgpt: 45, claude: 42 },
  translation: { chatgpt: 42, gemini: 40, claude: 38, base: 30 },
  summarization: { gemini: 43, claude: 42, chatgpt: 38, base: 28 },
  brainstorming: { claude: 44, chatgpt: 42, base: 34, gemini: 30 },
  general: { base: 36, claude: 35, chatgpt: 34, gemini: 30, perplexity: 22 },
};

export const DEFAULT_MODEL_ROUTING_PREFERENCES: ModelRoutingPreferences = {
  smartRouting: true,
  priority: "balanced",
};

export function detectTaskCategory(input: string): TaskCategory {
  return TASK_PATTERNS.find(({ pattern }) => pattern.test(input))?.task ?? "general";
}

export function recommendModel(
  input: string,
  models: Model[],
  preferences: ModelRoutingPreferences,
): ModelRecommendation {
  const task = detectTaskCategory(input);
  const weights = TASK_WEIGHTS[task];
  const sorted = [...models]
    .filter((model) => model.availability !== "offline")
    .map((model) => ({ model, score: scoreModel(model, weights, preferences.priority) }))
    .sort((a, b) => b.score - a.score);
  const winner = sorted[0] ?? { model: models[0], score: 0 };
  const runnerUp = sorted[1]?.score ?? 0;
  const confidence = Math.max(55, Math.min(99, 65 + winner.score - runnerUp));

  return {
    modelId: winner.model.id,
    task,
    confidence,
    reason: `Recommended for ${task} tasks`,
  };
}

function scoreModel(
  model: Model,
  weights: Partial<Record<ProviderTab, number>>,
  priority: RoutingPriority,
): number {
  const taskScore = weights[model.id] ?? 0;
  const priorityScore =
    priority === "speed"
      ? model.capabilities.includes("fast") ? 18 : 0
      : priority === "quality"
        ? model.capabilities.includes("deep") || model.capabilities.includes("reasoning") ? 14 : 0
        : priority === "cost"
          ? model.priceMtok === 0 ? 25 : Math.max(0, 18 - model.priceMtok)
          : model.capabilities.includes("balanced") || model.capabilities.includes("reasoning") ? 8 : 0;
  const availabilityScore = model.availability === "available" ? 6 : 0;
  return taskScore + priorityScore + availabilityScore;
}
