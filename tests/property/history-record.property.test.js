// Feature: aws-quiz-app, Property 10: 履歴レコードは必須項目と値域を満たし、集計は定義どおりになる
// **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import fc from "fast-check";

const require = createRequire(import.meta.url);
// 純粋関数(createRecord / summarize / recent)のみ使用する(storage は呼ばれない)
const history = require("../../js/history.js");

const DIFFICULTIES = ["beginner", "basic", "intermediate"];
const difficultyArb = fc.constantFrom(...DIFFICULTIES);

// toISOString が 4 桁年の形式になる範囲に制限した任意の日時
const dateArb = fc.date({
  min: new Date("0000-01-01T00:00:00.000Z"),
  max: new Date("9999-12-31T23:59:59.999Z"),
  noInvalidDate: true
});

// total ≥ 1, 0 ≤ correct ≤ total
const scoreArb = fc
  .integer({ min: 1, max: 1000 })
  .chain((total) => fc.record({ total: fc.constant(total), correct: fc.integer({ min: 0, max: total }) }));

// 重複しやすい playedAt(狭い範囲の時刻)を含むレコード
const baseMs = Date.parse("2024-01-01T00:00:00.000Z");
const playedAtArb = fc.oneof(
  fc.integer({ min: 0, max: 5 }).map((n) => new Date(baseMs + n * 1000).toISOString()),
  dateArb.map((d) => d.toISOString())
);
const recordArb = fc.record({
  difficulty: difficultyArb,
  playedAt: playedAtArb,
  correct: fc.integer({ min: 0, max: 100 }),
  total: fc.constant(100),
  percent: fc.integer({ min: 0, max: 1000 }).map((n) => n / 10)
});
// 空配列(= 空の Difficulty)や単一難易度のみの列も含む
const recordsArb = fc.array(recordArb, { minLength: 0, maxLength: 40 });

describe("Property 10: 履歴レコードと集計", () => {
  it("(a) createRecord は ISO 8601 の playedAt と値域内の percent を持つ", () => {
    fc.assert(
      fc.property(difficultyArb, scoreArb, dateArb, (difficulty, { correct, total }, now) => {
        const rec = history.createRecord(difficulty, correct, total, now);

        expect(rec.difficulty).toBe(difficulty);
        expect(rec.correct).toBe(correct);
        expect(rec.total).toBe(total);

        // ミリ秒精度・Z 終端の ISO 8601 で、元の日時を表す
        expect(rec.playedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(Date.parse(rec.playedAt)).toBe(now.getTime());

        // 参照実装: 整数演算による小数第 1 位への四捨五入(correct/total*100 を 0.1 刻みに丸める)
        const tenths = Math.floor((2000 * correct + total) / (2 * total));
        expect(rec.percent).toBeGreaterThanOrEqual(0);
        expect(rec.percent).toBeLessThanOrEqual(100);
        expect(Math.round(rec.percent * 10)).toBe(tenths);
        expect(rec.percent).toBe(tenths / 10);
      }),
      { numRuns: 200 }
    );
  });

  it("(b) summarize は latest / bestPercent / attempts を定義どおり返し、記録なしは null", () => {
    fc.assert(
      fc.property(recordsArb, (records) => {
        const result = history.summarize(records);

        for (const d of DIFFICULTIES) {
          // 参照実装(oracle)
          const own = records.filter((r) => r.difficulty === d);
          if (own.length === 0) {
            expect(result[d]).toBeNull();
            continue;
          }
          const maxPlayedAt = own.map((r) => r.playedAt).reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
          // 同一 playedAt は後出を latest とする
          let expectedLatest = null;
          for (const r of own) {
            if (r.playedAt === maxPlayedAt) expectedLatest = r;
          }
          const expectedBest = Math.max(...own.map((r) => r.percent));

          expect(result[d]).not.toBeNull();
          expect(result[d].latest).toBe(expectedLatest);
          expect(result[d].bestPercent).toBe(expectedBest);
          expect(result[d].attempts).toBe(own.length);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("(c) recent(records, 10) は長さ 10 以下・playedAt 降順・全レコードの上位", () => {
    fc.assert(
      fc.property(recordsArb, (records) => {
        const result = history.recent(records, 10);

        expect(result.length).toBe(Math.min(10, records.length));

        // playedAt の降順
        for (let i = 1; i < result.length; i++) {
          expect(Date.parse(result[i - 1].playedAt)).toBeGreaterThanOrEqual(Date.parse(result[i].playedAt));
        }

        // 結果は入力レコードの部分集合(多重集合として)
        const pool = records.slice();
        for (const r of result) {
          const idx = pool.indexOf(r);
          expect(idx).toBeGreaterThanOrEqual(0);
          pool.splice(idx, 1);
        }

        // 選ばれなかったレコードは、結果の最小 playedAt 以下である(上位であること)
        if (result.length > 0) {
          const minSelected = Date.parse(result[result.length - 1].playedAt);
          for (const r of pool) {
            expect(Date.parse(r.playedAt)).toBeLessThanOrEqual(minSelected);
          }
        }
      }),
      { numRuns: 200 }
    );
  });
});
