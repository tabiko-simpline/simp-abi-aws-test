// @vitest-environment jsdom
/**
 * UI の例示ユニットテスト(jsdom)。
 * 実際の index.html の body を読み込み、script タグの順に js / data を実行して検証する。
 * 要件: 1.6, 3.1, 5.2, 5.3, 5.6, 5.7, 5.8, 5.9, 5.10, 7.4, 7.6, 7.7, 8.5, 8.8, 8.10, 9.13, 10.4, 10.5, 10.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// index.html から body(script 除去済み)と script の読み込み順を取り出す
const parsed = new DOMParser().parseFromString(indexHtml, "text/html");
const scriptSrcs = Array.from(parsed.querySelectorAll("script[src]")).map((s) =>
  s.getAttribute("src")
);
parsed.querySelectorAll("script").forEach((s) => s.remove());
const bodyHtml = parsed.body.innerHTML;

// スクリプトのソースは一度だけ読む
const sources = {};
scriptSrcs.forEach((src) => {
  sources[src] = fs.readFileSync(path.join(ROOT, src), "utf8");
});

const $ = (id) => document.getElementById(id);

/** 画面を初期状態にして index.html のスクリプトを順に実行する(起動まで行う) */
function boot(options) {
  const opts = options || {};
  delete window.QuizApp;
  delete window.QUIZ_DATA;
  delete window.__loadErrors;
  document.body.innerHTML = bodyHtml;
  if (opts.loadErrors) window.__loadErrors = opts.loadErrors;
  if (opts.before) opts.before();
  scriptSrcs.forEach((src) => {
    if (opts.skipData && src.indexOf("./data/") === 0) return;
    // classic script と同様にグローバルスコープで実行する
    new Function(sources[src]).call(window);
  });
}

function buttonByText(container, label) {
  return Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === label
  );
}

/** 現在の問題に、正解(true)または不正解(false)の選択肢で解答する */
function answerCurrent(correct) {
  const qText = $("quiz-question").textContent;
  const q = window.QUIZ_DATA.questions.find((x) => x.text === qText);
  const correctText = q.choices[q.answerIndex];
  const buttons = Array.from(document.querySelectorAll("#quiz-choices button"));
  const target = buttons.find(
    (b) => (b.querySelector(".choice__text").textContent === correctText) === correct
  );
  target.click();
}

function startDifficulty(name) {
  const btn = Array.from(document.querySelectorAll("#difficulty-list button")).find(
    (b) => b.getAttribute("aria-label") === name + "を開始"
  );
  btn.click();
}

/** 結果画面まで全問回答する。plan(i) が true の問は正解する。最終ボタンのラベル列を返す */
function runQuiz(plan) {
  const labels = [];
  for (let i = 0; i < 200; i++) {
    answerCurrent(plan(i));
    const btn = $("quiz-actions").querySelector("button");
    labels.push(btn.textContent);
    btn.click();
    if (btn.textContent === "結果を見る") break;
  }
  return labels;
}

describe("UI(jsdom)", () => {
  let savedStorage;

  beforeEach(() => {
    savedStorage = Object.getOwnPropertyDescriptor(window, "localStorage");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // localStorage のモックを元に戻す
    if (savedStorage) Object.defineProperty(window, "localStorage", savedStorage);
    window.localStorage.clear();
  });

  it("html 要素に lang=ja が設定されている(要件 10.7)", () => {
    expect(parsed.documentElement.getAttribute("lang")).toBe("ja");
  });

  it("Top が 3 難易度と説明を表示し、履歴ゼロなら「未挑戦」を表示する(要件 3.1, 8.5)", () => {
    boot();
    const cards = document.querySelectorAll("#difficulty-list .card");
    expect(cards).toHaveLength(3);
    const text = $("difficulty-list").textContent;
    expect(text).toContain("AWS初心者");
    expect(text).toContain("基礎だけわかる初級者");
    expect(text).toContain("中級エンジニア向け");
    expect(text).toContain("クラウドの基本概念");
    expect(text).toContain("EC2・S3・VPC・IAM");
    expect(text).toContain("可用性・セキュリティ設計");
    expect(text.match(/未挑戦/g)).toHaveLength(3);
  });

  it("正解を選ぶと「✓ 正解です」と正解の強調、再選択不可になる(要件 5.2, 5.6, 5.8)", () => {
    boot();
    startDifficulty("AWS初心者");
    answerCurrent(true);
    expect($("feedback").textContent).toContain("✓ 正解です");
    const correct = document.querySelectorAll("#quiz-choices .choice--correct");
    expect(correct).toHaveLength(1);
    expect(correct[0].textContent).toContain("✓ 正解");
    expect(document.querySelectorAll("#quiz-choices .choice--incorrect")).toHaveLength(0);
    document.querySelectorAll("#quiz-choices button").forEach((b) => {
      expect(b.disabled).toBe(true);
    });
  });

  it("不正解を選ぶと「✗ 不正解です」と選択肢の区別表示になる(要件 5.3, 5.7, 5.9)", () => {
    boot();
    startDifficulty("AWS初心者");
    answerCurrent(false);
    expect($("feedback").textContent).toContain("✗ 不正解です");
    const wrong = document.querySelectorAll("#quiz-choices .choice--incorrect");
    expect(wrong).toHaveLength(1);
    expect(wrong[0].textContent).toContain("✗ 不正解");
    const correct = document.querySelectorAll("#quiz-choices .choice--correct");
    expect(correct).toHaveLength(1);
    expect(correct[0].textContent).toContain("✓ 正解");
    document.querySelectorAll("#quiz-choices button").forEach((b) => {
      expect(b.disabled).toBe(true);
    });
  });

  it("解説が欠落している問題では「解説を表示できません」と次へボタンを表示する(要件 5.10)", () => {
    boot();
    const state = {
      kind: "normal",
      difficulty: "beginner",
      questions: [
        {
          id: "x-1",
          text: "テスト問題",
          choices: [
            { text: "A選択肢", originalIndex: 0 },
            { text: "B選択肢", originalIndex: 1 },
            { text: "C選択肢", originalIndex: 2 },
            { text: "D選択肢", originalIndex: 3 },
          ],
          answerIndex: 0,
          answerDisplayIndex: 0,
          explanation: {},
        },
        { id: "x-2", text: "次の問題", choices: [], answerIndex: 0, answerDisplayIndex: 0 },
      ],
      currentIndex: 0,
      answers: [{ selectedDisplayIndex: 0, isCorrect: true }, null],
      correctCount: 1,
      finished: false,
    };
    window.QuizApp.quizScreen.render(state, {}, { doc: document });
    expect($("feedback").textContent).toContain("解説を表示できません");
    expect(buttonByText($("quiz-actions"), "次の問題へ")).toBeTruthy();
  });

  it("全問正解なら復習ボタンなしで「全問正解です!」が表示される(要件 7.6)", () => {
    boot();
    startDifficulty("AWS初心者");
    const labels = runQuiz(() => true);
    // 最終問題でのみ「次の問題へ」が「結果を見る」に置き換わる(要件 5.10 周辺の進行仕様)
    expect(labels[labels.length - 1]).toBe("結果を見る");
    expect(labels.slice(0, -1).every((l) => l === "次の問題へ")).toBe(true);
    expect($("result-screen").hidden).toBe(false);
    expect($("result-message").textContent).toContain("全問正解です!");
    expect(buttonByText($("result-actions"), "間違えた問題だけ復習する")).toBeUndefined();
  });

  it("復習結果では Review の Score が元のスコアとは別に表示される(要件 7.4)", () => {
    boot();
    startDifficulty("AWS初心者");
    runQuiz((i) => i !== 0);
    expect($("result-score").textContent).toMatch(/29 \/ 30 問正解\(96%\)/);

    buttonByText($("result-actions"), "間違えた問題だけ復習する").click();
    expect($("quiz-screen").hidden).toBe(false);
    expect($("quiz-heading").textContent).toBe("復習クイズ");
    runQuiz(() => true);

    expect($("result-heading").textContent).toBe("復習結果");
    const score = $("result-score").textContent;
    expect(score).toContain("1 / 1 問正解(100%)");
    expect(score).toContain("元のクイズ: 29 / 30 問(96%)");
  });

  it("復習開始失敗(reviewError)ではエラーを表示し、結果表示を維持する(要件 7.7)", () => {
    boot();
    // 全問正解の finished な Session を作り、reviewError 付きで結果画面を描画する
    const s = window.QuizApp.session;
    let st = s.createSession(window.QUIZ_DATA.questions, "beginner");
    st = Object.assign({}, st, {
      answers: st.questions.map(() => ({ selectedDisplayIndex: 0, isCorrect: true })),
      correctCount: st.questions.length,
      finished: true,
    });
    window.QuizApp.resultScreen.render(st, {}, { doc: document, reviewError: "復習対象の問題がありません。" });
    expect($("app-alert").textContent).toContain("復習対象の問題がありません。");
    expect($("result-score").textContent).toContain("問正解");
    expect(buttonByText($("result-actions"), "トップへ戻る")).toBeTruthy();
  });

  it("localStorage が例外を投げても履歴無効メッセージを出し、クイズは継続する(要件 8.8)", () => {
    boot({
      before: () => {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new Error("denied");
          },
        });
      },
    });
    expect($("history-area").textContent).toContain("履歴を利用できません");
    startDifficulty("AWS初心者");
    runQuiz(() => true);
    expect($("result-screen").hidden).toBe(false);
    expect($("app-status").textContent).toContain("履歴を保存できませんでした");
  });

  describe("履歴削除(要件 8.10)", () => {
    function seedHistory() {
      boot({
        before: () => {
          const rec = {
            difficulty: "beginner",
            playedAt: "2024-01-02T03:04:05.000Z",
            correct: 20,
            total: 30,
            percent: 66.7,
          };
          window.localStorage.setItem(
            "aws-quiz-app:history:v1",
            JSON.stringify({ version: 1, records: [rec] })
          );
        },
      });
    }

    it("confirm を承認すると履歴が削除される", () => {
      seedHistory();
      expect($("history-area").textContent).toContain("20 / 30 問");
      vi.spyOn(window, "confirm").mockReturnValue(true);
      buttonByText($("history-area"), "履歴を削除").click();
      expect(window.localStorage.getItem("aws-quiz-app:history:v1")).toBeNull();
      expect($("history-area").textContent).toContain("履歴はまだありません");
      expect($("difficulty-list").textContent.match(/未挑戦/g)).toHaveLength(3);
    });

    it("confirm をキャンセルすると履歴は削除されない", () => {
      seedHistory();
      vi.spyOn(window, "confirm").mockReturnValue(false);
      buttonByText($("history-area"), "履歴を削除").click();
      expect(window.localStorage.getItem("aws-quiz-app:history:v1")).not.toBeNull();
      expect($("history-area").textContent).toContain("20 / 30 問");
    });
  });

  it("QUIZ_DATA 未定義ならエラーを表示し、開始ボタンがすべて無効になる(要件 1.6, 9.13)", () => {
    boot({ skipData: true });
    expect($("app-alert").textContent).toContain("読み込みに失敗");
    const starts = document.querySelectorAll("#difficulty-list button");
    expect(starts).toHaveLength(3);
    starts.forEach((b) => expect(b.disabled).toBe(true));
  });

  it("__loadErrors があればエラーを表示し、開始ボタンがすべて無効になる(要件 1.6, 9.13)", () => {
    boot({ loadErrors: ["./css/base.css"] });
    expect($("app-alert").textContent).toContain("読み込みに失敗");
    document
      .querySelectorAll("#difficulty-list button")
      .forEach((b) => expect(b.disabled).toBe(true));
  });

  it("画面切替後に各見出しへフォーカスが移る(要件 10.5)", () => {
    boot();
    expect(document.activeElement).toBe($("top-heading"));
    startDifficulty("AWS初心者");
    expect(document.activeElement).toBe($("quiz-heading"));
    runQuiz(() => true);
    expect(document.activeElement).toBe($("result-heading"));
    buttonByText($("result-actions"), "トップへ戻る").click();
    expect(document.activeElement).toBe($("top-heading"));
  });

  it("#feedback が aria-live を持つ(要件 10.4)", () => {
    boot();
    expect($("feedback").getAttribute("aria-live")).toBe("polite");
  });

  it("main.js 経由で起動→難易度選択→30 問回答→結果まで進む(統合)", () => {
    boot();
    startDifficulty("基礎だけわかる初級者");
    expect($("top-screen").hidden).toBe(true);
    expect($("quiz-progress").textContent).toMatch(/1 \/ 30/);
    const labels = runQuiz((i) => i % 3 !== 0);
    expect(labels).toHaveLength(30);
    expect($("result-screen").hidden).toBe(false);
    // 30 問中、i % 3 === 0 の 10 問を誤答 → 20 問正解
    expect($("result-score").textContent).toContain("20 / 30 問正解(66%)");
    expect(buttonByText($("result-actions"), "間違えた問題だけ復習する")).toBeTruthy();
    // 履歴が保存され、Top に戻ると前回の結果が表示される
    buttonByText($("result-actions"), "トップへ戻る").click();
    expect($("difficulty-list").textContent).toContain("前回: 20 / 30 問");
    expect($("history-area").textContent).toContain("基礎だけわかる初級者");
  });
});
