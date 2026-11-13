/**
 * focus.js
 * 画面切替後のフォーカス移動を担当するモジュール(要件 10.5)。
 * 新しい画面の先頭見出し(tabindex="-1")へ focus() を移動し、
 * 見出しが無ければ最初の主要操作要素(button / a / input)へフォールバックする。
 *
 * UMD 風: ブラウザでは window.QuizApp.focus、Node では module.exports に公開する。
 */
(function (root) {
  "use strict";

  // 見出しとして扱うセレクタ(index.html の #top-heading / #quiz-heading / #result-heading を含む)
  var HEADING_SELECTOR = "[tabindex='-1'][id$='-heading'], h1[tabindex='-1'], h2[tabindex='-1']";

  // 主要操作要素のセレクタ(無効化・非表示のものは後で除外する)
  var ACTION_SELECTOR = "button, a[href], input";

  /**
   * 要素が操作可能(無効でなく、type=hidden でない)かを判定する。
   * @param {Element} el
   * @returns {boolean}
   */
  function isUsable(el) {
    if (!el) return false;
    if (el.disabled) return false;
    if (el.getAttribute && el.getAttribute("type") === "hidden") return false;
    // hidden 属性を持つ祖先の内側は対象外
    if (typeof el.closest === "function" && el.closest("[hidden]")) return false;
    return true;
  }

  /**
   * 画面要素の中からフォーカス先を探す。見出し優先、なければ最初の操作要素。
   * @param {Element} screenElement
   * @returns {Element|null}
   */
  function findTarget(screenElement) {
    var heading = screenElement.querySelector(HEADING_SELECTOR);
    if (heading) return heading;

    var candidates = screenElement.querySelectorAll(ACTION_SELECTOR);
    for (var i = 0; i < candidates.length; i++) {
      if (isUsable(candidates[i])) return candidates[i];
    }
    return null;
  }

  /**
   * 新しい画面の見出し、または最初の主要操作要素へフォーカスを移動する。
   * 画面切替(hidden 解除)の直後に同期的に呼ぶことで、500ms 以内の移動を満たす。
   * DOM が無い環境や対象が無い場合は何もせず null を返す(例外を投げない)。
   * @param {Element} screenElement 表示した画面の section 要素
   * @returns {Element|null} フォーカスを移動した要素。移動できなければ null
   */
  function moveFocus(screenElement) {
    try {
      if (!screenElement || typeof screenElement.querySelector !== "function") {
        return null;
      }
      var target = findTarget(screenElement);
      if (!target || typeof target.focus !== "function") return null;
      target.focus();
      return target;
    } catch (e) {
      // フォーカス移動の失敗でアプリ全体を止めない
      return null;
    }
  }

  var api = { moveFocus: moveFocus };

  // ブラウザ: window.QuizApp.focus に公開(DOM が無い環境では root が未定義でも例外を出さない)
  if (root && typeof root === "object") {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.focus = api;
  }

  // Node(テスト環境): module.exports に公開
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : null);
