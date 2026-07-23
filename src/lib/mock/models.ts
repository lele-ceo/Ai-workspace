import type { Model, ProviderTab } from "@/types/model.types";

// One model per provider tab, so the top provider bar and the composer's
// model selector are the same set — selecting in one place updates the other.
export const MODELS: Model[] = [
  {
    id: "base",
    name: "Base",
    provider: "assistant-ui",
    description: "Neutral, general-purpose",
    placeholder: "Send a message... (@ to mention, / for commands)",
    capabilities: ["reasoning", "balanced"],
    contextWindow: 128_000,
    priceMtok: 0,
    availability: "available",
    accentColor: "#8b8b8b",
    subModels: [
      { name: "Base Fast", bestFor: "Quick answers", recommended: true },
      { name: "Base Pro", bestFor: "Complex reasoning" },
    ],
    background:
      "radial-gradient(120% 85% at 50% -20%, #33343a 0%, #17181c 42%, #0a0a0a 72%)",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    provider: "OpenAI",
    description: "Balanced, structured",
    placeholder: "Ask ChatGPT anything...",
    capabilities: ["vision", "reasoning", "balanced"],
    contextWindow: 256_000,
    priceMtok: 8,
    availability: "available",
    accentColor: "#10a37f",
    subModels: [
      { name: "GPT-5.4 Nano", bestFor: "Fast chat", recommended: true },
      { name: "GPT-5 Enterprise", bestFor: "Structured analysis" },
      { name: "GPT-5 Vision", bestFor: "Image understanding" },
    ],
    background:
      "radial-gradient(120% 85% at 50% -20%, rgba(16,163,127,0.60) 0%, rgba(16,163,127,0.16) 40%, #0a0a0a 72%)",
  },
  {
    id: "claude",
    name: "Claude",
    provider: "Anthropic",
    description: "Empathetic, thorough",
    placeholder: "Message Claude...",
    capabilities: ["vision", "reasoning", "deep"],
    contextWindow: 200_000,
    priceMtok: 9,
    availability: "available",
    accentColor: "#d97757",
    subModels: [
      { name: "Claude Haiku", bestFor: "Low-latency tasks" },
      { name: "Claude Sonnet", bestFor: "Balanced work", recommended: true },
      { name: "Claude Opus", bestFor: "Deep reasoning & writing" },
    ],
    background:
      "radial-gradient(120% 85% at 50% -20%, rgba(217,119,87,0.62) 0%, rgba(217,119,87,0.18) 40%, #0a0a0a 72%)",
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "Google",
    description: "Multimodal, fast",
    placeholder: "Ask Gemini...",
    capabilities: ["vision", "reasoning", "fast"],
    contextWindow: 1_000_000,
    priceMtok: 4,
    availability: "available",
    accentColor: "#4285f4",
    subModels: [
      { name: "Gemini Flash", bestFor: "Fast multimodal", recommended: true },
      { name: "Gemini Pro", bestFor: "Long-context work" },
      { name: "Gemini Ultra", bestFor: "Advanced reasoning" },
    ],
    background:
      "radial-gradient(120% 85% at 50% -20%, rgba(66,133,244,0.62) 0%, rgba(139,92,246,0.38) 32%, #0a0a0a 72%)",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    provider: "Perplexity AI",
    description: "Research-heavy, cited",
    placeholder: "Search the web...",
    capabilities: ["balanced"],
    contextWindow: 64_000,
    priceMtok: 3,
    availability: "limited",
    accentColor: "#20b8cd",
    subModels: [
      { name: "Sonar", bestFor: "Web search", recommended: true },
      { name: "Sonar Pro", bestFor: "Deep research" },
      { name: "Sonar Reasoning", bestFor: "Cited analysis" },
    ],
    background:
      "radial-gradient(120% 85% at 50% -20%, rgba(32,184,205,0.60) 0%, rgba(32,184,205,0.16) 40%, #0a0a0a 72%)",
  },
];

export const DEFAULT_MODEL_ID: ProviderTab = "base";

export const getModel = (id: ProviderTab): Model =>
  MODELS.find((m) => m.id === id) ?? MODELS[0];

/** Default sub-model name for a model: its recommended pick, else the first. */
export const recommendedSubModel = (id: ProviderTab): string => {
  const model = getModel(id);
  return (model.subModels.find((s) => s.recommended) ?? model.subModels[0]).name;
};
