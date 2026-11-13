// 配色トークンのコントラスト検算テスト
// 要件: 2.1, 2.5, 10.3
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const CSS_PATH = path.resolve(__dirname, "../../css/tokens.css");

// :root の hsl(H S% L%) 形式の変数をパースする
function parseTokens(css) {
  const tokens = {};
  const re = /(--[\w-]+)\s*:\s*hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    tokens[m[1]] = { h: Number(m[2]), s: Number(m[3]), l: Number(m[4]) };
  }
  return tokens;
}

// hsl → sRGB(0〜1)
function hslToRgb({ h, s, l }) {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lig - c / 2;
  return [r + m, g + m, b + m];
}

// 相対輝度(WCAG 2.x)
function luminance(color) {
  const [r, g, b] = hslToRgb(color).map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// コントラスト比
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const css = fs.readFileSync(CSS_PATH, "utf8");
const t = parseTokens(css);

// ペアごとにコントラスト比の下限を検証する
function check(fg, bg, min) {
  it(`${fg} と ${bg} のコントラスト比が ${min}:1 以上`, () => {
    expect(t[fg], `${fg} が見つからない`).toBeDefined();
    expect(t[bg], `${bg} が見つからない`).toBeDefined();
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(min);
  });
}

describe("配色トークン: コントラスト比", () => {
  // 本文
  check("--color-text", "--color-bg", 4.5);
  check("--color-text", "--color-surface", 4.5);
  check("--color-text", "--color-surface-hover", 4.5);
  // 補足テキスト
  check("--color-text-muted", "--color-bg", 4.5);
  check("--color-text-muted", "--color-surface", 4.5);
  // ボタンラベルとアクセント
  check("--color-on-accent", "--color-accent", 4.5);
  check("--color-on-accent", "--color-accent-hover", 4.5);
  // アクセントと背景/カード(非テキスト 3:1)
  check("--color-accent", "--color-bg", 3);
  check("--color-accent", "--color-surface", 3);
  // フォーカス色
  check("--color-focus", "--color-bg", 3);
  check("--color-focus", "--color-surface", 3);
  // 判定色と本文色
  check("--color-text", "--color-correct-bg", 4.5);
  check("--color-text", "--color-incorrect-bg", 4.5);
  check("--color-text", "--color-error-bg", 4.5);
});

describe("配色トークン: 色相・彩度・明度", () => {
  it("ネイビー(背景・カード)は色相 200〜240°・明度 35% 以下", () => {
    for (const name of ["--color-bg", "--color-surface"]) {
      expect(t[name].h).toBeGreaterThanOrEqual(200);
      expect(t[name].h).toBeLessThanOrEqual(240);
      expect(t[name].l).toBeLessThanOrEqual(35);
    }
  });

  it("オレンジ(アクセント)は色相 20〜40°・彩度 80% 以上", () => {
    expect(t["--color-accent"].h).toBeGreaterThanOrEqual(20);
    expect(t["--color-accent"].h).toBeLessThanOrEqual(40);
    expect(t["--color-accent"].s).toBeGreaterThanOrEqual(80);
  });
});
