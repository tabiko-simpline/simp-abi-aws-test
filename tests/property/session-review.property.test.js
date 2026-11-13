// Feature: aws-quiz-app, Property 9: Review_Session は直前の誤答のみで構成される
// **Validates: Requirements 7.2, 7.3, 7.5**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");
const scoring = require("../../js/scoring.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];

/** 再現可能な PRNG(mulberry32)。0以上1未満を返す関数を作る */
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

/** 有効な問題(validator のスキーマ準拠)を index から組み立てる */
function buildQuestion(index, difficulty, answerIndex) {
  const incorrect = {};
  for (let k = 0; k < 4; k++) {
    if (k !== answerIndex) incorrect[String(k)] = `誤り理由${index}-${k}`;
  }
  return {
    id: `q-${index}`,
    difficulty,
    text: `問題文${index}`,
    choices: [0, 1, 2, 3].map((k) => `選択肢${index}-${k}`),
    answerIndex,
    explanation: { correct: `正解理由${index}`, incorrect }
  };
}

/** 1〜15問の有効な問題バンク(ID・問題文は一意)の生成器 */
const bankArb = fc
  .tuple(
    fc.constantFrom(...DIFFICULTIES),
    fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 15 })
  )
  .map(([difficulty, answers]) => ({
    difficulty,
    questions: answers.map((ans, i) => buildQuestion(i, difficulty, ans))
  }));

/** 正誤パターン(true=正解を選ぶ)。先頭を誤答に固定し、1問目で必ず誤答が出るようにする */
const wrongFirstFlagsArb = fc
  .array(fc.boolean(), { minLength: 0, maxLength: 14 })
  .map((flags) => [false, ...flags]);

/** 任意の正誤パターン(全問正解もあり得る) */
const flagsArb = fc.array(fc.boolean(), { minLength: 1, maxLength: 15 });

/** 正誤パターンに従って最後まで解答し、完了済み Session を返す */
function playThrough(initial, flags) {
  let state = initial;
  let i = 0;
  while (!state.finished) {
    const q = state.questions[state.currentIndex];
    const wantCorrect = flags[i % flags.length];
    let pick = q.choices.findIndex((c) =>
      wantCorrect ? c.originalIndex === q.answerIndex : c.originalIndex !== q.answerIndex
    );
    state = session.submitAnswer(state, pick);
    state = session.advance(state);
    i++;
  }
  return state;
}

/** 復習 Session が prev の誤答のみで正しく構成されていることを検証する */
function assertReviewOf(prev, review) {
  const wrong = prev.questions.filter((q, i) => prev.answers[i] && prev.answers[i].isCorrect === false);
  const wrongIds = wrong.map((q) => q.id).sort();

  expect(review.error).toBeUndefined();
  expect(review.kind).toBe("review");
  expect(review.difficulty).toBe(prev.difficulty);
  expect(review.currentIndex).toBe(0);
  expect(review.correctCount).toBe(0);
  expect(review.finished).toBe(false);
  expect(review.answers.every((a) => a === null)).toBe(true);

  // 出題集合 = 誤答集合(重複なし)、出題数 M = 誤答数
  const M = review.questions.length;
  expect(M).toBe(wrong.length);
  expect(review.answers.length).toBe(M);
  expect(review.questions.map((q) => q.id).sort()).toEqual(wrongIds);

  // 進捗表示
  expect(scoring.formatProgress(1, M)).toBe(`第 1 / ${M} 問`);

  // 選択肢は元の選択肢の順列で、answerDisplayIndex が正解を指す
  for (const rq of review.questions) {
    const orig = wrong.find((q) => q.id === rq.id);
    const origTexts = orig.choices
      .slice()
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map((c) => c.text);
    expect(rq.choices.length).toBe(origTexts.length);
    // 各選択肢の text は originalIndex で元の選択肢を指す
    for (const c of rq.choices) {
      expect(c.text).toBe(origTexts[c.originalIndex]);
    }
    // 順列であること(originalIndex が 0..n-1 を過不足なく含む)
    expect(rq.choices.map((c) => c.originalIndex).sort()).toEqual(origTexts.map((_, i) => i));
    expect(rq.answerIndex).toBe(orig.answerIndex);
    expect(rq.choices[rq.answerDisplayIndex].originalIndex).toBe(rq.answerIndex);
  }
}

describe("Property 9: Review_Session は直前の誤答のみで構成される", () => {
  it("通常 Session の誤答のみで復習 Session が構成され、復習の復習も同様に成り立つ", () => {
    fc.assert(
      fc.property(
        bankArb,
        wrongFirstFlagsArb,
        flagsArb,
        fc.integer({ min: 0, max: 0xffffffff }),
        (bank, flags1, flags2, seed) => {
          const rng = makeRng(seed);
          const normal = session.createSession(bank.questions, bank.difficulty, rng);
          expect(normal.error).toBeUndefined();
          const done = playThrough(normal, flags1);

          const review = session.createReviewSession(done, rng);
          assertReviewOf(done, review);

          // 復習 Session を完了させ、さらに誤答があれば復習の復習も検証する
          const reviewDone = playThrough(review, flags2);
          const again = session.createReviewSession(reviewDone, rng);
          if (session.canReview(reviewDone)) {
            assertReviewOf(reviewDone, again);
          } else {
            expect(again.error).toBeTruthy();
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("誤答が 0 件なら { error } が返る", () => {
    fc.assert(
      fc.property(bankArb, fc.integer({ min: 0, max: 0xffffffff }), (bank, seed) => {
        const rng = makeRng(seed);
        const normal = session.createSession(bank.questions, bank.difficulty, rng);
        const done = playThrough(normal, [true]);
        const result = session.createReviewSession(done, rng);
        expect(result.error).toBeTruthy();
        expect(result.questions).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});
