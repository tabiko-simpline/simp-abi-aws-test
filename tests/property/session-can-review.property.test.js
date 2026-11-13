// Feature: aws-quiz-app, Property 8: 復習ボタンの表示可否は誤答の有無と一致する
// **Validates: Requirements 7.1, 7.5, 7.6**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");

const NUM_RUNS = 100;
const DIFFICULTIES = ["beginner", "basic", "intermediate"];

/** シード付き PRNG(mulberry32)。0以上1未満を返す関数を作る */
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

/** 有効な問題の生成器(validator.js のスキーマに準拠。ID・選択肢は一意) */
function questionArb(index, difficulty) {
  return fc
    .record({
      answerIndex: fc.integer({ min: 0, max: 3 }),
      suffix: fc.string({ minLength: 0, maxLength: 20 }),
    })
    .map(({ answerIndex, suffix }) => {
      const incorrect = {};
      for (let k = 0; k < 4; k++) {
        if (k !== answerIndex) incorrect[String(k)] = `誤り理由${k}`;
      }
      return {
        id: `q-${index}`,
        difficulty,
        text: `問題文${index}${suffix}`,
        choices: [0, 1, 2, 3].map((k) => `選択肢${index}-${k}`),
        answerIndex,
        explanation: { correct: "正解理由", incorrect },
      };
    });
}

/** 1〜10問の問題バンク(同一難易度)を生成する */
const bankArb = fc
  .tuple(fc.constantFrom(...DIFFICULTIES), fc.integer({ min: 1, max: 10 }))
  .chain(([difficulty, n]) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => questionArb(i, difficulty))).map((qs) => ({
      difficulty,
      bank: qs,
    }))
  );

/** 解答計画: 全問正解 / 全問誤答 / ランダムを混在させる */
const planArb = fc.record({
  mode: fc.constantFrom("allCorrect", "allWrong", "random", "random"),
  picks: fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 10, maxLength: 10 }),
});

/** 計画に従って最後まで解答し finished にする */
function playToEnd(state, plan) {
  let s = state;
  let guard = 0;
  while (!s.finished && guard++ < 100) {
    const q = s.questions[s.currentIndex];
    let pick;
    if (plan.mode === "allCorrect") {
      pick = q.answerDisplayIndex;
    } else if (plan.mode === "allWrong") {
      pick = (q.answerDisplayIndex + 1 + (plan.picks[s.currentIndex] % 3)) % 4;
    } else {
      pick = plan.picks[s.currentIndex];
    }
    s = session.submitAnswer(s, pick);
    s = session.advance(s);
  }
  return s;
}

/** 検証本体: canReview と wrongQuestions が誤答数と一致する */
function assertProperty(state) {
  expect(state.finished).toBe(true);
  const wrongCount = state.answers.filter((a) => a && a.isCorrect === false).length;
  expect(session.canReview(state)).toBe(wrongCount >= 1);
  expect(session.wrongQuestions(state).length).toBe(wrongCount);
  if (wrongCount === 0) {
    expect(session.canReview(state)).toBe(false);
  }
}

describe("Property 8: 復習ボタンの表示可否は誤答の有無と一致する", () => {
  it("通常 Session: canReview は誤答 1 件以上と一致し、wrongQuestions 件数は誤答数に等しい", () => {
    fc.assert(
      fc.property(bankArb, fc.integer(), planArb, ({ difficulty, bank }, seed, plan) => {
        const created = session.createSession(bank, difficulty, makeRng(seed));
        expect(created.error).toBeUndefined();
        assertProperty(playToEnd(created, plan));
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("復習 Session: 同じ性質が成り立つ", () => {
    fc.assert(
      fc.property(
        bankArb,
        fc.integer(),
        planArb,
        planArb,
        ({ difficulty, bank }, seed, plan1, plan2) => {
          const rng = makeRng(seed);
          const first = playToEnd(session.createSession(bank, difficulty, rng), plan1);
          // 誤答が無ければ復習 Session は作れない(canReview が false)
          if (!session.canReview(first)) {
            expect(session.createReviewSession(first, rng).error).toBeDefined();
            return;
          }
          const review = session.createReviewSession(first, rng);
          expect(review.error).toBeUndefined();
          expect(review.kind).toBe("review");
          assertProperty(playToEnd(review, plan2));
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("極端ケース: 全問正解なら false、全問誤答なら true で件数は問題数に等しい", () => {
    fc.assert(
      fc.property(bankArb, fc.integer(), ({ difficulty, bank }, seed) => {
        const picks = new Array(10).fill(0);
        const ok = playToEnd(session.createSession(bank, difficulty, makeRng(seed)), {
          mode: "allCorrect",
          picks,
        });
        expect(session.canReview(ok)).toBe(false);
        expect(session.wrongQuestions(ok).length).toBe(0);

        const ng = playToEnd(session.createSession(bank, difficulty, makeRng(seed)), {
          mode: "allWrong",
          picks,
        });
        expect(session.canReview(ng)).toBe(true);
        expect(session.wrongQuestions(ng).length).toBe(ng.questions.length);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
