// 実データ(data/*.js)のスモークテスト
// 要件: 9.1〜9.6, 9.11, 9.15
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateQuestion, validateQuestionBank, DIFFICULTIES } = require("../../js/validator.js");

const ROOT = path.resolve(__dirname, "../..");

// ブラウザ向けスクリプトを index.html と同じ順序で読み込む
const DATA_FILES = [
  "data/questions.js",
  "data/questions-beginner.js",
  "data/questions-basic.js",
  "data/questions-intermediate.js"
];

/** プレースホルダーとみなす文字列 */
const PLACEHOLDERS = ["...", "以下同様", "TODO", "ダミー"];

let questions = [];
let bank;

beforeAll(() => {
  // window をスタブしてから各スクリプトを順に実行する
  globalThis.window = {};
  for (const file of DATA_FILES) {
    const code = fs.readFileSync(path.join(ROOT, file), "utf8");
    new Function(code)();
  }
  const data = globalThis.window.QUIZ_DATA;
  delete globalThis.window;
  questions = data.questions;
  bank = validateQuestionBank(data);
});

/** 問題から検査対象の全テキスト(問題文・選択肢・解説)を集める */
function allTexts(q) {
  const ex = q.explanation || {};
  return [q.text, ...(q.choices || []), ex.correct, ...Object.values(ex.incorrect || {})];
}

describe("実データのスモークテスト", () => {
  it("各 Difficulty がちょうど 30 問、合計 90 問である", () => {
    expect(questions.length).toBe(90);
    for (const d of DIFFICULTIES) {
      expect(questions.filter((q) => q.difficulty === d).length).toBe(30);
    }
  });

  it("全問が validateQuestion を通過する(違反 0 件)", () => {
    const violations = questions.flatMap((q) => validateQuestion(q));
    expect(violations).toEqual([]);
  });

  it("validateQuestionBank で startable が全難易度 true、issues が空", () => {
    expect(bank.issues).toEqual([]);
    for (const d of DIFFICULTIES) {
      expect(bank.startable[d]).toBe(true);
    }
  });

  it("問題文・選択肢・解説にプレースホルダーが含まれない", () => {
    const found = [];
    for (const q of questions) {
      for (const t of allTexts(q)) {
        for (const p of PLACEHOLDERS) {
          if (typeof t === "string" && t.includes(p)) found.push(`${q.id}: ${p}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it("各 Difficulty 内で answerIndex 0〜3 が各 4〜11 問である", () => {
    for (const d of DIFFICULTIES) {
      const counts = [0, 0, 0, 0];
      for (const q of questions.filter((x) => x.difficulty === d)) counts[q.answerIndex] += 1;
      for (const c of counts) {
        expect(c).toBeGreaterThanOrEqual(4);
        expect(c).toBeLessThanOrEqual(11);
      }
    }
  });

  it("id が一意で、同一 Difficulty 内の問題文に重複がない", () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DIFFICULTIES) {
      const texts = questions.filter((q) => q.difficulty === d).map((q) => q.text.trim());
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it("解説が正解理由 1 件と、正解以外 3 キーの誤り理由を持つ", () => {
    for (const q of questions) {
      expect(typeof q.explanation.correct).toBe("string");
      expect(q.explanation.correct.length).toBeGreaterThan(0);
      const expectedKeys = [0, 1, 2, 3].filter((i) => i !== q.answerIndex).map(String);
      expect(Object.keys(q.explanation.incorrect).sort()).toEqual(expectedKeys);
      for (const k of expectedKeys) {
        expect(q.explanation.incorrect[k].length).toBeGreaterThan(0);
      }
    }
  });
});
