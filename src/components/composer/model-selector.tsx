"use client";

import { motion, type Variants } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import { useApp } from "@/hooks/use-app";
import { useDropdown } from "@/hooks/use-dropdown";
import { popupListVariants, usePopupRowVariants } from "@/components/agent-list";
import type { Model, ModelAvailability } from "@/types/model.types";
import type { RoutingPriority } from "@/lib/model-routing";
import { cn } from "@/lib/utils";

const DOT: Record<ModelAvailability, string> = {
  available: "bg-emerald-500",
  limited: "bg-amber-500",
  offline: "bg-red-500",
};

// Compact model switch. Kept in sync with the top provider bar — both call
// selectModel, so they can never disagree. Rendered in the composer on desktop
// and relocated into the top bar on narrow viewports (ChatLayout); `placement`
// only flips which way the *same* popup opens ("up" from the composer, "down"
// from the top bar) — the trigger, list, and animation are otherwise identical.
export function ModelSelector({ placement = "up" }: { placement?: "up" | "down" }) {
  const {
    models,
    activeModel,
    activeSubModel,
    selectModel,
    modelRecommendation,
    modelRoutingPreferences,
    setSmartRouting,
    setRoutingPriority,
    mockSpending,
    mockSpendStatus,
    isLiveMode,
    setMockMonthlyCap,
    resetMockSpending,
  } = useApp();
  const { open, toggle, close, ref } = useDropdown();
  const rowVariants = usePopupRowVariants();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span className={cn("size-1.5 rounded-full", DOT[activeModel.availability])} />
        {activeModel.name}
        <span className="text-[var(--text-muted)]">· {activeSubModel}</span>
        <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <motion.ul
          role="listbox"
          variants={popupListVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "absolute left-0 z-30 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1 shadow-xl",
            placement === "down" ? "top-full mt-2" : "bottom-full mb-2",
          )}
        >
          {models.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              active={model.id === activeModel.id}
              variants={rowVariants}
              onSelect={() => {
                selectModel(model.id);
                close();
              }}
            />
          ))}
          <ModelRoutingControls
            activeModelId={activeModel.id}
            recommendedModelId={modelRecommendation.modelId}
            recommendation={modelRecommendation}
            smartRouting={modelRoutingPreferences.smartRouting}
            priority={modelRoutingPreferences.priority}
            onApplyRecommendation={() => {
              selectModel(modelRecommendation.modelId);
              close();
            }}
            onSmartRoutingChange={setSmartRouting}
            onPriorityChange={setRoutingPriority}
            mockSpending={mockSpending}
            mockSpendStatus={mockSpendStatus}
            isLiveMode={isLiveMode}
            onMonthlyCapChange={setMockMonthlyCap}
            onResetMockSpending={resetMockSpending}
          />
        </motion.ul>
      )}
    </div>
  );
}

function ModelRoutingControls({
  activeModelId,
  recommendedModelId,
  recommendation,
  smartRouting,
  priority,
  onApplyRecommendation,
  onSmartRoutingChange,
  onPriorityChange,
  mockSpending,
  mockSpendStatus,
  isLiveMode,
  onMonthlyCapChange,
  onResetMockSpending,
}: {
  activeModelId: Model["id"];
  recommendedModelId: Model["id"];
  recommendation: { reason: string; confidence: number };
  smartRouting: boolean;
  priority: RoutingPriority;
  onApplyRecommendation: () => void;
  onSmartRoutingChange: (enabled: boolean) => void;
  onPriorityChange: (priority: RoutingPriority) => void;
  mockSpending: { monthlyCapUsd: number; spentUsd: number };
  mockSpendStatus: { percentUsed: number };
  isLiveMode: boolean;
  onMonthlyCapChange: (capUsd: number) => void;
  onResetMockSpending: () => void;
}) {
  const isRecommendedActive = activeModelId === recommendedModelId;
  return (
    <li className="mt-1 border-t border-[var(--border)] px-2.5 pb-2 pt-2">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-[var(--text-primary)]">
            {recommendation.reason} · {recommendation.confidence}% confidence
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            This is a local recommendation and does not change live provider availability.
          </p>
        </div>
        {!isRecommendedActive && smartRouting && (
          <button
            type="button"
            onClick={onApplyRecommendation}
            className="shrink-0 rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Apply
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={smartRouting}
            onChange={(event) => onSmartRoutingChange(event.target.checked)}
            className="accent-[var(--accent)]"
          />
          Smart routing
        </label>
        <select
          aria-label="Routing priority"
          value={priority}
          onChange={(event) => onPriorityChange(event.target.value as RoutingPriority)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="speed">Speed</option>
          <option value="balanced">Balanced</option>
          <option value="quality">Quality</option>
          <option value="cost">Cost</option>
        </select>
      </div>
      {!isLiveMode && (
        <div className="mt-2 border-t border-[var(--border)] pt-2">
          <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
            <span>Mock spend ${mockSpending.spentUsd.toFixed(2)} / ${mockSpending.monthlyCapUsd.toFixed(2)}</span>
            <button
              type="button"
              onClick={onResetMockSpending}
              className="text-[var(--accent)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              Reset
            </button>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${mockSpendStatus.percentUsed}%` }}
            />
          </div>
          <label className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--text-secondary)]">
            Monthly mock cap
            <input
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={mockSpending.monthlyCapUsd}
              onBlur={(event) => onMonthlyCapChange(Number(event.target.value))}
              className="w-20 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-1.5 py-1 text-right text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </label>
          <p className="mt-1 text-[9px] text-[var(--text-muted)]">Local simulation only — not real provider billing.</p>
        </div>
      )}
    </li>
  );
}

function ModelRow({
  model,
  active,
  variants,
  onSelect,
}: {
  model: Model;
  active: boolean;
  variants: Variants;
  onSelect: () => void;
}) {
  return (
    <motion.li variants={variants} style={{ willChange: "transform, opacity" }}>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onSelect}
        className={cn(
          "w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
          active && "bg-[var(--bg-hover)]",
        )}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]">
            <span className={cn("size-1.5 rounded-full", DOT[model.availability])} />
            {model.name}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">{model.provider}</span>
        </div>
        <p className="mt-0.5 pl-3.5 text-[12px] text-[var(--text-secondary)]">{model.description}</p>
        <div className="mt-1 flex flex-wrap gap-1 pl-3.5">
          {model.capabilities.map((cap) => (
            <span key={cap} className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
              {cap}
            </span>
          ))}
          <span className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
            {Math.round(model.contextWindow / 1000)}k
          </span>
          <span className="rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
            ${model.priceMtok}/Mtok
          </span>
        </div>
      </button>
    </motion.li>
  );
}
