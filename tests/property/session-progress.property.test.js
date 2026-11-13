// Feature: aws-quiz-app, Property 5: 進捗・正答数の整形が仕様形式に一致し範囲に収まる
// **Validates: Requirements 4.2, 4.3**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");
const scoring = require("../../js/scoring.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];

/** シード付きの簡易乱数(LCG)。0以上1未満を返す。 */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** validator.js のスキーマに適合する有効な問題を作る(id・問題文・選択肢は一意)。 */
function buildQuestion(i, difficulty, answerIndex) {
  const incorrect = {};
  for (let k = 0; k < 4; k++) {
    if (k !== answerIndex) incorrect[String(k)] = `誤り理由 ${i}-${k}`;
  }
  return {
    id: `q-${i}`,
    difficulty,
    text: `問題文 ${i}`,
    choices: [0, 1, 2, 3].map((k) => `選択肢 ${i}-${k}`),
    answerIndex,
    explanation: { correct: `正解理由 ${i}`, incorrect },
  };
}

/** 1〜30問の有効な問題バンクと難易度・乱数シード・各問の解答(表示インデックス)を生成する */
const scenarioArb = fc
  .record({
    difficulty: fc.constantFrom(...DIFFICULTIES),
    answerIndexes: fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 30 }),
    seed: fc.integer({ min: 0, max: 0x7fffffff }),
    picks: fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 30, maxLength: 30 }),
  })
  .map(({ difficulty, answerIndexes, seed, picks }) => ({
    bank: answerIndexes.map((a, i) => buildQuestion(i, difficulty, a)),
    difficulty,
    seed,
    picks,
  }));

describe("Property 5: 進捗・正答数の整形が仕様形式に一致し範囲に収まる", () => {
  it("(a) 1≤N≤M の整数で formatProgress(N, M) が `第 N / M 問` と一致する", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }).chain((m) =>
          fc.record({ n: fc.integer({ min: 1, max: m }), m: fc.constant(m) })
        ),
        ({ n, m }) => {
          expect(scoring.formatProgress(n, m)).toBe(`第 ${n} / ${m} 問`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("(b) 任意の解答列で最後まで進めても、各問表示時の正答数が 0〜N-1 で整形形式に一致し、最終正答数が isCorrect の個数と一致する", () => {
    fc.assert(
      fc.property(scenarioArb, ({ bank, difficulty, seed, picks }) => {
        let state = session.createSession(bank, difficulty, makeRng(seed));
        expect(state.error).toBeUndefined();
        const total = state.questions.length;
        expect(total).toBe(bank.length);

        while (!state.finished) {
          const n = state.currentIndex + 1;

          // 各問題の表示時点: 正答数は 0 以上 N-1 以下
          expect(state.correctCount).toBeGreaterThanOrEqual(0);
          expect(state.correctCount).toBeLessThanOrEqual(n - 1);

          // 進捗表示の形式
          expect(scoring.formatProgress(n, total)).toBe(`第 ${n} / ${total} 問`);

          // 正答数表示の形式(X は整数)
          const text = scoring.formatCorrectCount(state.correctCount);
          expect(text).toBe(`正答数: ${state.correctCount}`);
          const match = /^正答数: (\d+)$/.exec(text);
          expect(match).not.toBeNull();
          expect(Number.isInteger(Number(match[1]))).toBe(true);

          // 任意の表示インデックスで解答して次へ進む
          state = session.submitAnswer(state, picks[state.currentIndex]);
          state = session.advance(state);
        }

        // 最終的な正答数は isCorrect が true の個数と一致する
        const correctInAnswers = state.answers.filter((a) => a && a.isCorrect === true).length;
        expect(state.answers.every((a) => a !== null)).toBe(true);
        expect(state.correctCount).toBe(correctInAnswers);
        expect(state.correctCount).toBeLessThanOrEqual(total);
      }),
      { numRuns: 100 }
    );
  });
});
