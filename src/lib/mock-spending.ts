import type { Model } from "@/types/model.types";

export interface MockSpending {
  monthlyCapUsd: number;
  spentUsd: number;
}

export interface MockSpendStatus {
  percentUsed: number;
  warning: boolean;
  blocked: boolean;
}

export const DEFAULT_MOCK_SPENDING: MockSpending = {
  monthlyCapUsd: 50,
  spentUsd: 0,
};

export function getMockSpendStatus(spending: MockSpending): MockSpendStatus {
  const percentUsed = spending.monthlyCapUsd > 0
    ? Math.min(100, Math.round((spending.spentUsd / spending.monthlyCapUsd) * 100))
    : 100;
  return {
    percentUsed,
    warning: percentUsed >= 80 && percentUsed < 100,
    blocked: percentUsed >= 100,
  };
}

/** A transparent local estimate for mock mode, not a provider billing figure. */
export function estimateMockTurnCost(model: Model): number {
  return Math.max(0.01, Number((model.priceMtok * 0.006).toFixed(2)));
}

export function canChargeMockTurn(spending: MockSpending, amountUsd: number): boolean {
  return spending.spentUsd + amountUsd <= spending.monthlyCapUsd;
}
