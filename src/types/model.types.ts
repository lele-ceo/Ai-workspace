// Model + provider-tab domain types. A "provider tab" (the top bar) and a
// "model" are the same selectable entity here — one model per provider — so
// the top bar and the composer's model selector stay in sync by construction.

export type ProviderTab =
  | "base"
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity";

export type ModelCapability = "vision" | "reasoning" | "fast" | "balanced" | "deep";

export type ModelAvailability = "available" | "limited" | "offline";

/** A model variant, with the task it is the best pick for. */
export interface SubModel {
  name: string;
  /** Short task label this variant is optimal for, e.g. "Deep research". */
  bestFor: string;
  /** Marks the default/optimal pick surfaced in the switcher. */
  recommended?: boolean;
}

export interface Model {
  /** Stable id, also used as the provider-tab id. */
  id: ProviderTab;
  /** Short label shown in the top bar and selector chip. */
  name: string;
  /** Vendor label, e.g. "OpenAI". */
  provider: string;
  /** One-line personality/behaviour summary. */
  description: string;
  /** Composer placeholder shown while this model is active. */
  placeholder: string;
  capabilities: ModelCapability[];
  contextWindow: number;
  priceMtok: number;
  availability: ModelAvailability;
  /** Hex accent that themes the composer + active tab for this model. */
  accentColor: string;
  /** Variants shown in the topbar switcher, each with its best task. */
  subModels: SubModel[];
  /** Brand-tinted CSS background applied (cross-faded) when this model is active. */
  background: string;
}
