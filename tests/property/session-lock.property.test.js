// Feature: aws-quiz-app, Property 4: 解答の確定後は再選択しても状態が変わらない
// **Validates: Requirements 4.5, 5.5**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
const session = require("../../js/session.js");

const NUM_RUNS = 100;

/** 深いコピー(不変更新の検証用スナップショット) */
const snapshot = (v) => JSON.parse(JSON.stringify(v));

/** 有効な問題の生成器(スキーマは js/validator.js に準拠。id は index から付与して一意にする) */
const questionArb = (index) =>
  fc
    .record({
      text: fc.string({ minLength: 1, maxLength: 50 }),
      choices: fc.uniqueArray(fc.string({ minLength: 1, maxLength: 20 }), {
        minLength: 4,
        maxLength: 4,
        selector: (s) => s.trim()
      }),
      answerIndex: fc.integer({ min: 0, max: 3 }),
      correct: fc.string({ minLength: 1, maxLength: 100 }),
      wrong: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 3, maxLength: 3 })
    })
    .map(({ text, choices, answerIndex, correct, wrong }) => {
      const incorrect = {};
      let w = 0;
      for (let k = 0; k < 4; k++) {
        if (k !== answerIndex) incorrect[String(k)] = wrong[w++];
      }
      return {
        id: "q" + index,
        difficulty: "basic",
        text,
        choices,
        answerIndex,
        explanation: { correct, incorrect }
      };
    });

/** 1〜5 問の問題バンク */
const bankArb = fc
  .integer({ min: 1, max: 5 })
  .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => questionArb(i))));

/** 乱数列から rng 関数を作る(再現性のため seed 由来の線形合同法) */
const makeRng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * 任意の Session 状態(未解答の現在問題を持つ途中状態)の生成器。
 * 先頭から k 問を解答・進行させた状態を作る。
 */
const sessionStateArb = fc
  .tuple(bankArb, fc.integer(), fc.nat(), fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 5, maxLength: 5 }))
  .map(([bank, seed, skip, picks]) => {
    let state = session.createSession(bank, "basic", makeRng(seed));
    const steps = skip % state.questions.length; // 最終問題の手前までに限定し、現在問題は未解答にする
    for (let i = 0; i < steps; i++) {
      state = session.advance(session.submitAnswer(state, picks[i]));
    }
    return state;
  });

/** 選択操作の生成器(範囲外・非整数も混ぜる) */
const selectionArb = fc.oneof(
  { weight: 4, arbitrary: fc.integer({ min: 0, max: 3 }) },
  { weight: 1, arbitrary: fc.constantFrom(-1, 4, 99, -100, 1.5, NaN, Infinity) }
);

const isValidSelection = (state, v) =>
  Number.isInteger(v) && v >= 0 && v < state.questions[state.currentIndex].choices.length;

describe("Property 4: 解答の確定後は再選択しても状態が変わらない", () => {
  it("最初の有効な選択のみが判定と correctCount に反映され、以降の選択は無視される", () => {
    fc.assert(
      fc.property(sessionStateArb, fc.array(selectionArb, { minLength: 1, maxLength: 10 }), (initial, selections) => {
        const before = snapshot(initial);
        const idx = initial.currentIndex;
        const q = initial.questions[idx];
        const firstValid = selections.find((v) => isValidSelection(initial, v));

        let state = initial;
        let locked = null; // 最初の有効な選択の直後の state
        for (const sel of selections) {
          const prev = state;
          const prevSnap = snapshot(prev);
          state = session.submitAnswer(state, sel);

          // 各呼び出しで直前の state は破壊されない
          expect(snapshot(prev)).toEqual(prevSnap);

          if (locked !== null) {
            // 確定後の再選択は answers / correctCount を変えない
            expect(state.answers).toEqual(locked.answers);
            expect(state.correctCount).toBe(locked.correctCount);
            expect(state).toEqual(locked);
          } else if (isValidSelection(initial, sel)) {
            locked = state;
          }
        }

        // 元の state は破壊されない
        expect(snapshot(initial)).toEqual(before);

        if (firstValid === undefined) {
          // 有効な選択がなければ何も変わらない
          expect(state).toEqual(before);
        } else {
          // 最初の有効な選択のみが反映される
          const expectedCorrect = q.choices[firstValid].originalIndex === q.answerIndex;
          expect(state.answers[idx]).toEqual({ selectedDisplayIndex: firstValid, isCorrect: expectedCorrect });
          expect(state.correctCount).toBe(initial.correctCount + (expectedCorrect ? 1 : 0));
          // 他の問題の解答は変わらない
          state.answers.forEach((a, i) => {
            if (i !== idx) expect(a).toEqual(initial.answers[i]);
          });
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
