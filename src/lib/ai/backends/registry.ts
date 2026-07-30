import type { ProviderTab } from "@/types/model.types";
import type { BackendProvider } from "../backend.interface";
import { anthropicBackend } from "./anthropic.backend";
import { chatgptBackend, perplexityBackend } from "./openai.backend";
import { geminiBackend } from "./gemini.backend";

const REGISTRY: Partial<Record<ProviderTab, BackendProvider>> = {
  base: anthropicBackend,      // neutral "base" tab routes to Anthropic by default
  claude: anthropicBackend,
  chatgpt: chatgptBackend,
  gemini: geminiBackend,
  perplexity: perplexityBackend,
};

export function getBackend(provider: ProviderTab): BackendProvider | null {
  return REGISTRY[provider] ?? null;
}
