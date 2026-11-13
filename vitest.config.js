// Vitest 設定(開発時のテスト専用。配信物・実行時には使用しない)
// package.json に "type": "module" を付けない(純粋ロジックを require で読むため)ので CommonJS 形式で記述する
module.exports = {
  test: {
    // テスト対象は tests 配下のみ
    include: ["tests/**/*.test.js"],
    // 既定は Node 環境(純粋ロジックのテスト用)
    // DOM テストは、テストファイル先頭に次のコメントを書くと jsdom 環境で実行される:
    //   // @vitest-environment jsdom
    environment: "node",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/"
      }
    },
    // テストファイルが無い段階(.gitkeep のみ)でも失敗させない
    passWithNoTests: true
  }
};
