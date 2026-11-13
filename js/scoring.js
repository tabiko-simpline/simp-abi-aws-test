/**
 * scoring.js
 * 採点・評価コメント・表示文字列の整形(純粋関数のみ)。
 * 要件: 4.2, 4.3, 6.1〜6.6, 8.1
 * ブラウザでは window.QuizApp.scoring、Node(テスト)では module.exports で公開する。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.scoring = api;
  }
})(typeof window !== "undefined" ? window : undefined, function () {
  "use strict";

  /**
   * 正答数と全問題数からスコアを計算する。
   * percentFloor は結果画面用(小数点以下切り捨て、要件 6.1)、
   * percentRounded1 は履歴用(小数第1位に四捨五入、要件 8.1)。
   * total が 0(または不正値)の場合は防御的に 0% を返す。
   */
  function calcScore(correct, total) {
    var safe = typeof total === "number" && total > 0 && isFinite(total);
    return {
      correct: correct,
      total: total,
      percentFloor: safe ? Math.floor((correct / total) * 100) : 0,
      percentRounded1: safe ? Math.round((correct / total) * 1000) / 10 : 0,
    };
  }

  /**
   * 正答率(切り捨て整数)から評価区分を返す(要件 6.3〜6.6)。
   * 90〜100: top / 70〜89: high / 50〜69: mid / 0〜49: review
   */
  function evaluationTier(percentFloor) {
    if (percentFloor >= 90) return "top";
    if (percentFloor >= 70) return "high";
    if (percentFloor >= 50) return "mid";
    return "review";
  }

  var COMMENTS = {
    top: "素晴らしい成績です!AWS の知識がしっかり身についています。",
    high: "よくできました!あと一歩で満点圏です。間違えた問題を見直しましょう。",
    mid: "まずまずの結果です。解説を読み返して理解を深めましょう。",
    review: "基礎の復習をおすすめします。解説を確認して、もう一度挑戦してみましょう。",
  };

  /** 評価区分に対応する日本語コメントを返す(要件 6.2)。 */
  function evaluationComment(tier) {
    return Object.prototype.hasOwnProperty.call(COMMENTS, tier)
      ? COMMENTS[tier]
      : COMMENTS.review;
  }

  /** 進捗表示「第 N / M 問」を返す(要件 4.2)。 */
  function formatProgress(n, m) {
    return "第 " + n + " / " + m + " 問";
  }

  /** 正答数表示「正答数: X」を返す(要件 4.3)。 */
  function formatCorrectCount(x) {
    return "正答数: " + x;
  }

  return {
    calcScore: calcScore,
    evaluationTier: evaluationTier,
    evaluationComment: evaluationComment,
    formatProgress: formatProgress,
    formatCorrectCount: formatCorrectCount,
  };
});
