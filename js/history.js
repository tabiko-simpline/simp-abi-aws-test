/* history.js: 履歴レコードの生成・検証・集計・直列化と、localStorage への保存。
 * 純粋ロジック(createRecord / serialize / parse / summarize / recent)と、
 * storage.js 経由の入出力(load / append / clear)で構成する。
 * storage.js は呼び出し時に遅延解決する(読み込み順やテスト時の差し替えに対応)。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.history = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  /** localStorage のキー */
  var STORAGE_KEY = 'aws-quiz-app:history:v1';

  /** 保存形式のバージョン */
  var VERSION = 1;

  /** 難易度の識別子一覧 */
  var DIFFICULTIES = ['beginner', 'basic', 'intermediate'];

  /** ミリ秒精度の UTC ISO 8601 形式(Date#toISOString の出力形式) */
  var ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  // storage.js を遅延解決する
  function getStorage() {
    if (root && root.QuizApp && root.QuizApp.storage) {
      return root.QuizApp.storage;
    }
    if (typeof require === 'function') {
      try {
        return require('./storage');
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // 実施日時が ISO 8601(ミリ秒精度)として妥当か判定する(存在しない日付も不正)
  function isValidPlayedAt(s) {
    if (typeof s !== 'string' || !ISO_PATTERN.test(s)) return false;
    var t = Date.parse(s);
    if (isNaN(t)) return false;
    return new Date(t).toISOString() === s;
  }

  // 値と型・範囲を検証し、キー順を正規化したレコードを返す。無効なら null
  function normalizeRecord(r) {
    if (r === null || typeof r !== 'object' || Array.isArray(r)) return null;
    if (DIFFICULTIES.indexOf(r.difficulty) === -1) return null;
    if (!isValidPlayedAt(r.playedAt)) return null;
    if (typeof r.correct !== 'number' || !isFinite(r.correct) || Math.floor(r.correct) !== r.correct) return null;
    if (typeof r.total !== 'number' || !isFinite(r.total) || Math.floor(r.total) !== r.total) return null;
    if (r.total < 1 || r.correct < 0 || r.correct > r.total) return null;
    if (typeof r.percent !== 'number' || !isFinite(r.percent)) return null;
    if (r.percent < 0 || r.percent > 100) return null;
    // キー順を固定(ラウンドトリップ等価性のため)
    return {
      difficulty: r.difficulty,
      playedAt: r.playedAt,
      correct: r.correct,
      total: r.total,
      percent: r.percent
    };
  }

  /** 履歴レコードを生成する(要件 8.1) */
  function createRecord(difficulty, correct, total, now) {
    var date = now === undefined ? new Date() : now;
    return {
      difficulty: difficulty,
      playedAt: date.toISOString(),
      correct: correct,
      total: total,
      percent: Math.round(correct / total * 1000) / 10
    };
  }

  /** レコード配列を保存用 JSON 文字列にする。キー順は正規化する */
  function serialize(records) {
    var list = [];
    var src = Array.isArray(records) ? records : [];
    for (var i = 0; i < src.length; i++) {
      var r = src[i];
      list.push({
        difficulty: r.difficulty,
        playedAt: r.playedAt,
        correct: r.correct,
        total: r.total,
        percent: r.percent
      });
    }
    return JSON.stringify({ version: VERSION, records: list });
  }

  /** JSON 文字列を解析し、有効なレコードのみ返す。例外は投げない(要件 8.9) */
  function parse(text) {
    try {
      if (typeof text !== 'string') return [];
      var data = JSON.parse(text);
      if (data === null || typeof data !== 'object' || Array.isArray(data)) return [];
      if (!Array.isArray(data.records)) return [];
      var result = [];
      for (var i = 0; i < data.records.length; i++) {
        var rec = normalizeRecord(data.records[i]);
        if (rec) result.push(rec);
      }
      return result;
    } catch (e) {
      return [];
    }
  }

  /** 難易度別の集計(前回=playedAt 最大、最高正答率、挑戦回数)。記録なしは null */
  function summarize(records) {
    var result = { beginner: null, basic: null, intermediate: null };
    var src = Array.isArray(records) ? records : [];
    for (var i = 0; i < src.length; i++) {
      var r = src[i];
      var cur = result[r.difficulty];
      if (cur === undefined) continue;
      if (cur === null) {
        result[r.difficulty] = { latest: r, bestPercent: r.percent, attempts: 1 };
      } else {
        // 同一日時の場合は後から追加されたものを最新とする
        if (r.playedAt >= cur.latest.playedAt) cur.latest = r;
        if (r.percent > cur.bestPercent) cur.bestPercent = r.percent;
        cur.attempts += 1;
      }
    }
    return result;
  }

  /** 全難易度の直近 limit 件を playedAt の新しい順で返す(要件 8.4) */
  function recent(records, limit) {
    var n = limit === undefined ? 10 : limit;
    var src = Array.isArray(records) ? records.slice() : [];
    // 固定長 UTC ISO 文字列は辞書順が時系列順と一致する
    src.sort(function (a, b) {
      if (a.playedAt < b.playedAt) return 1;
      if (a.playedAt > b.playedAt) return -1;
      return 0;
    });
    return src.slice(0, Math.max(0, n));
  }

  /** 履歴を読み込む。読み取り失敗は unavailable、データ破損は ok + 空配列 */
  function load() {
    var storage = getStorage();
    if (!storage) return { status: 'unavailable', records: [] };
    var res = storage.read(STORAGE_KEY);
    if (!res || !res.ok) return { status: 'unavailable', records: [] };
    if (res.value === null || res.value === undefined) return { status: 'ok', records: [] };
    return { status: 'ok', records: parse(res.value) };
  }

  /** レコードを追加して保存する(load → 追加 → serialize → write) */
  function append(record) {
    var storage = getStorage();
    if (!storage) return { ok: false };
    var loaded = load();
    if (loaded.status !== 'ok') return { ok: false };
    var records = loaded.records.concat([record]);
    var res = storage.write(STORAGE_KEY, serialize(records));
    return { ok: !!(res && res.ok) };
  }

  /** 履歴を全削除する(要件 8.10) */
  function clear() {
    var storage = getStorage();
    if (!storage) return { ok: false };
    var res = storage.remove(STORAGE_KEY);
    return { ok: !!(res && res.ok) };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    createRecord: createRecord,
    serialize: serialize,
    parse: parse,
    summarize: summarize,
    recent: recent,
    load: load,
    append: append,
    clear: clear
  };
});
