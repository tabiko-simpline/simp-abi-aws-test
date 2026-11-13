// validateQuestion のプロパティテスト
// Feature: aws-quiz-app, Property 13: 個別問題の検証は仕様どおりに合否を判定する
// **Validates: Requirements 4.1, 4.7, 9.2, 9.4, 9.5, 9.15**
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateQuestion } = require("../../js/validator.js");

// ---- 生成器 ----

/** 境界に寄せた文字数(問題文・選択肢) */
const textLen = fc.constantFrom(0, 1, 2, 100, 101, 300, 301);
const choiceLen = fc.constantFrom(0, 1, 2, 50, 99, 100, 101);
/** 解説の各パートの文字数(合計 1000 の境界を狙う) */
const exLen = fc.constantFrom(0, 1, 2, 250, 333, 334, 997, 998, 999, 1000, 1001);

/** 指定長の文字列(識別用の先頭文字付き) */
const strOf = (key, len) => (len === 0 ? "" : key.repeat(len));

/** 1 つの選択肢。ばらつきの少ない key で trim 後の重複を起こしやすくする */
const choiceArb = fc
  .tuple(fc.constantFrom("a", "b", "c", "d"), choiceLen, fc.constantFrom("", " "))
  .map(([k, len, pad]) => (len === 0 ? "" : pad + strOf(k, len - pad.length > 0 ? len - pad.length : 1)));

/** 位置ごとに別の key を使う(重複しにくい)選択肢 4 つ。長さのみ境界に寄せる */
const distinctChoicesArb = fc
  .array(fc.constantFrom(1, 2, 50, 100, 101, 0), { minLength: 4, maxLength: 4 })
  .map((lens) => lens.map((len, i) => strOf("wxyz"[i], len)));

/** 選択肢配列: 通常 4 個 / 過不足 / 重複しやすい / 型不正 */
const choicesArb = fc.oneof(
  { weight: 5, arbitrary: distinctChoicesArb },
  { weight: 3, arbitrary: fc.array(choiceArb, { minLength: 4, maxLength: 4 }) },
  { weight: 1, arbitrary: fc.array(choiceArb, { minLength: 0, maxLength: 6 }) },
  { weight: 1, arbitrary: fc.constant(["p", "q", "r", 3]) },
  { weight: 1, arbitrary: fc.constant("not-array") }
);

const answerIndexArb = fc.oneof(
  { weight: 6, arbitrary: fc.constantFrom(0, 1, 2, 3) },
  { weight: 2, arbitrary: fc.constantFrom(-1, 4, 5, 1.5, NaN) },
  { weight: 1, arbitrary: fc.constantFrom("1", null, undefined) }
);

/** 解説: 正常 / 欠落 / 空文字 / 超過などを混在させる */
const explanationArb = fc.oneof(
  {
    weight: 7,
    arbitrary: fc
      .tuple(exLen, exLen, exLen, exLen, fc.constantFrom(0, 1, 2, 3), fc.boolean())
      .map(([c, i1, i2, i3, drop, useDrop]) => {
        const incorrect = {};
        const lens = [i1, i2, i3];
        let n = 0;
        for (let k = 0; k < 4; k++) {
          // answerIndex が未確定のため、全 4 キーを持たせて一部を欠落させる形にする
          incorrect[String(k)] = strOf("e", lens[n % 3]);
          n++;
        }
        if (useDrop) delete incorrect[String(drop)];
        return { correct: strOf("c", c), incorrect };
      })
  },
  {
    // 合計が 1〜1000 に収まりやすい短い解説(通過ケースを確保する)
    weight: 5,
    arbitrary: fc.constant({
      correct: "c".repeat(100),
      incorrect: { 0: "e0", 1: "e1", 2: "e2", 3: "e3" }
    })
  },
  { weight: 1, arbitrary: fc.constant(undefined) },
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant({ correct: "c", incorrect: null }) },
  { weight: 1, arbitrary: fc.constant({ incorrect: { 0: "a", 1: "b", 2: "c", 3: "d" } }) }
);

const questionArb = fc.record({
  id: fc.oneof({ weight: 8, arbitrary: fc.constant("q-1") }, { weight: 1, arbitrary: fc.constant("") }, { weight: 1, arbitrary: fc.constant(7) }),
  difficulty: fc.oneof(
    { weight: 8, arbitrary: fc.constantFrom("beginner", "basic", "intermediate") },
    { weight: 1, arbitrary: fc.constantFrom("expert", "", undefined) }
  ),
  text: textLen.map((n) => strOf("t", n)),
  choices: choicesArb,
  answerIndex: answerIndexArb,
  explanation: explanationArb
});

// ---- 独立した参照実装(oracle) ----

const isStr = (v) => typeof v === "string";
const isNonEmpty = (v) => isStr(v) && v.length > 0;
const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** 要件 9.2, 9.4, 9.5 に基づき、全制約を満たすかを返す */
function oracleIsValid(q) {
  if (!isObj(q)) return false;
  if (!isNonEmpty(q.id)) return false;
  if (!["beginner", "basic", "intermediate"].includes(q.difficulty)) return false;
  if (!isStr(q.text) || q.text.length < 1 || q.text.length > 300) return false;

  if (!Array.isArray(q.choices) || q.choices.length !== 4) return false;
  if (!q.choices.every((c) => isStr(c) && c.length >= 1 && c.length <= 100)) return false;
  if (new Set(q.choices.map((c) => c.trim())).size !== 4) return false;

  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) return false;

  const ex = q.explanation;
  if (!isObj(ex) || !isNonEmpty(ex.correct) || !isObj(ex.incorrect)) return false;
  let total = ex.correct.length;
  for (const k of [0, 1, 2, 3]) {
    if (k === q.answerIndex) continue;
    const v = ex.incorrect[String(k)];
    if (!isNonEmpty(v)) return false;
    total += v.length;
  }
  return total >= 1 && total <= 1000;
}

describe("Feature: aws-quiz-app, Property 13: 個別問題の検証は仕様どおりに合否を判定する", () => {
  it("validateQuestion が空配列を返すのは全制約を満たすときに限り、通過した問題は解説と正解選択肢を持つ", () => {
    let passed = 0;
    let rejected = 0;

    fc.assert(
      fc.property(questionArb, (q) => {
        const issues = validateQuestion(q);
        const ok = issues.length === 0;

        // 参照実装と合否が一致する
        expect(ok).toBe(oracleIsValid(q));

        if (ok) {
          passed++;
          // 通過した問題では answerIndex の選択肢が存在する
          expect(isNonEmpty(q.choices[q.answerIndex])).toBe(true);
          // 正解理由と誤り理由 3 件が非空
          expect(isNonEmpty(q.explanation.correct)).toBe(true);
          const wrong = [0, 1, 2, 3].filter((k) => k !== q.answerIndex);
          expect(wrong).toHaveLength(3);
          for (const k of wrong) {
            expect(isNonEmpty(q.explanation.incorrect[String(k)])).toBe(true);
          }
        } else {
          rejected++;
        }
      }),
      { numRuns: 500 }
    );

    // 生成器が通過・不通過の両方を網羅していること(空虚な成功の防止)
    expect(passed).toBeGreaterThan(0);
    expect(rejected).toBeGreaterThan(0);
  });
});
