// Feature: aws-quiz-app, Property 12: 破損した履歴データは例外を起こさず無効なレコードを含まない
// **Validates: Requirements 8.9**
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createRequire } from "node:module";

// js/history.js は UMD(CommonJS 互換)なので createRequire で読み込む
const require = createRequire(import.meta.url);
const history = require("../../js/history.js");

const NUM_RUNS = 200;
const DIFFICULTIES = ["beginner", "basic", "intermediate"];
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// ---- 検証ヘルパー ----

// 返されたレコードが必須項目と値域をすべて満たすか
function assertValidRecord(r) {
  expect(DIFFICULTIES).toContain(r.difficulty);
  expect(typeof r.playedAt).toBe("string");
  expect(r.playedAt).toMatch(ISO_PATTERN);
  expect(new Date(r.playedAt).toISOString()).toBe(r.playedAt);
  expect(Number.isInteger(r.correct)).toBe(true);
  expect(Number.isInteger(r.total)).toBe(true);
  expect(r.total).toBeGreaterThanOrEqual(1);
  expect(r.correct).toBeGreaterThanOrEqual(0);
  expect(r.correct).toBeLessThanOrEqual(r.total);
  expect(typeof r.percent).toBe("number");
  expect(Number.isFinite(r.percent)).toBe(true);
  expect(r.percent).toBeGreaterThanOrEqual(0);
  expect(r.percent).toBeLessThanOrEqual(100);
}

// parse が例外を投げず、配列を返し、全レコードが有効であること
function parseAndCheck(input) {
  let result;
  expect(() => {
    result = history.parse(input);
  }).not.toThrow();
  expect(Array.isArray(result)).toBe(true);
  result.forEach(assertValidRecord);
  return result;
}

// ---- ジェネレータ ----

// 2000-01-01 〜 2100-01-01 の ISO 8601(ミリ秒, Z)文字列
const isoArb = fc
  .integer({ min: 946684800000, max: 4102444800000 })
  .map((t) => new Date(t).toISOString());

// 有効なレコード
const validRecordArb = fc
  .record({
    difficulty: fc.constantFrom(...DIFFICULTIES),
    playedAt: isoArb,
    total: fc.integer({ min: 1, max: 100 }),
    percent: fc.double({ min: 0, max: 100, noNaN: true })
  })
  .chain((base) =>
    fc.integer({ min: 0, max: base.total }).map((correct) => ({ ...base, correct }))
  );

// 無効なレコード: 有効レコードに欠落・型不正・範囲外を 1 つ注入する
const invalidRecordArb = validRecordArb.chain((v) =>
  fc.oneof(
    // 必須項目の欠落
    fc
      .constantFrom("difficulty", "playedAt", "correct", "total", "percent")
      .map((key) => {
        const copy = { ...v };
        delete copy[key];
        return copy;
      }),
    // 型不正(文字列の数値、null)
    fc.constantFrom("correct", "total", "percent").chain((key) =>
      fc.constantFrom(String(v[key]), null, true, []).map((bad) => ({ ...v, [key]: bad }))
    ),
    fc.constantFrom(null, 1, ["basic"]).map((bad) => ({ ...v, difficulty: bad })),
    fc.constantFrom(null, 0, {}).map((bad) => ({ ...v, playedAt: bad })),
    // 範囲外: correct > total
    fc.integer({ min: 1, max: 50 }).map((d) => ({ ...v, correct: v.total + d })),
    // 範囲外: total < 1
    fc.integer({ min: -50, max: 0 }).map((t) => ({ ...v, total: t, correct: 0 })),
    // 範囲外: correct < 0
    fc.integer({ min: 1, max: 50 }).map((d) => ({ ...v, correct: -d })),
    // 非整数
    fc.constant({ ...v, correct: v.correct + 0.5, total: v.total + 1 }),
    // 範囲外: percent
    fc.double({ min: 100.001, max: 10000, noNaN: true }).map((p) => ({ ...v, percent: p })),
    fc.double({ min: -10000, max: -0.001, noNaN: true }).map((p) => ({ ...v, percent: p })),
    // 不正な playedAt
    fc
      .constantFrom(
        "not-a-date",
        "",
        "2024-02-30T00:00:00.000Z",
        "2024-01-01T00:00:00Z",
        "2024-01-01 00:00:00.000",
        "2024-13-01T00:00:00.000Z"
      )
      .map((p) => ({ ...v, playedAt: p })),
    // 不明な difficulty
    fc.constantFrom("expert", "", "BASIC", "advanced").map((d) => ({ ...v, difficulty: d })),
    // オブジェクトでない要素
    fc.constantFrom(null, 42, "text", [], true).map((x) => x)
  )
);

// 有効/無効レコードの混在(有効かどうかのタグ付き)
const mixedArb = fc.array(
  fc.oneof(
    validRecordArb.map((rec) => ({ valid: true, rec })),
    invalidRecordArb.map((rec) => ({ valid: false, rec }))
  ),
  { maxLength: 30 }
);

describe("Property 12: 破損した履歴データは例外を起こさず無効なレコードを含まない", () => {
  it("任意の文字列で例外を投げず、全レコードが有効。JSON 解析不能なら空配列", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const result = parseAndCheck(text);
        let parsable = true;
        try {
          JSON.parse(text);
        } catch (e) {
          parsable = false;
        }
        if (!parsable) expect(result).toEqual([]);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("任意の JSON 文字列で例外を投げず、構造不正なら空配列", () => {
    fc.assert(
      fc.property(fc.json(), (text) => {
        const result = parseAndCheck(text);
        const data = JSON.parse(text);
        const structured =
          data !== null &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          Array.isArray(data.records);
        if (!structured) expect(result).toEqual([]);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("有効/無効レコードの混在では有効なレコードだけが残る", () => {
    fc.assert(
      fc.property(mixedArb, (entries) => {
        const text = JSON.stringify({ version: 1, records: entries.map((e) => e.rec) });
        const result = parseAndCheck(text);
        const expected = entries.filter((e) => e.valid).map((e) => e.rec);
        expect(result.length).toBe(expected.length);
        expect(result).toEqual(expected);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("records が配列でない/トップレベルが不正な構造は空配列", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(null, 1, "x", true, []).map((v) => JSON.stringify(v)),
          fc
            .constantFrom(null, 1, "x", true, {}, { a: 1 })
            .map((v) => JSON.stringify({ version: 1, records: v })),
          fc.constant(JSON.stringify({ version: 1 }))
        ),
        (text) => {
          expect(parseAndCheck(text)).toEqual([]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("null や非文字列の入力でも例外を投げず空配列を返す", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(null, undefined),
          fc.double(),
          fc.integer(),
          fc.boolean(),
          fc.object(),
          fc.array(fc.anything())
        ),
        (input) => {
          expect(parseAndCheck(input)).toEqual([]);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
