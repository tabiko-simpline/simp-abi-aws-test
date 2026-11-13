/**
 * result-screen.js
 * 結果画面(Result_Screen)の描画。要件: 6.1, 6.2, 6.7, 7.1, 7.4, 7.5, 7.6, 7.7
 * window.QuizApp.resultScreen と module.exports の両方に公開する(UMD 風)。
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.resultScreen = api;
  }
})(typeof window !== 'undefined' ? window : undefined, function (root) {
  'use strict';

  /** 依存モジュールを呼び出し時に解決する(読み込み順・Node 実行の両対応)。 */
  function dep(name) {
    if (root && root.QuizApp && root.QuizApp[name]) {
      return root.QuizApp[name];
    }
    if (typeof require === 'function') {
      return require('../' + name);
    }
    throw new Error(name + ' モジュールが読み込まれていません');
  }

  /** 要素を空にする。 */
  function clear(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  /** 「X / Y 問正解(Z%)」形式の文字列を返す。 */
  function formatScore(score) {
    return score.correct + ' / ' + score.total + ' 問正解(' + score.percentFloor + '%)';
  }

  /** ボタンを生成する。 */
  function makeButton(doc, label, onClick, secondary) {
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = secondary ? 'button button--secondary' : 'button';
    btn.textContent = label;
    btn.addEventListener('click', function () {
      if (typeof onClick === 'function') {
        onClick();
      }
    });
    return btn;
  }

  /**
   * 結果画面を描画する(毎回再構築するため冪等)。
   * @param {object} state finished な SessionState
   * @param {{onTop:Function,onRetry:Function,onReview:Function}} handlers
   * @param {{originalScore?:object, reviewError?:string, doc?:Document}} [opts]
   */
  function render(state, handlers, opts) {
    opts = opts || {};
    handlers = handlers || {};
    var doc = opts.doc || (typeof document !== 'undefined' ? document : null);
    var scoring = dep('scoring');
    var session = dep('session');

    var heading = doc.getElementById('result-heading');
    var scoreEl = doc.getElementById('result-score');
    var commentEl = doc.getElementById('result-comment');
    var messageEl = doc.getElementById('result-message');
    var actionsEl = doc.getElementById('result-actions');
    var alertEl = doc.getElementById('app-alert');

    var isReview = state.kind === 'review';
    var score = scoring.calcScore(state.correctCount, state.questions.length);

    // 見出し(復習結果は別見出し)
    heading.textContent = isReview ? '復習結果' : '結果発表';

    // スコア(切り捨て正答率)
    clear(scoreEl);
    var scoreLine = doc.createElement('p');
    scoreLine.className = 'score';
    scoreLine.textContent = formatScore(score);
    scoreEl.appendChild(scoreLine);

    // 復習結果では元のクイズのスコアを別行で表示する(要件 7.4)
    if (isReview && opts.originalScore) {
      var orig = opts.originalScore;
      var origLine = doc.createElement('p');
      origLine.className = 'muted';
      origLine.textContent =
        '元のクイズ: ' + orig.correct + ' / ' + orig.total + ' 問(' + orig.percentFloor + '%)';
      scoreEl.appendChild(origLine);
    }

    // 評価コメント(1 件のみ)
    commentEl.textContent = scoring.evaluationComment(scoring.evaluationTier(score.percentFloor));

    // 全問正解メッセージ(復習ボタンなしの場合)
    clear(messageEl);
    var reviewable = session.canReview(state);
    if (!reviewable) {
      var msg = doc.createElement('p');
      msg.textContent = '全問正解です!';
      messageEl.appendChild(msg);
    }

    // 操作ボタン
    clear(actionsEl);
    if (reviewable) {
      actionsEl.appendChild(makeButton(doc, '間違えた問題だけ復習する', handlers.onReview, false));
    }
    actionsEl.appendChild(makeButton(doc, '同じ難易度でもう一度挑戦する', handlers.onRetry, false));
    actionsEl.appendChild(makeButton(doc, 'トップへ戻る', handlers.onTop, true));

    // 復習開始失敗のエラー表示(結果表示は維持。なければ #app-alert には触れない)
    if (opts.reviewError && alertEl) {
      alertEl.textContent = opts.reviewError;
    }
  }

  return { render: render };
});
