import { expect, test } from "bun:test";
import { MODELS } from "@/lib/mock/models";
import {
  DEFAULT_MODEL_ROUTING_PREFERENCES,
  detectTaskCategory,
  recommendModel,
} from "./model-routing";

test("detects common AI workspace task categories", () => {
  expect(detectTaskCategory("Debug this React TypeScript component")).toBe("coding");
  expect(detectTaskCategory("Find sources and compare these products")).toBe("research");
  expect(detectTaskCategory("Summarize this report")).toBe("summarization");
});

test("recommends a model with an explainable confidence value", () => {
  const recommendation = recommendModel("Please debug my TypeScript API", MODELS, DEFAULT_MODEL_ROUTING_PREFERENCES);
  expect(recommendation.modelId).toBe("claude");
  expect(recommendation.task).toBe("coding");
  expect(recommendation.confidence).toBeGreaterThanOrEqual(55);
  expect(recommendation.reason).toContain("coding");
});

test("cost priority favors lower-cost models when task scores are close", () => {
  const recommendation = recommendModel("Translate this Italian email", MODELS, {
    smartRouting: true,
    priority: "cost",
  });
  expect(recommendation.modelId).toBe("base");
});
