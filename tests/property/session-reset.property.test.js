// Feature: aws-quiz-app, Property 2: 新規 Session は常に初期状態から始まる
// **Validates: Requirements 3.6, 6.8, 6.9**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];

/** シード付きの簡易乱数(0以上1未満)。テストの再現性のために使う */
function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 検証を通る問題を1問作る(id・問題文・選択肢は一意) */
function makeQuestion(difficulty, n, answerIndex) {
  const incorrect = {};
  for (let k = 0; k < 4; k++) {
    if (k !== answerIndex) incorrect[String(k)] = "誤り理由" + k;
  }
  return {
    id: difficulty + "-" + n,
    difficulty,
    text: "問題文 " + difficulty + " " + n,
    choices: ["選択肢A" + n, "選択肢B" + n, "選択肢C" + n, "選択肢D" + n],
    answerIndex,
    explanation: { correct: "正解理由", incorrect }
  };
}

/** 各難易度に 1〜35 問を持つ問題バンクの生成器 */
const bankArb = fc
  .tuple(...DIFFICULTIES.map(() => fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 35 })))
  .map((answerLists) => {
    const bank = [];
    DIFFICULTIES.forEach((d, di) => {
      answerLists[di].forEach((ans, n) => bank.push(makeQuestion(d, n, ans)));
    });
    return bank;
  });

/** 先行 Session に対する操作(解答 or 次へ) */
const opArb = fc.oneof(
  fc.record({ type: fc.constant("answer"), index: fc.integer({ min: 0, max: 3 }) }),
  fc.record({ type: fc.constant("advance") })
);

/** 操作列を適用する。fillAll が true なら最後まで解答して finished にする */
function applyOps(state, ops, fillAll) {
  let s = state;
  for (const op of ops) {
    s = op.type === "answer" ? session.submitAnswer(s, op.index) : session.advance(s);
  }
  if (fillAll) {
    while (!s.finished) {
      s = session.advance(session.submitAnswer(s, 0));
    }
  }
  return s;
}

describe("Property 2: 新規 Session は常に初期状態から始まる", () => {
  it("任意の先行 Session の後でも、新規 Session は初期状態で、先行 Session と状態を共有しない", () => {
    fc.assert(
      fc.property(
        bankArb,
        fc.constantFrom(...DIFFICULTIES),
        fc.constantFrom(...DIFFICULTIES),
        fc.array(opArb, { maxLength: 80 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 0xffffffff }),
        (bank, prevDifficulty, nextDifficulty, ops, fillAll, seed1, seed2) => {
          // 先行 Session(得点・回答履歴を持つ。finished も含む)
          const initial = session.createSession(bank, prevDifficulty, seededRng(seed1));
          const prev = applyOps(initial, ops, fillAll);

          // 新規 Session
          const next = session.createSession(bank, nextDifficulty, seededRng(seed2));

          // 初期状態であること
          expect(next.error).toBeUndefined();
          expect(next.kind).toBe("normal");
          expect(next.difficulty).toBe(nextDifficulty);
          expect(next.currentIndex).toBe(0);
          expect(next.correctCount).toBe(0);
          expect(next.finished).toBe(false);
          expect(next.answers.length).toBe(next.questions.length);
          expect(next.answers.every((a) => a === null)).toBe(true);

          // 先行 Session と同一参照を共有しないこと
          expect(next).not.toBe(prev);
          expect(next).not.toBe(initial);
          expect(next.answers).not.toBe(prev.answers);
          expect(next.answers).not.toBe(initial.answers);
          expect(next.questions).not.toBe(prev.questions);
          expect(next.questions).not.toBe(initial.questions);
          const prevQuestions = new Set(prev.questions.concat(initial.questions));
          next.questions.forEach((q) => expect(prevQuestions.has(q)).toBe(false));

          // 先行 Session を変更しても新 Session に影響しないこと
          const snapshot = JSON.stringify(next);
          prev.answers.push({ selectedDisplayIndex: 0, isCorrect: true });
          prev.answers.fill({ selectedDisplayIndex: 1, isCorrect: true });
          prev.currentIndex = 99;
          prev.correctCount = 99;
          prev.finished = !prev.finished;
          prev.kind = "review";
          prev.questions.length = 0;
          initial.answers.fill({ selectedDisplayIndex: 2, isCorrect: true });
          expect(JSON.stringify(next)).toBe(snapshot);
        }
      ),
      { numRuns: 100 }
    );
  });
});
