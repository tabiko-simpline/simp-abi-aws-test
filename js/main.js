/**
 * main.js
 * 起動・状態保持・画面切替・イベント配線を担当する(最後に読み込まれる classic script)。
 * 要件: 1.6, 3.2, 3.6, 6.8, 6.9, 7.2, 8.1, 8.8, 9.13, 10.5, 10.6
 *
 * - 状態(state / lastSession / originalScore)はメモリ内のみで保持する。
 * - 画面切替は section の hidden 切替 + focus.moveFocus。
 *   ただし Quiz 画面の見出し/ボタンへのフォーカスは quizScreen.render 内で行うため二重にしない。
 * - すべてのイベントハンドラは guard() で包み、予期しない例外は #app-alert に表示する。
 */
(function (root) {
  "use strict";

  if (!root || !root.document) return;
  var doc = root.document;

  // 起動に必須なモジュール名(window.QuizApp.<name>)
  var REQUIRED_MODULES = [
    "validator", "scoring", "session", "storage", "history",
    "focus", "topScreen", "quizScreen", "resultScreen",
  ];

  var GENERIC_ERROR_MESSAGE =
    "予期しないエラーが発生しました。トップへ戻ってやり直してください。";
  var HISTORY_SAVE_FAILED_MESSAGE = "履歴を保存できませんでした";
  var DATA_INVALID_PREFIX = "問題データに不正があります";

  // ---- アプリ状態(メモリ内のみ) ----
  var bank = { validQuestions: [], startable: {}, issues: [] };
  var loadFailed = false;
  var state = null;          // 現在の SessionState
  var lastSession = null;    // 結果表示中の(finished な)SessionState
  var originalScore = null;  // 最初の通常 Session の calcScore(復習結果の比較表示用)
  var reviewError = null;    // 復習開始失敗の表示用

  function app() {
    return root.QuizApp || {};
  }

  function byId(id) {
    return doc.getElementById(id);
  }

  // ---- 通知領域 ----

  function clearNotices() {
    var alertEl = byId("app-alert");
    var statusEl = byId("app-status");
    if (alertEl) alertEl.textContent = "";
    if (statusEl) statusEl.textContent = "";
  }

  function showStatus(message) {
    var statusEl = byId("app-status");
    if (statusEl) statusEl.textContent = message;
  }

  /** 予期しない例外の表示。トップへ戻る導線を必ず残す(キートラップなし) */
  function showFatal() {
    var alertEl = byId("app-alert");
    if (!alertEl) return;
    alertEl.textContent = "";
    var p = doc.createElement("p");
    p.textContent = GENERIC_ERROR_MESSAGE;
    alertEl.appendChild(p);
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "button button--secondary";
    btn.textContent = "トップへ戻る";
    btn.addEventListener("click", function () {
      guardRaw(goTop);
    });
    alertEl.appendChild(btn);
  }

  /** try/catch のみ(ラッパ内部用)。失敗時は showFatal */
  function guardRaw(fn) {
    try {
      fn();
    } catch (e) {
      try {
        showFatal();
      } catch (e2) {
        // 表示にも失敗した場合は何もしない
      }
    }
  }

  /** イベントハンドラを try/catch で包む(要件 10.6) */
  function guard(fn) {
    return function () {
      var args = arguments;
      guardRaw(function () {
        fn.apply(null, args);
      });
    };
  }

  // ---- 画面切替 ----

  var SCREEN_IDS = ["top-screen", "quiz-screen", "result-screen"];

  /**
   * 指定画面のみ表示する。
   * @param {string} id 表示する section の id
   * @param {boolean} moveFocus true のとき focus.moveFocus を呼ぶ(Quiz は render 側で処理)
   */
  function showScreen(id, moveFocus) {
    SCREEN_IDS.forEach(function (sid) {
      var el = byId(sid);
      if (el) el.hidden = sid !== id;
    });
    if (moveFocus && app().focus) app().focus.moveFocus(byId(id));
  }

  // ---- Top ----

  function buildDataErrors(issues) {
    if (!issues || issues.length === 0) return [];
    var errors = [DATA_INVALID_PREFIX + "(" + issues.length + " 件)。該当する問題は出題されません。"];
    issues.slice(0, 3).forEach(function (issue) {
      if (issue && issue.message) errors.push(issue.message);
    });
    return errors;
  }

  var startupErrors = [];

  /** Top 画面を描画して表示する(履歴は毎回再読込) */
  function renderTop(extraErrors) {
    var a = app();
    var hist = a.history.load();
    var records = hist.records || [];
    var errors = startupErrors.concat(extraErrors || []);
    a.topScreen.render({
      doc: doc,
      loadFailed: false,
      errors: errors,
      startable: bank.startable,
      summaries: a.history.summarize(records),
      recent: a.history.recent(records, 10),
      historyStatus: hist.status,
      handlers: { onStart: guard(onStart), onClearHistory: guard(onClearHistory) },
    });
    var statusEl = byId("app-status");
    if (statusEl) statusEl.textContent = "";
    showScreen("top-screen", true);
  }

  /** 読み込み失敗時の Top 表示(開始ボタンはすべて無効) */
  function renderLoadFailed() {
    var a = app();
    var startable = { beginner: false, basic: false, intermediate: false };
    if (a.topScreen) {
      a.topScreen.render({
        doc: doc,
        loadFailed: true,
        errors: [],
        startable: startable,
        summaries: {},
        recent: [],
        historyStatus: "ok",
        handlers: {},
      });
    } else {
      // top-screen.js 自体が無い場合の最低限の表示
      var alertEl = byId("app-alert");
      if (alertEl) {
        alertEl.textContent =
          "必要なファイルの読み込みに失敗しました。ページを再読み込みしてください。";
      }
    }
    showScreen("top-screen", false);
  }

  function goTop() {
    // 状態を破棄して Top を再描画する(要件 3.6, 6.8, 6.9)
    state = null;
    lastSession = null;
    originalScore = null;
    reviewError = null;
    renderTop();
  }

  function onClearHistory() {
    app().history.clear();
    renderTop();
  }

  function onStart(difficulty) {
    var a = app();
    var s = a.session.createSession(bank.validQuestions, difficulty);
    if (s && s.error) {
      renderTop([s.error]);
      return;
    }
    state = s;
    lastSession = null;
    originalScore = null;
    reviewError = null;
    showQuiz();
  }

  // ---- Quiz ----

  function quizHandlers() {
    return { onAnswer: guard(onAnswer), onNext: guard(onNext), onFinish: guard(onFinish) };
  }

  /** Quiz 画面を表示して描画する(フォーカスは quizScreen.render が処理) */
  function showQuiz() {
    clearNotices();
    showScreen("quiz-screen", false);
    app().quizScreen.render(state, quizHandlers(), { doc: doc });
  }

  function onAnswer(displayIndex) {
    state = app().session.submitAnswer(state, displayIndex);
    app().quizScreen.render(state, quizHandlers(), { doc: doc });
  }

  function onNext() {
    state = app().session.advance(state);
    app().quizScreen.render(state, quizHandlers(), { doc: doc });
  }

  function onFinish() {
    var a = app();
    var finished = a.session.advance(state);
    state = finished;
    if (!finished || !finished.finished) return;
    lastSession = finished;

    var total = finished.questions.length;
    // 最初の通常 Session のスコアのみ保持(復習の復習でも変えない)
    if (finished.kind === "normal") {
      originalScore = a.scoring.calcScore(finished.correctCount, total);
    }

    // 履歴保存(失敗してもクイズは継続。要件 8.1, 8.8)
    var saved = false;
    try {
      var record = a.history.createRecord(finished.difficulty, finished.correctCount, total);
      var res = a.history.append(record);
      saved = !!(res && res.ok);
    } catch (e) {
      saved = false;
    }

    reviewError = null;
    showResult();
    if (!saved) showStatus(HISTORY_SAVE_FAILED_MESSAGE);
  }

  // ---- Result ----

  function showResult() {
    var a = app();
    clearNotices();
    showScreen("result-screen", false);
    var opts = { doc: doc };
    if (lastSession.kind === "review" && originalScore) opts.originalScore = originalScore;
    if (reviewError) opts.reviewError = reviewError;
    a.resultScreen.render(
      lastSession,
      { onTop: guard(goTop), onRetry: guard(onRetry), onReview: guard(onReview) },
      opts
    );
    a.focus.moveFocus(byId("result-screen"));
  }

  function onRetry() {
    // 復習結果からでも、同じ難易度の通常 Session を開始する
    var difficulty = lastSession.difficulty;
    var s = app().session.createSession(bank.validQuestions, difficulty);
    if (s && s.error) {
      reviewError = s.error;
      showResult();
      return;
    }
    state = s;
    lastSession = null;
    originalScore = null;
    reviewError = null;
    showQuiz();
  }

  function onReview() {
    var r = app().session.createReviewSession(lastSession);
    if (r && r.error) {
      // 結果表示を維持してエラーだけ表示する(要件 7.7)
      reviewError = r.error;
      showResult();
      return;
    }
    state = r;
    reviewError = null;
    showQuiz();
  }

  // ---- 起動 ----

  function start() {
    var a = app();
    var errs = root.__loadErrors;
    var missing = REQUIRED_MODULES.some(function (name) {
      return !a[name];
    });
    if ((errs && errs.length > 0) || typeof root.QUIZ_DATA === "undefined" || missing) {
      loadFailed = true;
      renderLoadFailed();
      return;
    }

    bank = a.validator.validateQuestionBank(root.QUIZ_DATA);
    startupErrors = buildDataErrors(bank.issues);
    renderTop();
  }

  guardRaw(start);
})(typeof window !== "undefined" ? window : null);
