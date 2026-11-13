/**
 * top-screen.js
 * Top 画面(難易度カード・履歴・エラー表示)の描画。
 * 要件: 1.6, 3.1, 3.2, 3.5, 8.2〜8.5, 8.8, 8.10, 9.13, 9.14
 * ブラウザでは window.QuizApp.topScreen、Node(テスト)では module.exports で公開する。
 * 文字列はすべて textContent で設定する(innerHTML には値を渡さない)。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.topScreen = api;
  }
})(typeof window !== "undefined" ? window : undefined, function () {
  "use strict";

  /** 難易度の定義(名称・説明は design.md の表のとおり) */
  var DIFFICULTIES = [
    {
      id: "beginner",
      name: "AWS初心者",
      description: "クラウドの基本概念と、主要な AWS サービスの役割を学びます。",
    },
    {
      id: "basic",
      name: "基礎だけわかる初級者",
      description: "EC2・S3・VPC・IAM などの基本操作と設計の入り口を学びます。",
    },
    {
      id: "intermediate",
      name: "中級エンジニア向け",
      description:
        "可用性・セキュリティ設計、コスト最適化、サーバーレス連携を実務レベルで学びます。",
    },
  ];

  var LOAD_FAILED_MESSAGE =
    "必要なファイルの読み込みに失敗しました。ページを再読み込みしてください。";
  var CONFIRM_MESSAGE = "履歴をすべて削除します。よろしいですか?";

  /** 難易度 ID から表示名を返す(未知の ID はそのまま返す) */
  function difficultyName(id) {
    for (var i = 0; i < DIFFICULTIES.length; i++) {
      if (DIFFICULTIES[i].id === id) return DIFFICULTIES[i].name;
    }
    return String(id);
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /**
   * ISO 8601 文字列をローカル時刻の「YYYY/MM/DD HH:mm」に整形する。
   * 解析できない値は空文字を返す。
   */
  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return (
      d.getFullYear() + "/" + pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()) +
      " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes())
    );
  }

  /** 要素を作成してテキストを設定する */
  function el(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** 子要素をすべて取り除く */
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /** 難易度カード 1 枚を組み立てる */
  function buildCard(doc, def, summary, canStart, onStart) {
    var card = el(doc, "article", "card");
    card.appendChild(el(doc, "h2", "card__title", def.name));
    card.appendChild(el(doc, "p", "card__text", def.description));

    if (summary && summary.latest) {
      var latest = summary.latest;
      var list = el(doc, "ul", "card__stats");
      list.appendChild(
        el(doc, "li", "", "前回: " + latest.correct + " / " + latest.total +
          " 問(" + latest.percent + "%)")
      );
      list.appendChild(el(doc, "li", "", "最高正答率: " + summary.bestPercent + "%"));
      list.appendChild(el(doc, "li", "", "挑戦回数: " + summary.attempts + " 回"));
      card.appendChild(list);
    } else {
      card.appendChild(el(doc, "p", "muted", "未挑戦"));
    }

    var button = el(doc, "button", "button", "開始");
    button.type = "button";
    button.setAttribute("aria-label", def.name + "を開始");
    if (!canStart) {
      button.disabled = true;
    } else {
      button.addEventListener("click", function () {
        if (onStart) onStart(def.id);
      });
    }
    card.appendChild(button);
    return card;
  }

  /** 履歴エリアを組み立てる */
  function buildHistory(doc, opts, handlers, confirmFn) {
    var area = doc.getElementById("history-area");
    if (!area) return;
    clear(area);

    area.appendChild(el(doc, "h2", "", "直近の履歴"));

    if (opts.historyStatus === "unavailable") {
      area.appendChild(el(doc, "p", "muted", "履歴を利用できません"));
      return;
    }

    var recent = Array.isArray(opts.recent) ? opts.recent.slice(0, 10) : [];
    if (recent.length === 0) {
      area.appendChild(el(doc, "p", "muted", "履歴はまだありません。"));
      return;
    }

    var list = el(doc, "ul", "history-list");
    list.style.listStyle = "none";
    list.style.padding = "0";
    recent.forEach(function (r) {
      var text =
        difficultyName(r.difficulty) + " / " + formatDateTime(r.playedAt) +
        " / " + r.correct + " / " + r.total + " 問(" + r.percent + "%)";
      list.appendChild(el(doc, "li", "history-item", text));
    });
    area.appendChild(list);

    var clearButton = el(doc, "button", "button button--secondary", "履歴を削除");
    clearButton.type = "button";
    clearButton.addEventListener("click", function () {
      // 承認時のみ削除を実行し、キャンセル時は何もしない(要件 8.10)
      if (confirmFn(CONFIRM_MESSAGE) && handlers.onClearHistory) {
        handlers.onClearHistory();
      }
    });
    area.appendChild(clearButton);
  }

  /** エラー表示領域を更新する(なければ空にする) */
  function buildAlert(doc, opts) {
    var alertEl = doc.getElementById("app-alert");
    if (!alertEl) return;
    clear(alertEl);
    var messages = Array.isArray(opts.errors) ? opts.errors.slice() : [];
    if (opts.loadFailed && messages.length === 0) messages.push(LOAD_FAILED_MESSAGE);
    messages.forEach(function (m) {
      alertEl.appendChild(el(doc, "p", "", m));
    });
  }

  /**
   * Top 画面を描画する。再描画しても重複しないよう毎回作り直す。
   * @param {object} opts 仕様は呼び出し側(main.js)との契約に従う
   */
  function render(opts) {
    opts = opts || {};
    var doc = opts.doc || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    var handlers = opts.handlers || {};
    var confirmFn =
      opts.confirmFn ||
      function (message) {
        return typeof window !== "undefined" ? window.confirm(message) : false;
      };
    var startable = opts.startable || {};
    var summaries = opts.summaries || {};

    var listEl = doc.getElementById("difficulty-list");
    if (listEl) {
      clear(listEl);
      DIFFICULTIES.forEach(function (def) {
        var canStart = startable[def.id] === true && !opts.loadFailed;
        listEl.appendChild(
          buildCard(doc, def, summaries[def.id] || null, canStart, handlers.onStart)
        );
      });
    }

    buildHistory(doc, opts, handlers, confirmFn);
    buildAlert(doc, opts);
  }

  return {
    DIFFICULTIES: DIFFICULTIES,
    render: render,
    formatDateTime: formatDateTime,
  };
});
