// Feature: aws-quiz-app, Property 3: 判定は表示順に依存せず正解インデックスに従う
// **Validates: Requirements 4.6, 5.1**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];

// seed から簡易 PRNG(mulberry32)を作る。0以上1未満を返す
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 有効な問題の生成器(スキーマは js/validator.js に準拠)
// 選択肢は trim 後も重複しないよう、インデックス付きの接尾辞を付ける
const choiceBase = fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.trim() || "x");
const validQuestionArb = (difficulty, id, n) =>
  fc
    .record({
      bases: fc.array(choiceBase, { minLength: 4, maxLength: 4 }),
      answerIndex: fc.integer({ min: 0, max: 3 }),
      text: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.trim() || "問題"),
    })
    .map(({ bases, answerIndex, text }) => {
      const choices = bases.map((b, i) => `${b}#${i}`);
      const incorrect = {};
      for (let k = 0; k < 4; k++) {
        if (k !== answerIndex) incorrect[String(k)] = `誤り理由${k}`;
      }
      return {
        id,
        difficulty,
        text: `${text} (${n})`,
        choices,
        answerIndex,
        explanation: { correct: "正解理由", incorrect },
      };
    });

// 1〜5問のバンク(ID・問題文は一意)
const bankArb = fc
  .constantFrom(...DIFFICULTIES)
  .chain((difficulty) =>
    fc.integer({ min: 1, max: 5 }).chain((len) =>
      fc
        .tuple(...Array.from({ length: len }, (_, n) => validQuestionArb(difficulty, `q${n}`, n)))
        .map((bank) => ({ difficulty, bank }))
    )
  );

describe("Property 3: 判定は表示順に依存せず正解インデックスに従う", () => {
  it("任意の表示インデックスへの解答は originalIndex と answerIndex の一致で判定される", () => {
    fc.assert(
      fc.property(
        bankArb,
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 3 }),
        ({ difficulty, bank }, seed, displayIndex) => {
          const s0 = session.createSession(bank, difficulty, makeRng(seed));
          expect(s0.error).toBeUndefined();
          expect(s0.questions.length).toBe(bank.length);

          const q = s0.questions[0];
          const original = bank.find((b) => b.id === q.id);

          // choices は元の choices の順列である
          expect(q.choices.map((c) => c.text).sort()).toEqual([...original.choices].sort());
          expect(q.choices.map((c) => c.originalIndex).sort()).toEqual([0, 1, 2, 3]);
          q.choices.forEach((c) => expect(c.text).toBe(original.choices[c.originalIndex]));

          // 正解が表示上ちょうど1箇所で、answerDisplayIndex がそれを指す
          const correctPositions = q.choices
            .map((c, i) => (c.originalIndex === original.answerIndex ? i : -1))
            .filter((i) => i >= 0);
          expect(correctPositions).toEqual([q.answerDisplayIndex]);

          // 判定は表示順に依存しない
          const s1 = session.submitAnswer(s0, displayIndex);
          const expected = q.choices[displayIndex].originalIndex === original.answerIndex;
          expect(s1.answers[0].isCorrect).toBe(expected);
          expect(s1.answers[0].selectedDisplayIndex).toBe(displayIndex);
          expect(s1.correctCount).toBe(s0.correctCount + (expected ? 1 : 0));
        }
      ),
      { numRuns: 100 }
    );
  });
});
