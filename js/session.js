/**
 * session.js
 * Session / Review_Session の状態遷移(不変更新の純粋関数)。
 * DOM には依存しない。window.QuizApp.session と module.exports の両方に公開する(UMD 風)。
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.session = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  /**
   * validator を解決する。
   * Node では require('./validator')、ブラウザでは window.QuizApp.validator を使う。
   * 読み込み順に依存しないよう、呼び出し時に遅延解決する。
   */
  function resolveValidator() {
    if (root && root.QuizApp && root.QuizApp.validator) {
      return root.QuizApp.validator;
    }
    if (typeof require === 'function') {
      try {
        return require('./validator');
      } catch (e) {
        // 解決できない場合は下で明示的にエラーにする
      }
    }
    throw new Error('validator が読み込まれていません(js/validator.js を先に読み込んでください)');
  }

  /**
   * Fisher–Yates シャッフル。入力配列は破壊せず、新しい配列を返す。
   * @param {Array} arr 対象配列
   * @param {function(): number} [rng] 0以上1未満の乱数関数(既定は Math.random)
   * @returns {Array}
   */
  function shuffle(arr, rng) {
    var random = typeof rng === 'function' ? rng : Math.random;
    var result = arr.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      // rng が範囲外の値を返しても配列外参照にならないよう丸める
      if (!(j >= 0)) j = 0;
      if (j > i) j = i;
      var tmp = result[i];
      result[i] = result[j];
      result[j] = tmp;
    }
    return result;
  }

  /**
   * 元の問題から、選択肢をシャッフルした出題用の問題を作る。
   * @param {{id:string,text:string,choices:string[],answerIndex:number,explanation:Object}} q
   * @param {function(): number} [rng]
   */
  function presentQuestion(q, rng) {
    var indexed = q.choices.map(function (text, originalIndex) {
      return { text: text, originalIndex: originalIndex };
    });
    var choices = shuffle(indexed, rng);
    var answerDisplayIndex = 0;
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].originalIndex === q.answerIndex) {
        answerDisplayIndex = i;
        break;
      }
    }
    return {
      id: q.id,
      text: q.text,
      choices: choices,
      answerIndex: q.answerIndex, // 元の選択肢順での正解位置(判定に使用)
      answerDisplayIndex: answerDisplayIndex,
      explanation: q.explanation
    };
  }

  /** 新しい初期状態の Session を組み立てる。 */
  function buildState(kind, difficulty, questions) {
    return {
      kind: kind,
      difficulty: difficulty,
      questions: questions,
      currentIndex: 0,
      answers: questions.map(function () { return null; }),
      correctCount: 0,
      finished: false
    };
  }

  /**
   * 通常 Session を生成する。前回 Session の情報は引数に取らないため、常に初期状態になる。
   * 指定難易度の問題を 1 問ずつ再検証し、不正・ID 重複の問題は除外する。
   * 出題可能な問題が 0 件の場合は { error } を返す。
   * @param {Array} bank 問題配列
   * @param {string} difficulty 難易度
   * @param {function(): number} [rng]
   */
  function createSession(bank, difficulty, rng) {
    var validator = resolveValidator();
    var seen = {};
    var valid = [];
    (Array.isArray(bank) ? bank : []).forEach(function (q) {
      if (!q || q.difficulty !== difficulty) return;
      if (validator.validateQuestion(q).length > 0) return;
      if (seen[q.id]) return; // 重複出題を防ぐ
      seen[q.id] = true;
      valid.push(q);
    });
    if (valid.length === 0) {
      return { error: '出題できる問題がありません。問題データを確認してください。' };
    }
    var ordered = shuffle(valid, rng).map(function (q) {
      return presentQuestion(q, rng);
    });
    return buildState('normal', difficulty, ordered);
  }

  /**
   * 現在の問題に解答する。解答済み・終了済み・範囲外の選択は同一 state を返す。
   * 判定は選択肢の originalIndex と answerIndex の比較で行う。元の state は変更しない。
   * @param {Object} state
   * @param {number} displayIndex 表示順の選択肢位置
   */
  function submitAnswer(state, displayIndex) {
    if (!state || state.finished) return state;
    var q = state.questions[state.currentIndex];
    if (!q) return state;
    if (state.answers[state.currentIndex] !== null) return state; // 再選択不可
    if (!Number.isInteger(displayIndex) || displayIndex < 0 || displayIndex >= q.choices.length) {
      return state;
    }
    var isCorrect = q.choices[displayIndex].originalIndex === q.answerIndex;
    var answers = state.answers.slice();
    answers[state.currentIndex] = { selectedDisplayIndex: displayIndex, isCorrect: isCorrect };
    return Object.assign({}, state, {
      answers: answers,
      correctCount: state.correctCount + (isCorrect ? 1 : 0)
    });
  }

  /**
   * 次の問題へ進む。最終問題なら finished = true にする。
   * 現在の問題が未解答、または終了済みの場合は同一 state を返す。
   * @param {Object} state
   */
  function advance(state) {
    if (!state || state.finished) return state;
    if (state.answers[state.currentIndex] === null) return state;
    var isLast = state.currentIndex >= state.questions.length - 1;
    if (isLast) {
      return Object.assign({}, state, { finished: true });
    }
    return Object.assign({}, state, { currentIndex: state.currentIndex + 1 });
  }

  /**
   * 誤答した問題(出題順)を返す。
   * @param {Object} state
   * @returns {Array}
   */
  function wrongQuestions(state) {
    if (!state || !Array.isArray(state.questions)) return [];
    return state.questions.filter(function (q, i) {
      var a = state.answers[i];
      return a !== null && a !== undefined && a.isCorrect === false;
    });
  }

  /**
   * 復習できるか(誤答が 1 問以上あるか)。
   * @param {Object} state
   * @returns {boolean}
   */
  function canReview(state) {
    return wrongQuestions(state).length >= 1;
  }

  /**
   * 直前 Session の誤答のみで Review_Session を生成する。
   * 出題順と選択肢を再シャッフルし、難易度は元を引き継ぐ。誤答 0 件は { error } を返す。
   * @param {Object} prev 直前の Session
   * @param {function(): number} [rng]
   */
  function createReviewSession(prev, rng) {
    var wrong = wrongQuestions(prev);
    if (wrong.length === 0) {
      return { error: '復習対象の問題がありません。' };
    }
    var ordered = shuffle(wrong, rng).map(function (pq) {
      // 表示済みの選択肢を元の順序に戻してから再シャッフルする
      var original = pq.choices.slice().sort(function (a, b) {
        return a.originalIndex - b.originalIndex;
      }).map(function (c) { return c.text; });
      return presentQuestion({
        id: pq.id,
        text: pq.text,
        choices: original,
        answerIndex: pq.answerIndex,
        explanation: pq.explanation
      }, rng);
    });
    return buildState('review', prev.difficulty, ordered);
  }

  return {
    shuffle: shuffle,
    createSession: createSession,
    submitAnswer: submitAnswer,
    advance: advance,
    wrongQuestions: wrongQuestions,
    canReview: canReview,
    createReviewSession: createReviewSession
  };
});
