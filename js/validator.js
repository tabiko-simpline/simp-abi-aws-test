/**
 * validator.js
 * 問題データの検証ロジック(純粋関数)。
 * ブラウザでは window.QuizApp.validator、Node では module.exports として公開する(UMD 風)。
 * 要件: 3.5, 4.1, 4.7, 9.1, 9.2, 9.4, 9.5, 9.6, 9.14, 9.15
 */
(function (root) {
  "use strict";

  /** 難易度の識別子一覧 */
  var DIFFICULTIES = ["beginner", "basic", "intermediate"];

  /** 各難易度で開始に必要な問題数 */
  var REQUIRED_COUNT = 30;

  var TEXT_MAX = 300;
  var CHOICE_MAX = 100;
  var CHOICE_COUNT = 4;
  var EXPLANATION_MAX = 1000;

  /** 値がプレーンなオブジェクト(null・配列を除く)か */
  function isObject(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  /** 値が空でない文字列か */
  function isNonEmptyString(v) {
    return typeof v === "string" && v.length > 0;
  }

  /** ValidationIssue を生成する */
  function issue(questionId, rule, message) {
    return { questionId: questionId, rule: rule, message: message };
  }

  /**
   * 個別の問題を検証し、違反を ValidationIssue[] として返す。
   * 不正な型が渡されても例外を投げない。
   * @param {unknown} q
   * @returns {Array<{questionId: (string|null), rule: string, message: string}>}
   */
  function validateQuestion(q) {
    var issues = [];
    try {
      if (!isObject(q)) {
        issues.push(issue(null, "question-type", "問題がオブジェクトではありません。"));
        return issues;
      }

      var qid = isNonEmptyString(q.id) ? q.id : null;
      var add = function (rule, message) {
        issues.push(issue(qid, rule, message));
      };

      // 1. id
      if (!isNonEmptyString(q.id)) {
        add("id", "id が空、または文字列ではありません。");
      }

      // 2. difficulty
      if (DIFFICULTIES.indexOf(q.difficulty) === -1) {
        add("difficulty", "difficulty が beginner / basic / intermediate のいずれでもありません。");
      }

      // 3. text
      if (typeof q.text !== "string" || q.text.length < 1 || q.text.length > TEXT_MAX) {
        add("text", "問題文は 1〜" + TEXT_MAX + " 文字の文字列である必要があります。");
      }

      // 4. choices
      var choicesOk = Array.isArray(q.choices) && q.choices.length === CHOICE_COUNT;
      if (!choicesOk) {
        add("choices-length", "選択肢は " + CHOICE_COUNT + " 個の配列である必要があります。");
      } else {
        var seen = {};
        var hasDuplicate = false;
        var hasBadLength = false;
        for (var i = 0; i < q.choices.length; i++) {
          var c = q.choices[i];
          if (typeof c !== "string" || c.length < 1 || c.length > CHOICE_MAX) {
            hasBadLength = true;
            continue;
          }
          var key = c.trim();
          if (Object.prototype.hasOwnProperty.call(seen, key)) {
            hasDuplicate = true;
          }
          seen[key] = true;
        }
        if (hasBadLength) {
          add("choice-text", "各選択肢は 1〜" + CHOICE_MAX + " 文字の文字列である必要があります。");
        }
        if (hasDuplicate) {
          add("choices-unique", "選択肢が trim 後に重複しています。");
        }
      }

      // 5. answerIndex
      var answerOk =
        typeof q.answerIndex === "number" &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 &&
        q.answerIndex <= 3;
      if (!answerOk) {
        add("answerIndex", "answerIndex は 0〜3 の整数である必要があります。");
      }

      // 6, 7. explanation
      var ex = q.explanation;
      if (!isObject(ex)) {
        add("explanation", "explanation がオブジェクトではありません。");
      } else {
        var total = 0;
        var explanationOk = true;

        if (!isNonEmptyString(ex.correct)) {
          add("explanation-correct", "explanation.correct が空、または文字列ではありません。");
          explanationOk = false;
        } else {
          total += ex.correct.length;
        }

        if (!isObject(ex.incorrect)) {
          add("explanation-incorrect", "explanation.incorrect がオブジェクトではありません。");
          explanationOk = false;
        } else if (answerOk) {
          // 正解以外の 3 インデックスを文字列キーで必須とする
          for (var k = 0; k < CHOICE_COUNT; k++) {
            if (k === q.answerIndex) continue;
            var v = ex.incorrect[String(k)];
            if (!isNonEmptyString(v)) {
              add(
                "explanation-incorrect",
                "explanation.incorrect[\"" + k + "\"] が欠落、または空です。"
              );
              explanationOk = false;
            } else {
              total += v.length;
            }
          }
        } else {
          // answerIndex 不正時は正解以外を特定できないため、検査を省略する
          explanationOk = false;
        }

        // 解説合計(正解理由 + 誤り理由 3 件)
        if (explanationOk && (total < 1 || total > EXPLANATION_MAX)) {
          add("explanation-length", "解説の合計は 1〜" + EXPLANATION_MAX + " 文字である必要があります。");
        }
      }
    } catch (e) {
      issues.push(issue(null, "exception", "検証中に予期しないエラーが発生しました。"));
    }
    return issues;
  }

  /**
   * 問題バンク全体を検証する。
   * - 個別検証を通過した問題のみを validQuestions にする
   * - ID の一意性、同一 Difficulty 内の問題文重複(trim 後比較)を検査し、後出を除外する
   * - 難易度別件数と、ちょうど 30 問のときのみ true になる startable を返す
   * raw が不正でも例外を投げない。
   * @param {unknown} raw 配列、または { questions: [...] } 形式
   */
  function validateQuestionBank(raw) {
    var result = {
      validQuestions: [],
      issues: [],
      countsByDifficulty: { beginner: 0, basic: 0, intermediate: 0 },
      startable: { beginner: false, basic: false, intermediate: false }
    };

    try {
      var list = null;
      if (Array.isArray(raw)) {
        list = raw;
      } else if (isObject(raw) && Array.isArray(raw.questions)) {
        list = raw.questions;
      }

      if (list === null) {
        result.issues.push(
          issue(null, "bank-type", "問題データが配列、または questions 配列を持つオブジェクトではありません。")
        );
      } else {
        var seenIds = {};
        var seenTexts = {}; // difficulty -> { trim 後の問題文: true }

        for (var i = 0; i < list.length; i++) {
          var q = list[i];
          var qIssues = validateQuestion(q);
          if (qIssues.length > 0) {
            for (var a = 0; a < qIssues.length; a++) result.issues.push(qIssues[a]);
            continue;
          }

          // ID の一意性(後出を除外)
          if (Object.prototype.hasOwnProperty.call(seenIds, q.id)) {
            result.issues.push(issue(q.id, "id-unique", "id が重複しています。後出の問題を除外しました。"));
            continue;
          }

          // 同一 Difficulty 内の問題文重複(trim 後比較、後出を除外)
          var textKey = q.text.trim();
          var bucket = seenTexts[q.difficulty] || (seenTexts[q.difficulty] = {});
          if (Object.prototype.hasOwnProperty.call(bucket, textKey)) {
            result.issues.push(
              issue(q.id, "text-unique", "同一難易度内で問題文が重複しています。後出の問題を除外しました。")
            );
            continue;
          }

          seenIds[q.id] = true;
          bucket[textKey] = true;
          result.validQuestions.push(q);
          result.countsByDifficulty[q.difficulty] += 1;
        }
      }
    } catch (e) {
      result.issues.push(issue(null, "exception", "問題データの検証中に予期しないエラーが発生しました。"));
    }

    for (var d = 0; d < DIFFICULTIES.length; d++) {
      var name = DIFFICULTIES[d];
      result.startable[name] = result.countsByDifficulty[name] === REQUIRED_COUNT;
    }
    return result;
  }

  var api = {
    DIFFICULTIES: DIFFICULTIES,
    REQUIRED_COUNT: REQUIRED_COUNT,
    validateQuestion: validateQuestion,
    validateQuestionBank: validateQuestionBank
  };

  // ブラウザ: window.QuizApp.validator に公開
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.validator = api;
  }
  // Node: module.exports に公開
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : undefined);
