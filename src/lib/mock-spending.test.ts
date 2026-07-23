import { expect, test } from "bun:test";
import { getModel } from "@/lib/mock/models";
import { canChargeMockTurn, estimateMockTurnCost, getMockSpendStatus } from "./mock-spending";

test("warns at 80% and blocks at the mock spending cap", () => {
  expect(getMockSpendStatus({ monthlyCapUsd: 10, spentUsd: 8 })).toMatchObject({ warning: true, blocked: false });
  expect(getMockSpendStatus({ monthlyCapUsd: 10, spentUsd: 10 })).toMatchObject({ warning: false, blocked: true });
});

test("prevents a mock request from exceeding the configured cap", () => {
  expect(canChargeMockTurn({ monthlyCapUsd: 1, spentUsd: 0.99 }, 0.02)).toBe(false);
  expect(canChargeMockTurn({ monthlyCapUsd: 1, spentUsd: 0.98 }, 0.02)).toBe(true);
});

test("mock turn estimates are non-zero even for the base model", () => {
  expect(estimateMockTurnCost(getModel("base"))).toBe(0.01);
});
