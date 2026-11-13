// scoring.js の例示ユニットテスト
// 要件: 4.2, 4.3, 6.1〜6.6, 8.1
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  calcScore,
  evaluationTier,
  evaluationComment,
  formatProgress,
  formatCorrectCount
} = require("../../js/scoring.js");

describe("evaluationTier: 評価区分の代表値", () => {
  const cases = [
    [100, "top"],
    [90, "top"],
    [89, "high"],
    [70, "high"],
    [69, "mid"],
    [50, "mid"],
    [49, "review"],
    [0, "review"]
  ];
  it.each(cases)("%i%% は %s", (percent, tier) => {
    expect(evaluationTier(percent)).toBe(tier);
  });
});

describe("evaluationComment", () => {
  it("4区分で互いに異なる非空文字列を返す", () => {
    const tiers = ["top", "high", "mid", "review"];
    const comments = tiers.map((t) => evaluationComment(t));
    comments.forEach((c) => {
      expect(typeof c).toBe("string");
      expect(c.length).toBeGreaterThan(0);
    });
    expect(new Set(comments).size).toBe(4);
  });
});

describe("表示文字列の整形", () => {
  it("formatProgress(1, 30) は「第 1 / 30 問」", () => {
    expect(formatProgress(1, 30)).toBe("第 1 / 30 問");
  });

  it("formatCorrectCount(5) は「正答数: 5」", () => {
    expect(formatCorrectCount(5)).toBe("正答数: 5");
  });
});

describe("calcScore", () => {
  it("1/3 は percentFloor 33、percentRounded1 33.3", () => {
    const s = calcScore(1, 3);
    expect(s.percentFloor).toBe(33);
    expect(s.percentRounded1).toBe(33.3);
  });

  it("0/0 は 0% を返す", () => {
    const s = calcScore(0, 0);
    expect(s.percentFloor).toBe(0);
    expect(s.percentRounded1).toBe(0);
  });
});
