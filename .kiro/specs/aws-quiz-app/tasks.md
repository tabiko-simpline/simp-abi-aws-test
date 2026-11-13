# Implementation Plan: AWS クイズアプリ (aws-quiz-app)

## Overview

設計書で定義した静的サイト構成(HTML / CSS / JavaScript のみ、ビルド不要、`file://` 対応)を、素の JavaScript(IIFE + `window.QuizApp` 名前空間、Node 実行時は `module.exports` も公開する UMD 風)で実装する。実装順は、プロジェクト基盤 → 純粋ロジック(validator / scoring / session / storage / history) → 問題データ 90 問 → UI 層 → 配線 → 静的構成・配色の検査、とする。純粋ロジックには Vitest + fast-check のプロパティベーステストを設計書の Property 1〜14 に対応させて付与する。

実装言語は設計書で JavaScript と明記されているため、言語の確認は不要である。コードコメントは日本語で記述する。

## Tasks

- [x] 1. プロジェクト基盤の構築
  - [x] 1.1 テスト環境の設定ファイルを作成する
    - `package.json` を作成し、`vitest`、`fast-check`、`jsdom` を `devDependencies` にのみ置く(バージョンは `^` や `~` を使わず固定)
    - `vitest.config.js` を作成し、`tests/**` を対象にする(DOM テストは `jsdom` 環境)
    - `tests/unit/`、`tests/property/` ディレクトリを作成する
    - 実行時に `npm install` が不要であることを README の記載方針に残す(配信物には含めない)
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 `index.html` と CSS 3 ファイルの骨格を作成する
    - `index.html`: `<html lang="ja">`、viewport メタタグ(`width=device-width, initial-scale=1`)、Top / Quiz / Result の 3 つの `<section>`、`role="alert"` / `role="status"` 領域、`<script>` を設計書の読み込み順で末尾に配置(`type="module"` は使わない)。パスはすべて `./` 起点の相対パス
    - `css/tokens.css`: ネイビー(色相 200〜240°、明度 35% 以下)とオレンジ(色相 20〜40°、彩度 80% 以上)の配色トークン、サイズ変数
    - `css/base.css`: リセット、システムフォントスタック、`:focus-visible`(幅 3px、背景に対し 3:1 以上)
    - `css/components.css`: ボタン(`min-height: 44px; min-width: 44px`)、選択肢、カード、1 カラム既定 + `@media (min-width: 768px)` で `max-width: 960px` の中央寄せ、`overflow-wrap: anywhere`、`min-width: 0`
    - CDN・Web フォント・外部 API は使用しない
    - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 10.3, 10.7_

- [x] 2. 問題データ検証ロジック(validator.js)
  - [x] 2.1 `js/validator.js` を実装する
    - `validateQuestion(q)`: id 非空、difficulty 3 値、text 1〜300 文字、choices 長さ 4・各 1〜100 文字・`trim()` 後に相互に異なる、answerIndex 0〜3 の整数、`explanation.correct` 非空、`explanation.incorrect` が正解以外の 3 インデックスをキーに持ち全て非空、解説合計 1〜1,000 文字
    - `validateQuestionBank(raw)`: 個別検証通過分のみ `validQuestions`、ID 一意性、同一 Difficulty 内の問題文重複(`trim()` 後比較、後出を除外し issue 記録)、`countsByDifficulty`、`startable`(件数がちょうど 30 のときのみ true)
    - UMD 風に `window.QuizApp.validator` と `module.exports` の両方へ公開する
    - _Requirements: 3.5, 4.1, 4.7, 9.1, 9.2, 9.4, 9.5, 9.6, 9.14, 9.15_

  - [x]* 2.2 `validateQuestion` のプロパティテストを書く
    - `tests/property/validator-question.property.test.js`
    - **Property 13: 個別問題の検証は仕様どおりに合否を判定する**
    - 文字列長を境界(0, 1, 100, 101, 300, 301)に寄せ、選択肢の重複・個数過不足・範囲外 answerIndex・解説欠落/空文字/超過を混在させる。`numRuns` は 100 以上。タグ: `Feature: aws-quiz-app, Property 13: ...`
    - **Validates: Requirements 4.1, 4.7, 9.2, 9.4, 9.5, 9.15**

  - [x]* 2.3 `validateQuestionBank` のプロパティテストを書く
    - `tests/property/validator-bank.property.test.js`
    - **Property 14: バンクレベルの検証は不正問題を除外し 30 問未満の難易度を開始不可にする**
    - 有効・無効混在の問題集合、問題文重複を生成。`numRuns` は 100 以上
    - **Validates: Requirements 3.5, 4.7, 9.6, 9.14**

- [x] 3. 採点ロジック(scoring.js)
  - [x] 3.1 `js/scoring.js` を実装する
    - `calcScore(correct, total)`: `percentFloor = Math.floor(correct / total * 100)`、`percentRounded1 = Math.round(correct / total * 1000) / 10`、`total = 0` は防御的に 0 を返す
    - `evaluationTier(percentFloor)`: 90〜100 → top、70〜89 → high、50〜69 → mid、0〜49 → review
    - `evaluationComment(tier)`: 4 区分の日本語コメント
    - `formatProgress(n, m)`: 「第 N / M 問」、`formatCorrectCount(x)`: 「正答数: X」
    - _Requirements: 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.1_

  - [x]* 3.2 `calcScore` のプロパティテストを書く
    - `tests/property/scoring-score.property.test.js`
    - **Property 6: 正答率は切り捨てで計算され履歴用は小数第1位に丸められる**
    - total ≥ 1、0 ≤ correct ≤ total の整数を生成。`numRuns` は 100 以上
    - **Validates: Requirements 6.1, 8.1**

  - [x]* 3.3 `evaluationTier` のプロパティテストを書く
    - `tests/property/scoring-tier.property.test.js`
    - **Property 7: 評価コメントの区分は正答率に対してちょうど 1 つ決まる**
    - 0〜100 の整数を生成し、境界(90, 70, 50)の切り替えも検証。`numRuns` は 100 以上
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.6**

  - [x]* 3.4 scoring の例示ユニットテストを書く
    - `tests/unit/scoring.test.js`
    - 評価区分の代表値(100, 90, 89, 70, 69, 50, 49, 0)と評価コメント文言、`formatProgress` / `formatCorrectCount` の出力形式
    - _Requirements: 4.2, 4.3, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 4. セッション管理(session.js)
  - [x] 4.1 `js/session.js` を実装する
    - `shuffle(arr, rng = Math.random)`: Fisher–Yates、入力を破壊しない
    - `createSession(bank, difficulty, rng)`: 指定難易度の全問を重複なく取得し、出題順と各問題の選択肢をシャッフル。`originalIndex` と `answerDisplayIndex` を保持。`currentIndex = 0`、`correctCount = 0`、全 `answers` が null、`finished = false`。Session 生成時にも 1 問ごとに再検証する
    - `submitAnswer(state, displayIndex)`: 解答済みなら同一 state を返す(再選択不可)。判定は `originalIndex` と `answerIndex` の比較
    - `advance(state)`、`wrongQuestions(state)`、`canReview(state)`
    - `createReviewSession(prev, rng)`: 誤答問題のみで構成。誤答 0 件は `{ error }` を返す
    - UMD 風に `window.QuizApp.session` と `module.exports` へ公開する
    - _Requirements: 3.3, 3.4, 3.6, 4.5, 4.6, 4.7, 5.1, 5.5, 6.8, 6.9, 7.1, 7.2, 7.3, 7.5, 7.6, 7.7_

  - [x]* 4.2 Property 1 のプロパティテストを書く
    - `tests/property/session-coverage.property.test.js`
    - **Property 1: Session は対象難易度の全問を重複なく出題する**
    - **Validates: Requirements 3.3**

  - [x]* 4.3 Property 2 のプロパティテストを書く
    - `tests/property/session-reset.property.test.js`
    - **Property 2: 新規 Session は常に初期状態から始まる**
    - 任意の回答履歴・得点を持つ先行 Session を生成する
    - **Validates: Requirements 3.6, 6.8, 6.9**

  - [x]* 4.4 Property 3 のプロパティテストを書く
    - `tests/property/session-judgement.property.test.js`
    - **Property 3: 判定は表示順に依存せず正解インデックスに従う**
    - 注入した `rng` でシャッフル結果を変え、任意の表示インデックスで判定を検証
    - **Validates: Requirements 4.6, 5.1**

  - [x]* 4.5 Property 4 のプロパティテストを書く
    - `tests/property/session-lock.property.test.js`
    - **Property 4: 解答の確定後は再選択しても状態が変わらない**
    - 長さ 1 以上の選択操作列を生成し、2 回目以降で `answers` / `correctCount` が変わらないことを検証
    - **Validates: Requirements 4.5, 5.5**

  - [x]* 4.6 Property 5 のプロパティテストを書く
    - `tests/property/session-progress.property.test.js`
    - **Property 5: 進捗・正答数の整形が仕様形式に一致し範囲に収まる**
    - 1 ≤ N ≤ M で `formatProgress(N, M)` の形式を検証し、Session 進行中の各問題表示時に `correctCount` が 0 以上 N−1 以下であることを検証
    - **Validates: Requirements 4.2, 4.3**

  - [x]* 4.7 Property 8 のプロパティテストを書く
    - `tests/property/session-can-review.property.test.js`
    - **Property 8: 復習ボタンの表示可否は誤答の有無と一致する**
    - 通常・復習いずれの完了済み Session も対象にする
    - **Validates: Requirements 7.1, 7.5, 7.6**

  - [x]* 4.8 Property 9 のプロパティテストを書く
    - `tests/property/session-review.property.test.js`
    - **Property 9: Review_Session は直前の誤答のみで構成される**
    - 出題 ID 集合が誤答 ID 集合と等しく、出題数 M が誤答数と一致することを検証
    - **Validates: Requirements 7.2, 7.3, 7.5**

- [x] 5. 永続化と履歴(storage.js / history.js)
  - [x] 5.1 `js/storage.js` を実装する
    - `isAvailable()`、`read(key)`、`write(key, value)`、`remove(key)`
    - `localStorage` の例外(プライベートモード、容量超過、アクセス拒否)をすべて捕捉し `{ ok: false, error }` として返す
    - _Requirements: 8.6, 8.8_

  - [x] 5.2 `js/history.js` を実装する
    - `createRecord(difficulty, correct, total, now)`: ISO 8601(ミリ秒精度)の `playedAt`、`percent` は小数第 1 位に四捨五入
    - `serialize(records)`: `{ "version": 1, "records": [...] }` の JSON 文字列
    - `parse(text)`: 例外を投げず、JSON 解析失敗・構造不正は空配列、レコード単位で必須項目欠落・型不正・範囲外(`correct > total`、`total < 1`、`percent` が 0〜100 外、`playedAt` 不正)を除外
    - `summarize(records)`(`latest` / `bestPercent` / `attempts`、記録なしは `null`)、`recent(records, 10)`(新しい順)
    - `load()` / `append(record)` / `clear()`(キー `aws-quiz-app:history:v1`)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x]* 5.3 Property 10 のプロパティテストを書く
    - `tests/property/history-record.property.test.js`
    - **Property 10: 履歴レコードは必須項目と値域を満たし、集計は定義どおりになる**
    - 重複日時や空の Difficulty を含む履歴列を生成。`recent` の長さ 10 以下・`playedAt` 降順も検証
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

  - [x]* 5.4 Property 11 のプロパティテストを書く
    - `tests/property/history-roundtrip.property.test.js`
    - **Property 11: 履歴のシリアライズはラウンドトリップで等価になる**
    - `serialize → parse → serialize` の等価性と `parse(serialize(x))` が `x` と等価であることを検証
    - **Validates: Requirements 8.6, 8.7**

  - [x]* 5.5 Property 12 のプロパティテストを書く
    - `tests/property/history-corrupt.property.test.js`
    - **Property 12: 破損した履歴データは例外を起こさず無効なレコードを含まない**
    - 任意文字列、`fc.json()`、有効レコードに欠落/型不正を注入したものを生成
    - **Validates: Requirements 8.9**

- [x] 6. Checkpoint - ロジック層の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 問題データ(90 問)の作成
  - [x] 7.1 `data/questions.js` の初期化と問題データ追記方式を作成する
    - `window.QUIZ_DATA = { version: 1, questions: [] };` のみを定義する
    - 難易度別ファイルが同一ファイルへの同時編集とならないよう、問題は `data/questions-beginner.js` / `data/questions-basic.js` / `data/questions-intermediate.js` が `window.QUIZ_DATA.questions.push(...)` で追記する方式にする
    - `index.html` のスクリプト読み込み順を `data/questions.js` → 3 つの難易度別ファイル → `js/validator.js` … の順に更新する(`file://` で動くよう通常の `<script src>` を使う)
    - _Requirements: 1.1, 1.3, 9.12_

  - [x] 7.2 Beginner(AWS初心者)の問題 30 問を省略なしで作成する
    - `data/questions-beginner.js` に `beginner-001` 〜 `beginner-030` の 30 問を実内容で記述する
    - 範囲: クラウドの基本概念と主要サービスの役割。オリジナルの問題文とし、公式試験問題を転載しない
    - 各問: 問題文(1〜300 文字)、選択肢 4 つ(各 1〜100 文字、`trim()` 後に相互に異なる)、`answerIndex`(0〜3)、`explanation.correct` 1 件 + `explanation.incorrect` 3 件(正解以外のインデックスをキー)、解説合計 1〜1,000 文字
    - `answerIndex` の 0〜3 を各 4〜11 問に分布させる。問題文は重複させない
    - プレースホルダー、ダミー、`...`、`以下同様`、`TODO` を含めない
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.10, 9.11_

  - [x] 7.3 Basic(基礎だけわかる初級者)の問題 30 問を省略なしで作成する
    - `data/questions-basic.js` に `basic-001` 〜 `basic-030` の 30 問を実内容で記述する
    - 範囲: EC2、S3、VPC、IAM などの基本操作と設計の入り口(CLF〜SAA 基礎レベル)
    - 各問の構造・文字数・`answerIndex` 分布・禁止表記は 7.2 と同一の条件を満たす
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.8, 9.10, 9.11_

  - [x] 7.4 Intermediate(中級エンジニア向け)の問題 30 問を省略なしで作成する
    - `data/questions-intermediate.js` に `intermediate-001` 〜 `intermediate-030` の 30 問を実内容で記述する
    - 範囲: 可用性・セキュリティ設計、コスト最適化、サーバーレス連携など(SAA〜SAP 実務レベル)
    - 各問の構造・文字数・`answerIndex` 分布・禁止表記は 7.2 と同一の条件を満たす
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9, 9.10, 9.11_

  - [x] 7.5 実データのスモークテストを書く
    - `tests/unit/questions-data.test.js`
    - 各 Difficulty ちょうど 30 問(合計 90 問)、全問が `validateQuestion` を通過、`validateQuestionBank` の `startable` が全難易度で true
    - プレースホルダー(`...`、`以下同様`、`TODO`、`ダミー`)がないこと、各 Difficulty 内で `answerIndex` 0〜3 が各 4〜11 問であること、ID の一意性
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.11, 9.15_

- [x] 8. UI 層と起動処理
  - [x] 8.1 `js/ui/focus.js` を実装する
    - 画面切替後 500ms 以内に見出し(`tabindex="-1"`)または最初の主要操作要素へ `focus()` を移動する
    - _Requirements: 10.5_

  - [x] 8.2 `js/ui/top-screen.js` を実装する
    - 3 難易度のカード(名称 + 100 文字以内の説明、前回スコア / 最高正答率 / 挑戦回数、記録なしは「未挑戦」)、直近 10 件の履歴(新しい順)
    - 読み込み失敗 / データ不正 / 履歴利用不可のエラー表示、`startable` が false の難易度の開始無効化、履歴削除ボタン(`window.confirm`)
    - 難易度の名称と説明は設計書の表に従う
    - _Requirements: 1.6, 3.1, 3.2, 3.5, 8.2, 8.3, 8.4, 8.5, 8.8, 8.10, 9.13, 9.14_

  - [x] 8.3 `js/ui/quiz-screen.js` を実装する
    - 問題文、`<button>` による 4 選択肢、進捗(「第 N / M 問」)と正答数の表示
    - 判定と解説を `aria-live="polite"` / `role="status"` の領域に判定確定と同期して挿入。正解の強調と不正解の区別を色 + 文字(「✓ 正解」「✗ 不正解」)で表示。選択肢の対応付き解説(正解理由 1 + 誤り理由 3)
    - 解答後は再選択を無効化。解説欠落時は「解説を表示できません」を表示しつつボタンは表示
    - 最終問題では「次の問題へ」を結果表示ボタンに置き換える
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 10.1, 10.4_

  - [x] 8.4 `js/ui/result-screen.js` を実装する
    - Score(正答数と切り捨て正答率)、評価コメント 1 件、トップへ戻る / もう一度挑戦ボタン
    - 誤答 1 問以上なら「間違えた問題だけ復習する」ボタン、全問正解ならボタンなしで全問正解メッセージ
    - Review_Session の Score を元の Score と別に表示。復習開始失敗時は `role="alert"` のエラーを表示し結果表示を維持
    - _Requirements: 6.1, 6.2, 6.7, 7.1, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.5 `js/main.js` と `index.html` を配線する
    - 起動時に `window.QUIZ_DATA` の有無を確認し、未定義ならエラー表示で開始ボタンを無効化。定義済みなら `validateQuestionBank` → `history.load()` → Top 画面描画
    - `state` の保持、画面切替、Session 開始 / 回答 / 次へ / 結果 / 復習 / 再挑戦 / トップ戻りのイベント配線(前回 Session の状態は破棄)
    - Session / Review_Session 完了時に `history.createRecord` → `append` を呼び、書き込み失敗時もクイズを継続
    - イベントハンドラ全体を `try/catch` で囲み、一般エラーを `role="alert"` 領域に表示(キートラップを作らない)
    - 画面切替ごとに `focus.js` を呼ぶ。`<script onerror>` / `<link onerror>` で必須リソースの読み込み失敗を検知する
    - _Requirements: 1.6, 3.2, 3.6, 6.8, 6.9, 7.2, 8.1, 8.8, 9.13, 10.5, 10.6_

  - [x]* 8.6 UI の例示ユニットテスト(jsdom)を書く
    - `tests/unit/ui.test.js`
    - Top_Screen の 3 難易度表示と「未挑戦」表示、選択肢選択時の判定・強調・文字ラベル、最終問題のボタン置換、解説欠落時のフォールバック、全問正解時の復習ボタン非表示、Review の Score 別表示、復習開始失敗時のエラー表示と結果維持
    - `localStorage` が例外を投げるモックで履歴無効メッセージが出てクイズが継続すること、`window.confirm` の承認 / キャンセルによる履歴削除
    - `window.QUIZ_DATA` 未定義時にエラー表示と開始ボタン無効、画面切替後の見出しへのフォーカス移動、判定領域の `aria-live`、`html[lang="ja"]`
    - _Requirements: 1.6, 3.1, 5.2, 5.3, 5.6, 5.7, 5.8, 5.9, 5.10, 7.4, 7.6, 7.7, 8.5, 8.8, 8.10, 9.13, 10.4, 10.5, 10.7_

- [x] 9. 静的構成・配色の検査と文書化
  - [x]* 9.1 静的構成のスモークテストを書く
    - `tests/unit/static-structure.test.js`
    - HTML / CSS / JS 内の参照が `/` 始まりや `http(s)://` を含まないこと、`type="module"`、`fetch`、`XMLHttpRequest` を使っていないこと、実行に `node_modules` を要さないこと
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.12_

  - [x]* 9.2 配色トークンのコントラスト検算テストを書く
    - `tests/unit/color-tokens.test.js`
    - `tokens.css` の変数から色を読み取り、本文 4.5:1、見出し / ボタンラベル / フォーカス表示 3:1 以上、およびネイビー・オレンジの色相 / 明度 / 彩度の範囲を検証
    - _Requirements: 2.1, 2.5, 10.3_

  - [x] 9.3 `README.md` を作成する
    - 日本語で、ローカル(`file://`)での開き方、GitHub Pages への配置手順(ビルド不要)、問題データの追加・検証方法、テストの実行方法(`vitest --run`)、手動確認項目(主要ブラウザ、幅 320 / 375 / 767 / 768 / 1280px、キーボード操作、スクリーンリーダー)を記載する
    - WCAG 適合の完全な検証には支援技術を用いた手動テストと専門家レビューが必要であることを明記する
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 10.1, 10.2_

- [x] 10. Final checkpoint - 全体の確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` が付いたサブタスクはテスト関連の任意タスクで、MVP を優先する場合はスキップできる
- 各タスクは要件の受け入れ基準番号(例: 3.5)を参照しており、追跡可能である
- プロパティテストは設計書の Property 1〜14 に 1 対 1 で対応し、各テストに `Feature: aws-quiz-app, Property {番号}: {内容}` のタグコメントと `numRuns` 100 以上を設定する
- Property 5 は `formatProgress`(scoring.js)と Session 進行中の `correctCount` 範囲の両方を扱うため、session 側のタスク 4.6 に集約している
- 設計書のファイル構成では問題データは `data/questions.js` 1 ファイルだが、難易度ごとのタスク分割と同時編集の回避のため、`questions.js` を初期化専用とし、3 つの難易度別ファイルが追記する方式にしている(実行時の `window.QUIZ_DATA` の形は設計書と同一)
- 問題データ 90 問は、プレースホルダーや省略表記を使わず全件を実内容で記述する。問題内容の妥当性(難易度、オリジナル性、技術的正確性)の最終確認は人手のレビューが必要である
- テストは `vitest --run` で単発実行する(ウォッチモードは使わない)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "7.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "7.2", "7.3", "7.4", "8.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "5.2"] },
    { "id": 3, "tasks": ["5.3", "5.4", "5.5", "7.5", "8.2", "8.3", "8.4"] },
    { "id": 4, "tasks": ["8.5"] },
    { "id": 5, "tasks": ["8.6", "9.1", "9.2", "9.3"] }
  ]
}
```
