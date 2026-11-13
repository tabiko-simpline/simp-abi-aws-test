// Feature: aws-quiz-app, Property 1: Session は対象難易度の全問を重複なく出題する
// **Validates: Requirements 3.3**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];

/** seed から簡易PRNG(mulberry32)を作る。0以上1未満を返す */
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

/** 有効な問題を1問作る(id・問題文は難易度と連番で一意になる) */
function makeQuestion(difficulty, index, answerIndex, salt) {
  const incorrect = {};
  for (let k = 0; k < 4; k++) {
    if (k !== answerIndex) incorrect[String(k)] = "誤り理由" + k + salt;
  }
  return {
    id: difficulty + "-" + index,
    difficulty: difficulty,
    text: "問題" + difficulty + "-" + index + "-" + salt,
    choices: [0, 1, 2, 3].map((k) => "選択肢" + k + "-" + salt),
    answerIndex: answerIndex,
    explanation: { correct: "正解理由" + salt, incorrect: incorrect }
  };
}

/** 各難易度 0〜35 問の有効な問題集合の生成器(出題順は入力順に依存しないよう並べ替える) */
const bankArb = fc
  .tuple(
    ...DIFFICULTIES.map((d) =>
      fc
        .array(
          fc.record({
            answerIndex: fc.integer({ min: 0, max: 3 }),
            salt: fc.string({ minLength: 0, maxLength: 5 })
          }),
          { minLength: 0, maxLength: 35 }
        )
        .map((items) => items.map((it, i) => makeQuestion(d, i, it.answerIndex, it.salt)))
    )
  )
  .chain((groups) => {
    const all = [].concat(...groups);
    return fc.integer().map((seed) => {
      const rng = makeRng(seed);
      return session.shuffle(all, rng);
    });
  });

describe("Property 1: Session は対象難易度の全問を重複なく出題する", () => {
  it("state.questions の id 集合は対象難易度の全問の id 集合と等しく、重複しない", () => {
    fc.assert(
      fc.property(
        bankArb,
        fc.constantFrom(...DIFFICULTIES),
        fc.integer(),
        (bank, difficulty, seed) => {
          const expectedIds = bank.filter((q) => q.difficulty === difficulty).map((q) => q.id);
          const result = session.createSession(bank, difficulty, makeRng(seed));

          if (expectedIds.length === 0) {
            // 対象難易度が0問ならエラーが返る
            expect(result).toHaveProperty("error");
            return;
          }

          expect(result.error).toBeUndefined();
          const ids = result.questions.map((q) => q.id);
          // 重複なし
          expect(new Set(ids).size).toBe(ids.length);
          // 件数と id 集合が一致
          expect(ids.length).toBe(expectedIds.length);
          expect([...ids].sort()).toEqual([...expectedIds].sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});
