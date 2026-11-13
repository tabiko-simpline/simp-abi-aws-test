/**
 * quiz-screen.js
 * Quiz 画面の描画(問題文・4 選択肢・進捗/正答数・判定と解説・次へ/結果ボタン)。
 * 要件: 4.1〜4.5, 4.7, 5.1〜5.10, 10.1, 10.4
 *
 * render は state の currentIndex の問題を毎回再構築する冪等な関数。
 * 状態遷移は行わず、handlers(onAnswer / onNext / onFinish)で main.js に委譲する。
 * UMD 風: ブラウザでは window.QuizApp.quizScreen、Node では module.exports に公開する。
 */
(function (root) {
  "use strict";

  var LABELS = ["A", "B", "C", "D"];

  // 難易度の表示名(design.md「難易度の表示名と説明」)
  var DIFFICULTY_NAMES = {
    beginner: "AWS初心者",
    basic: "基礎だけわかる初級者",
    intermediate: "中級エンジニア向け",
  };

  /** scoring を解決する(ブラウザは window.QuizApp.scoring、Node は require) */
  function resolveScoring() {
    if (root && root.QuizApp && root.QuizApp.scoring) return root.QuizApp.scoring;
    if (typeof require === "function") {
      try {
        return require("../scoring");
      } catch (e) {
        // 下でフォールバックする
      }
    }
    return {
      formatProgress: function (n, m) {
        return "第 " + n + " / " + m + " 問";
      },
      formatCorrectCount: function (x) {
        return "正答数: " + x;
      },
    };
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  /** 表示順の問題に対して解説が表示可能な構造かを判定する(要件 5.10) */
  function isExplanationUsable(question) {
    var ex = question && question.explanation;
    if (!ex || typeof ex !== "object" || !isNonEmptyString(ex.correct)) return false;
    var inc = ex.incorrect;
    if (!inc || typeof inc !== "object") return false;
    for (var i = 0; i < question.choices.length; i++) {
      var c = question.choices[i];
      if (i === question.answerDisplayIndex) continue;
      if (!isNonEmptyString(inc[String(c.originalIndex)])) return false;
    }
    return true;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function make(doc, tag, className, text) {
    var el = doc.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /** 見出し文言を決める */
  function headingText(state) {
    if (state.kind === "review") return "復習クイズ";
    var name = DIFFICULTY_NAMES[state.difficulty];
    return name ? "クイズ(" + name + ")" : "クイズ";
  }

  /** 解説(正解理由 1 件 + 他 3 選択肢の誤り理由)を組み立てる */
  function buildExplanation(doc, question) {
    var box = make(doc, "div", "explanation");
    if (!isExplanationUsable(question)) {
      box.appendChild(make(doc, "p", "", "解説を表示できません"));
      return box;
    }
    var ex = question.explanation;
    var correctChoice = question.choices[question.answerDisplayIndex];
    box.appendChild(
      make(doc, "p", "", "正解の理由(" + LABELS[question.answerDisplayIndex] + ": " + correctChoice.text + "): " + ex.correct)
    );
    for (var i = 0; i < question.choices.length; i++) {
      if (i === question.answerDisplayIndex) continue;
      var c = question.choices[i];
      // incorrect のキーは元の選択肢順インデックス
      box.appendChild(
        make(doc, "p", "", "誤りの理由(" + LABELS[i] + ": " + c.text + "): " + ex.incorrect[String(c.originalIndex)])
      );
    }
    return box;
  }

  /**
   * 現在の問題を描画する。
   * @param {Object} state SessionState
   * @param {{onAnswer:function(number), onNext:function(), onFinish:function()}} handlers
   * @param {{doc?: Document}} [opts]
   */
  function render(state, handlers, opts) {
    var doc = (opts && opts.doc) || (typeof document !== "undefined" ? document : null);
    if (!doc || !state || !Array.isArray(state.questions)) return;
    var question = state.questions[state.currentIndex];
    if (!question) return;

    var scoring = resolveScoring();
    var h = handlers || {};
    var answer = state.answers ? state.answers[state.currentIndex] : null;
    var answered = answer !== null && answer !== undefined;

    var heading = doc.getElementById("quiz-heading");
    var progress = doc.getElementById("quiz-progress");
    var correctCount = doc.getElementById("quiz-correct-count");
    var questionEl = doc.getElementById("quiz-question");
    var choicesEl = doc.getElementById("quiz-choices");
    var feedback = doc.getElementById("feedback");
    var actions = doc.getElementById("quiz-actions");

    heading.textContent = headingText(state);
    progress.textContent = scoring.formatProgress(state.currentIndex + 1, state.questions.length);
    correctCount.textContent = scoring.formatCorrectCount(state.correctCount);
    questionEl.textContent = question.text;

    // 選択肢(毎回再構築)
    clear(choicesEl);
    question.choices.forEach(function (choice, i) {
      var btn = make(doc, "button", "choice");
      btn.type = "button";
      btn.appendChild(make(doc, "span", "choice__label", LABELS[i]));
      btn.appendChild(make(doc, "span", "choice__text", choice.text));

      if (answered) {
        btn.disabled = true; // 再選択不可(要件 4.5, 5.5)
        if (i === question.answerDisplayIndex) {
          btn.classList.add("choice--correct");
          btn.appendChild(make(doc, "span", "choice__mark", "✓ 正解"));
        } else if (i === answer.selectedDisplayIndex) {
          btn.classList.add("choice--incorrect");
          btn.appendChild(make(doc, "span", "choice__mark", "✗ 不正解"));
        }
      } else {
        btn.addEventListener("click", function () {
          if (typeof h.onAnswer === "function") h.onAnswer(i);
        });
      }
      choicesEl.appendChild(btn);
    });

    // 判定と解説(aria-live 領域へ同期的に挿入)
    clear(feedback);
    clear(actions);
    var focusTarget = null;

    if (answered) {
      var isCorrect = answer.selectedDisplayIndex === question.answerDisplayIndex;
      feedback.appendChild(
        make(
          doc,
          "p",
          "feedback__verdict " + (isCorrect ? "feedback__verdict--correct" : "feedback__verdict--incorrect"),
          isCorrect ? "✓ 正解です" : "✗ 不正解です"
        )
      );
      feedback.appendChild(buildExplanation(doc, question));

      var isLast = state.currentIndex >= state.questions.length - 1;
      var next = make(doc, "button", "button", isLast ? "結果を見る" : "次の問題へ");
      next.type = "button";
      next.addEventListener("click", function () {
        var fn = isLast ? h.onFinish : h.onNext;
        if (typeof fn === "function") fn();
      });
      actions.appendChild(next);
      focusTarget = next;
    } else {
      focusTarget = heading; // 問題切替直後は見出しへ(tabindex=-1)
    }

    try {
      if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
    } catch (e) {
      // フォーカス失敗で描画を止めない
    }
  }

  var api = { render: render };

  if (root && typeof root === "object") {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.quizScreen = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : null);
