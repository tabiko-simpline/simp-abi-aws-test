/* storage.js: localStorage ラッパ。
 * localStorage へのアクセスで発生する例外(プライベートモード、容量超過、
 * アクセス拒否、プロパティ参照時の例外)をすべて捕捉し、{ ok: false, error } として返す。
 * テスト時に差し替えられるよう、グローバルの localStorage は呼び出しのたびに参照する。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QuizApp = root.QuizApp || {};
    root.QuizApp.storage = api;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  // エラーを文字列メッセージに変換する
  function toMessage(e) {
    if (e && typeof e.message === 'string' && e.message) return e.message;
    if (e && typeof e.name === 'string' && e.name) return e.name;
    return 'storage error';
  }

  // localStorage を毎回参照して取得する(参照自体が例外を投げる場合は呼び出し側で捕捉)
  function getStore() {
    var store = root.localStorage;
    if (!store) {
      throw new Error('localStorage is not available');
    }
    return store;
  }

  // localStorage への書き込み/削除を試行して利用可否を判定する
  function isAvailable() {
    try {
      var store = getStore();
      var probeKey = '__aws-quiz-app:probe__';
      store.setItem(probeKey, '1');
      store.removeItem(probeKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 値を読み込む。キーが存在しない場合は value: null
  function read(key) {
    try {
      var value = getStore().getItem(key);
      return { ok: true, value: value === undefined ? null : value };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  }

  // 値を書き込む
  function write(key, value) {
    try {
      getStore().setItem(key, value);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  }

  // 値を削除する
  function remove(key) {
    try {
      getStore().removeItem(key);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: toMessage(e) };
    }
  }

  return { isAvailable: isAvailable, read: read, write: write, remove: remove };
});
