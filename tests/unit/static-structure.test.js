// 静的構成のスモークテスト(Node 環境、fs で読む)
// 要件: 1.1, 1.2, 1.3, 1.4, 9.12
// 対象はアプリ本体(index.html / css / js / data)のみ。tests 配下は対象外。
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

/** ディレクトリ配下のファイルを再帰的に列挙する */
function listFiles(dir, ext) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listFiles(full, ext));
    else if (ent.name.endsWith(ext)) out.push(full);
  }
  return out;
}

const read = (p) => fs.readFileSync(p, "utf8");
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

const INDEX = path.join(ROOT, "index.html");
const CSS_FILES = listFiles(path.join(ROOT, "css"), ".css");
const JS_FILES = [
  ...listFiles(path.join(ROOT, "js"), ".js"),
  ...listFiles(path.join(ROOT, "data"), ".js")
];

/**
 * JS を走査し、コメントを除去したコードと文字列リテラルの一覧を返す。
 * code: コメント除去済み、文字列リテラルの中身は空にしたコード
 * strings: 文字列リテラルの中身
 * (正規表現リテラルは解析しない。アプリ側に URL を含む正規表現が無い前提)
 */
function scanJs(src) {
  let code = "";
  const strings = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && n === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end < 0 ? src.length : end + 2;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== c) {
        if (src[j] === "\\") { s += src[j + 1] || ""; j += 2; continue; }
        s += src[j++];
      }
      strings.push(s);
      code += c + c;
      i = j + 1;
    } else {
      code += c;
      i++;
    }
  }
  return { code, strings };
}

/** 外部 URL または絶対パス(/ 始まり、// 含む)か */
function isExternalOrAbsolute(v) {
  const t = v.trim();
  return /^https?:\/\//i.test(t) || t.startsWith("/");
}

/** HTML コメントを除去する */
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "");
/** CSS コメントを除去する */
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

describe("静的構成のスモークテスト", () => {
  it("検査対象ファイルが存在する", () => {
    expect(fs.existsSync(INDEX)).toBe(true);
    expect(CSS_FILES.length).toBeGreaterThan(0);
    expect(JS_FILES.length).toBeGreaterThan(0);
  });

  describe("(1) 外部 URL・絶対パスを参照しない(要件 1.1, 1.2, 9.12)", () => {
    it("index.html の src / href 属性値が相対パスである", () => {
      const html = stripHtmlComments(read(INDEX));
      const values = [...html.matchAll(/\b(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
        .map((m) => m[1] !== undefined ? m[1] : m[2]);
      expect(values.length).toBeGreaterThan(0);
      expect(values.filter(isExternalOrAbsolute)).toEqual([]);
    });

    it("CSS の url(...) と @import が外部 URL・絶対パスを指さない", () => {
      const bad = [];
      for (const f of CSS_FILES) {
        const css = stripCssComments(read(f));
        const values = [
          ...[...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)]
            .map((m) => m[1] ?? m[2] ?? m[3]),
          ...[...css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi)].map((m) => m[1])
        ];
        for (const v of values) if (isExternalOrAbsolute(v)) bad.push(`${rel(f)}: ${v}`);
      }
      expect(bad).toEqual([]);
    });

    it("JS の文字列リテラルが外部 URL・// 始まりを含まない", () => {
      // 除外条件: なし(アプリ本体に http://localhost/ 等のコードは無い前提)
      const bad = [];
      for (const f of JS_FILES) {
        for (const s of scanJs(read(f)).strings) {
          if (/^\s*(?:https?:)?\/\//i.test(s) || /https?:\/\//i.test(s)) bad.push(`${rel(f)}: ${s}`);
        }
      }
      expect(bad).toEqual([]);
    });
  });

  describe("(2) ES モジュール・通信 API を使わない(要件 1.3, 9.12)", () => {
    it('index.html に type="module" が無い', () => {
      expect(stripHtmlComments(read(INDEX))).not.toMatch(/type\s*=\s*["']?module/i);
    });

    it("js/ と data/ に fetch( / XMLHttpRequest / ESM の import・export が無い", () => {
      const bad = [];
      for (const f of JS_FILES) {
        const { code } = scanJs(read(f));
        if (/\bfetch\s*\(/.test(code)) bad.push(`${rel(f)}: fetch(`);
        if (/\bXMLHttpRequest\b/.test(code)) bad.push(`${rel(f)}: XMLHttpRequest`);
        if (/^\s*import\s*[\w{*'"]/m.test(code)) bad.push(`${rel(f)}: import 文`);
        if (/\bimport\s*\(/.test(code)) bad.push(`${rel(f)}: 動的 import`);
        if (/^\s*export\s+/m.test(code)) bad.push(`${rel(f)}: export 文`);
      }
      expect(bad).toEqual([]);
    });

    it("index.html に fetch( / XMLHttpRequest が無い", () => {
      const html = stripHtmlComments(read(INDEX));
      expect(html).not.toMatch(/fetch\s*\(|XMLHttpRequest/);
    });
  });

  describe("(3) 参照ファイルが実在する(要件 1.1, 1.4)", () => {
    it("index.html の script / link が指すファイルがすべて存在する", () => {
      const html = stripHtmlComments(read(INDEX));
      const refs = [
        ...[...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*"([^"]*)"/gi)].map((m) => m[1]),
        ...[...html.matchAll(/<link\b[^>]*\bhref\s*=\s*"([^"]*)"/gi)].map((m) => m[1])
      ];
      expect(refs.length).toBeGreaterThan(0);
      const missing = refs.filter((r) => !fs.existsSync(path.join(ROOT, r.split(/[?#]/)[0])));
      expect(missing).toEqual([]);
    });
  });

  describe("(4) 実行時に node_modules を要さない(要件 1.2, 9.12)", () => {
    it("js/ と index.html に node_modules への参照が無い", () => {
      const files = [INDEX, ...listFiles(path.join(ROOT, "js"), ".js")];
      const bad = files.filter((f) => /node_modules/.test(read(f))).map(rel);
      expect(bad).toEqual([]);
    });

    it("js/ 内の require 呼び出しはすべて typeof require === 'function' ガード内にある", () => {
      const bad = [];
      for (const f of listFiles(path.join(ROOT, "js"), ".js")) {
        const src = read(f);
        const { code } = scanJs(src);
        // コメント・文字列を除いたコード上の require( 呼び出し位置を、元ソース上で探す
        const callCount = (code.match(/\brequire\s*\(/g) || []).length;
        if (callCount === 0) continue;
        // 元ソースの require( のうち、コメント行を除いた呼び出しを対象にガードを確認する
        const re = /\brequire\s*\(/g;
        let m;
        while ((m = re.exec(src))) {
          const lineStart = src.lastIndexOf("\n", m.index) + 1;
          const line = src.slice(lineStart, m.index);
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // コメント行
          // 直前 300 文字以内に typeof require === 'function' のガードがあること
          const before = src.slice(Math.max(0, m.index - 300), m.index);
          if (!/typeof\s+require\s*===?\s*["']function["']/.test(before)) {
            bad.push(`${rel(f)}: ${src.slice(lineStart, m.index + 30).trim()}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });
  });
});
