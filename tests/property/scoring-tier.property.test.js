// Feature: aws-quiz-app, Property 7: 評価コメントの区分は正答率に対してちょうど1つ決まる
// **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const { evaluationTier } = require("../../js/scoring.js");

const TIERS = ["top", "high", "mid", "review"];

// 期待される区分を仕様から独立に求める
function expectedTier(p) {
  if (p >= 90) return "top";
  if (p >= 70) return "high";
  if (p >= 50) return "mid";
  return "review";
}

describe("Property 7: evaluationTier", () => {
  it("0〜100 の整数に対してちょうど 1 つの区分を返し、仕様の範囲と一致する", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (p) => {
        const tier = evaluationTier(p);
        // 4 区分のうちちょうど 1 つに一致する
        expect(TIERS.filter((t) => t === tier)).toHaveLength(1);
        expect(tier).toBe(expectedTier(p));
      }),
      { numRuns: 200 }
    );
  });

  it("境界 (90, 70, 50) とその直前値で正しく切り替わる", () => {
    const cases = [
      [100, "top"],
      [90, "top"],
      [89, "high"],
      [70, "high"],
      [69, "mid"],
      [50, "mid"],
      [49, "review"],
      [0, "review"],
    ];
    for (const [p, tier] of cases) {
      expect(evaluationTier(p)).toBe(tier);
    }
  });
});
