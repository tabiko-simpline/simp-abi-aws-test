// validateQuestionBank のプロパティテスト
// Feature: aws-quiz-app, Property 14: バンクレベルの検証は不正問題を除外し30問未満の難易度を開始不可にする
// **Validates: Requirements 3.5, 4.7, 9.6, 9.14**
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateQuestionBank, DIFFICULTIES } = require("../../js/validator.js");

/** 有効な問題を組み立てる(ID・問題文は呼び出し側で一意に指定する) */
function buildValid(id, difficulty, text, answerIndex) {
  const incorrect = {};
  for (let k = 0; k < 4; k++) {
    if (k !== answerIndex) incorrect[String(k)] = `選択肢${k}が誤りである理由`;
  }
  return {
    id,
    difficulty,
    text,
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    answerIndex,
    explanation: { correct: "正解の理由", incorrect }
  };
}

/** 有効な問題を壊した変種(個別検証で必ず不正になる)。id は元のまま保持する */
const BREAKERS = [
  (q) => ({ ...q, difficulty: "expert" }),
  (q) => ({ ...q, text: "" }),
  (q) => ({ ...q, text: "あ".repeat(301) }),
  (q) => ({ ...q, choices: q.choices.slice(0, 3) }),
  (q) => ({ ...q, choices: ["同じ", "同じ ", "B", "C"] }),
  (q) => ({ ...q, answerIndex: 4 }),
  (q) => ({ ...q, answerIndex: 1.5 }),
  (q) => ({ ...q, explanation: { correct: "", incorrect: q.explanation.incorrect } }),
  (q) => ({ ...q, explanation: { correct: "x", incorrect: {} } }),
  (q) => ({ ...q, explanation: null })
];

/** 件数の境界(29/30/31)を重点的に含む難易度別の有効問題数 */
const countArb = fc.oneof(
  fc.constantFrom(0, 1, 29, 30, 31),
  fc.integer({ min: 0, max: 35 })
);

/** 壊し方・重複の指定 */
const extraArb = fc.record({
  kind: fc.constantFrom("broken", "dupId", "dupText", "nonObject"),
  difficultyIndex: fc.integer({ min: 0, max: 2 }),
  sourceIndex: fc.nat(),
  breaker: fc.integer({ min: 0, max: BREAKERS.length - 1 }),
  nonObject: fc.constantFrom(null, undefined, 42, "text", [])
});

const scenarioArb = fc.record({
  counts: fc.tuple(countArb, countArb, countArb),
  answerIndexes: fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 8 }),
  extras: fc.array(extraArb, { maxLength: 25 }),
  wrapped: fc.boolean()
});

/** シナリオから問題バンクと期待値を構築する */
function buildScenario({ counts, answerIndexes, extras, wrapped }) {
  const originals = [];
  const byDifficulty = { beginner: [], basic: [], intermediate: [] };
  DIFFICULTIES.forEach((d, di) => {
    for (let i = 0; i < counts[di]; i++) {
      // 問題文は難易度をまたいで同一でもよい(重複判定は同一 Difficulty 内のみ)
      const q = buildValid(`${d}-${i}`, d, `共通の問題文${i}`, answerIndexes[i % answerIndexes.length]);
      originals.push(q);
      byDifficulty[d].push(q);
    }
  });

  const rejected = []; // 除外されるべき要素
  const dupIdIds = [];
  const dupTextIds = [];
  const list = [...originals];
  extras.forEach((e, n) => {
    const d = DIFFICULTIES[e.difficultyIndex];
    const pool = byDifficulty[d];
    if (e.kind === "nonObject") {
      list.push(e.nonObject);
      return;
    }
    if (e.kind === "broken") {
      const base = buildValid(`broken-${n}`, d, `壊れた問題${n}`, 0);
      const broken = BREAKERS[e.breaker](base);
      rejected.push(broken);
      list.push(broken);
      return;
    }
    if (pool.length === 0) return; // 複製元がない場合は何も足さない
    const src = pool[e.sourceIndex % pool.length];
    if (e.kind === "dupId") {
      // ID だけが先出と同一の有効な問題
      const dup = buildValid(src.id, d, `ID重複の問題文${n}`, 0);
      dupIdIds.push(src.id);
      rejected.push(dup);
      list.push(dup);
    } else {
      // 同一難易度内で問題文が(trim 後に)同一の有効な問題
      const dup = buildValid(`dup-text-${n}`, d, ` ${src.text} `, 1);
      dupTextIds.push(dup.id);
      rejected.push(dup);
      list.push(dup);
    }
  });

  return { raw: wrapped ? { questions: list } : list, originals, rejected, dupIdIds, dupTextIds, counts };
}

describe("Feature: aws-quiz-app, Property 14: バンクレベルの検証は不正問題を除外し30問未満の難易度を開始不可にする", () => {
  it("validQuestions は検証通過かつ重複でない問題のみで構成される", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { raw, originals, rejected } = buildScenario(scenario);
        const result = validateQuestionBank(raw);

        // 先出の有効な問題だけが、入力順のまま残る
        expect(result.validQuestions).toEqual(originals);
        // 不正・重複の問題は 1 件も含まれない
        for (const r of rejected) {
          expect(result.validQuestions.includes(r)).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("countsByDifficulty は通過件数と一致し、startable は件数がちょうど30のときに限り true", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { raw, counts } = buildScenario(scenario);
        const result = validateQuestionBank(raw);

        DIFFICULTIES.forEach((d, di) => {
          const actual = result.validQuestions.filter((q) => q.difficulty === d).length;
          expect(result.countsByDifficulty[d]).toBe(actual);
          expect(result.countsByDifficulty[d]).toBe(counts[di]);
          expect(result.startable[d]).toBe(result.countsByDifficulty[d] === 30);
        });
      }),
      { numRuns: 200 }
    );
  });

  it("同一 Difficulty 内の問題文重複・ID 重複は除外され issue として報告される", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { raw, dupIdIds, dupTextIds } = buildScenario(scenario);
        const result = validateQuestionBank(raw);

        for (const id of dupTextIds) {
          expect(result.issues.some((i) => i.questionId === id && i.rule === "text-unique")).toBe(true);
        }
        const idIssues = result.issues.filter((i) => i.rule === "id-unique");
        expect(idIssues.length).toBe(dupIdIds.length);
        for (const id of dupIdIds) {
          expect(idIssues.some((i) => i.questionId === id)).toBe(true);
        }
        // 通過した問題の ID は一意である
        const ids = result.validQuestions.map((q) => q.id);
        expect(new Set(ids).size).toBe(ids.length);
      }),
      { numRuns: 200 }
    );
  });

  it("不正な問題は少なくとも 1 件の issue として報告される", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { raw, originals } = buildScenario(scenario);
        const result = validateQuestionBank(raw);
        const total = (Array.isArray(raw) ? raw : raw.questions).length;
        // 除外件数(不正・重複・非オブジェクト)以上の issue がある
        expect(result.issues.length).toBeGreaterThanOrEqual(total - originals.length);
      }),
      { numRuns: 100 }
    );
  });
});
