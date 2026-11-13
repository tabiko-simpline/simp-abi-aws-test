# AWS クイズ アプリ

社内研修用の AWS クイズ Web アプリケーションです。HTML / CSS / JavaScript のみで構成された静的サイトで、ビルド工程なしでそのまま動作します。

## アプリ概要

- 3 つの難易度(AWS初心者 / 基礎だけわかる初級者 / 中級エンジニア向け)を用意しています。
- 各難易度 30 問、合計 90 問の 4 択問題です。
- 解答するとすぐに正誤が表示され、正解の理由と、誤りの選択肢それぞれの理由を解説します。
- 結果画面で正答数・正答率・評価コメントを確認でき、間違えた問題だけを出題する復習ができます。
- 挑戦結果はブラウザの localStorage に履歴として保存され、難易度ごとの前回・最高・挑戦回数と直近 10 件を確認できます。
- 外部通信(CDN、Web フォント、外部 API)は一切使いません。

## ローカルでの開き方(file://)

1. このリポジトリをダウンロードまたは clone します。
2. ルート直下の `index.html` をブラウザで開きます(ダブルクリック、またはブラウザへドラッグ&ドロップ)。

ビルドは不要です。`npm install` も不要です。問題データも通常の `<script>` で読み込むため、`file://` で開いても同じように動作します。

## GitHub Pages への配置手順

リポジトリのルートをそのまま公開ルートにします。

1. このリポジトリを GitHub に push します。
2. GitHub のリポジトリで **Settings > Pages** を開きます。
3. **Build and deployment** の Source で **Deploy from a branch** を選びます。
4. **Branch** に公開したいブランチ(例: `main`)、フォルダに `/ (root)` を選んで **Save** します。
5. 数分後、表示された URL(`https://<ユーザー名>.github.io/<リポジトリ名>/`)にアクセスします。

すべての参照は `./` 起点の相対パスなので、サブパス配下でも動作します。

## ファイル構成

```text
/ (リポジトリルート = GitHub Pages 公開ルート)
├── index.html                 # 単一ページ(3 画面を section で切り替え)
├── css/
│   ├── tokens.css             # 配色トークン、サイズ変数
│   ├── base.css               # リセット、タイポグラフィ、フォーカス表示
│   └── components.css         # ボタン、選択肢、カード、メディアクエリ
├── data/
│   ├── questions.js           # window.QUIZ_DATA の初期化
│   ├── questions-beginner.js  # 初級(AWS初心者)30 問
│   ├── questions-basic.js     # 基礎 30 問
│   └── questions-intermediate.js # 中級 30 問
├── js/
│   ├── validator.js           # 問題データの検証
│   ├── scoring.js             # 採点・評価コメント・整形
│   ├── session.js             # 出題セッション・復習セッションの状態遷移
│   ├── storage.js             # localStorage ラッパ
│   ├── history.js             # 履歴の生成・集計・直列化
│   ├── ui/
│   │   ├── focus.js           # 画面切替時のフォーカス移動
│   │   ├── top-screen.js      # トップ画面
│   │   ├── quiz-screen.js     # 出題画面
│   │   └── result-screen.js   # 結果画面
│   └── main.js                # 起動・イベント配線
├── tests/                     # 開発時のみ使用(Vitest)
│   ├── unit/
│   │   └── questions-data.test.js
│   └── property/
├── package.json               # テスト専用の devDependencies
├── package-lock.json
├── vitest.config.js           # Vitest 設定
└── README.md
```

`package.json`、`package-lock.json`、`vitest.config.js`、`tests/` は開発者のテスト用です。アプリの実行には不要です。

## 問題データの追加・検証方法

### 追加先

問題は難易度別のファイル `data/questions-beginner.js`、`data/questions-basic.js`、`data/questions-intermediate.js` にあります。各ファイルは `window.QUIZ_DATA.questions.push(...)` で問題を追記します。`data/questions.js` は `window.QUIZ_DATA` を初期化するだけなので、問題は書きません。新しいデータファイルを増やす場合は、`index.html` に `<script src="./data/...">` を `data/questions.js` の後に追加してください。

### スキーマ

```js
{
  id: "beginner-001",          // 全体で一意な非空文字列(<難易度>-<3桁連番>)
  difficulty: "beginner",      // "beginner" | "basic" | "intermediate"
  text: "問題文",               // 1〜300 文字。同一難易度内で重複不可
  choices: ["A", "B", "C", "D"], // 4 要素、各 1〜100 文字、trim() 後に相互に異なる
  answerIndex: 0,              // 正解の位置(0〜3 の整数)
  explanation: {
    correct: "正解の理由",
    incorrect: {               // 正解以外の 3 インデックスをキーにする
      "1": "誤りの理由",
      "2": "誤りの理由",
      "3": "誤りの理由"
    }
  }
}
```

- 解説全体(正解理由 + 誤り理由 3 件の合計)は 1〜1,000 文字です。
- 各難易度はちょうど 30 問必要です。30 問に満たない難易度は開始できません。
- 各難易度内で `answerIndex` の 0〜3 がそれぞれ 4〜11 問になるようにしてください。
- オリジナル問題とし、公式試験問題の転載はしないでください。
- `...`、`以下同様`、`TODO`、`ダミー` などのプレースホルダーは使えません。

### 検証

- `js/validator.js` の `validateQuestion`(1 問の検証)と `validateQuestionBank`(ID の一意性、問題文の重複、難易度ごとの件数)が検証ルールを実装しています。アプリは起動時にこの検証を実行し、不正な問題を除外します。
- `tests/unit/questions-data.test.js` が実データ(`data/*.js`)を `index.html` と同じ順序で読み込み、各難易度 30 問・全問がスキーマに適合・プレースホルダーなし・正解位置の偏りなしを検査します。問題を追加・変更したら `npm test` で確認してください。

## テストの実行方法(開発時のみ)

テストは開発者向けで、アプリの利用には不要です。Node.js 22.22 以上が必要です。

```bash
npm install
npm test
```

`npm test` は `vitest --run` を実行します。テストツール(Vitest、fast-check、jsdom)は `devDependencies` にあり、配信物には含まれません。

## 手動確認項目

自動テストでは確認できない項目です。リリース前に手動で確認してください。

- ブラウザ: Chrome / Edge / Firefox / Safari の最新版で、`file://` の直接起動と GitHub Pages 上の動作を比較する。
- 画面幅: 320 / 375 / 767 / 768 / 1280px で表示を確認する。横スクロールが出ないこと、767px と 768px でレイアウトが切り替わることを見る。
- キーボード操作: Tab / Shift+Tab / Enter / Space だけで最後まで操作でき、フォーカスが見えること。
- スクリーンリーダー: NVDA などで、判定と解説が読み上げられ、画面切替後に見出しへフォーカスが移ること。
- 問題内容: 難易度の範囲、オリジナル性、技術的な正確性をレビューする。

## アクセシビリティ(WCAG)に関する注意

本アプリはアクセシビリティに配慮して作られていますが、WCAG への適合を完全に検証するには、支援技術を用いた手動テストと専門家によるレビューが必要です。自動テストだけでは適合を保証できません。
