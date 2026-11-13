// Feature: aws-quiz-app, Property 11: 履歴のシリアライズはラウンドトリップで等価になる
// **Validates: Requirements 8.6, 8.7**
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const history = require('../../js/history.js');

// 有効な履歴レコードの生成器
const recordArb = fc
  .record({
    difficulty: fc.constantFrom('beginner', 'basic', 'intermediate'),
    playedAt: fc
      .date({ min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('2100-12-31T23:59:59.999Z'), noInvalidDate: true })
      .map((d) => d.toISOString()),
    total: fc.integer({ min: 1, max: 100 })
  })
  .chain((base) =>
    fc.integer({ min: 0, max: base.total }).map((correct) => ({
      difficulty: base.difficulty,
      playedAt: base.playedAt,
      correct,
      total: base.total,
      percent: Math.round((correct / base.total) * 1000) / 10
    }))
  );

describe('Property 11: 履歴のシリアライズ ラウンドトリップ', () => {
  it('serialize→parse→serialize が一致し、parse(serialize(x)) が x と等価', () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 30 }), (records) => {
        const first = history.serialize(records);
        const parsed = history.parse(first);
        expect(history.serialize(parsed)).toBe(first);
        expect(parsed).toEqual(records);
      }),
      { numRuns: 200 }
    );
  });
});
