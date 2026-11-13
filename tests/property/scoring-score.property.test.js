import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const { calcScore } = require("../../js/scoring.js");

// total ≥ 1、0 ≤ correct ≤ total の整数ペアを生成する
const scoreInput = fc
  .integer({ min: 1, max: 10000 })
  .chain((total) =>
    fc.record({ total: fc.constant(total), correct: fc.integer({ min: 0, max: total }) })
  );

describe("calcScore のプロパティテスト", () => {
  // Feature: aws-quiz-app, Property 6: 正答率は切り捨てで計算され履歴用は小数第1位に丸められる
  // **Validates: Requirements 6.1, 8.1**
  it("percentFloor は切り捨て整数、percentRounded1 は小数第1位への四捨五入になる", () => {
    fc.assert(
      fc.property(scoreInput, ({ correct, total }) => {
        const result = calcScore(correct, total);

        // 切り捨ての期待値(整数演算で誤差を避ける)
        const expectedFloor = Math.floor((correct * 100) / total);
        expect(Number.isInteger(result.percentFloor)).toBe(true);
        expect(result.percentFloor).toBeGreaterThanOrEqual(0);
        expect(result.percentFloor).toBeLessThanOrEqual(100);
        expect(result.percentFloor).toBe(expectedFloor);

        // 四捨五入(半分は切り上げ)の期待値を整数演算で求める: round(correct*1000/total)
        const expectedTenths = Math.floor((correct * 2000 + total) / (2 * total));
        const tenths = Math.round(result.percentRounded1 * 10);
        expect(result.percentRounded1).toBeGreaterThanOrEqual(0);
        expect(result.percentRounded1).toBeLessThanOrEqual(100);
        // 小数第1位までの精度であること(10倍すると整数)
        expect(Math.abs(result.percentRounded1 * 10 - tenths)).toBeLessThan(1e-9);
        expect(tenths).toBe(expectedTenths);
      }),
      { numRuns: 200 }
    );
  });
});
