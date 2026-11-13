# Requirements Document

## Introduction

本書は、社内研修用の AWS クイズ Web アプリケーション(以下「クイズアプリ」)の要件を定義する。クイズアプリは HTML / CSS / JavaScript のみで構成され、ビルド工程なしで GitHub Pages にそのまま公開できる静的サイトである。利用者は 3 つの難易度(AWS初心者、基礎だけわかる初級者、中級エンジニア向け)から選択し、各難易度 30 問(合計 90 問)の 4 択問題に解答して、解説付きで学習できる。誤答問題の復習機能と、localStorage による学習履歴の保存・表示も提供する。

## Glossary

- **Quiz_App**: 本書で定義する AWS クイズ Web アプリケーション全体
- **Top_Screen**: 難易度選択と学習履歴を表示するトップ画面
- **Quiz_Screen**: 1 問ずつ問題を出題し、判定と解説を表示するクイズ出題画面
- **Result_Screen**: 最終スコアと評価コメント、復習操作を表示する結果発表・復習画面
- **Difficulty**: 難易度。次の 3 種類とする
  - **Beginner**: AWS初心者(クラウドの基本概念、主要サービスの役割など)
  - **Basic**: 基礎だけわかる初級者(EC2 / S3 / VPC / IAM などの基本操作・設計の入り口、CLF〜SAA 基礎レベル)
  - **Intermediate**: 中級エンジニア向け(可用性・セキュリティ設計、コスト最適化、サーバーレス連携など、SAA〜SAP 実務レベル)
- **Question**: 問題文、4 つの選択肢、正解インデックス、解説を持つ 1 件のクイズデータ
- **Question_Data**: 全 90 問の Question を格納する JavaScript ファイルまたは JSON ファイル
- **Explanation**: 正解の理由と、他の選択肢が誤りである理由を記述した解説文
- **Session**: 1 つの Difficulty に対する 1 回の出題から結果表示までの一連の流れ
- **Review_Session**: 直前の Session で誤答した Question のみを出題する Session
- **Score**: 正答数と正答率(正答数 ÷ 出題数 × 100、小数点以下四捨五入)
- **Progress_Indicator**: 「第 N / M 問」形式の現在位置表示
- **History_Store**: ブラウザの localStorage に保存される前回スコアと学習履歴のデータ
- **Viewport_Width**: 表示領域の横幅(CSS ピクセル)

## Requirements

### 要件 1: 静的サイトとしての構成と公開

**User Story:** 管理者として、ビルド不要の静的ファイルのみで構成されたアプリを GitHub Pages に公開したい。それにより、サーバー構築なしで研修参加者へ配布できる。

#### Acceptance Criteria

1. THE Quiz_App SHALL HTML ファイル、CSS ファイル、JavaScript ファイル、および問題データ・画像などの静的アセットファイルのみで構成される
2. THE Quiz_App SHALL ビルド工程(トランスパイル、バンドル、minify を含む)およびパッケージのインストールコマンドを一切実行せずに、リポジトリのファイルをそのまま配置するだけで動作する
3. WHEN GitHub Pages のサブパス配下(例: `/リポジトリ名/`)から index.html が配信された場合、THE Quiz_App SHALL すべての CSS、JavaScript、問題データ、画像を `/` で始まる絶対パスを用いず相対パスで読み込み、読み込み失敗(404 など)を 0 件にして初回表示を完了する
4. THE Quiz_App SHALL サーバーサイド処理を必要とせず、かつ配信元オリジン以外へのネットワークリクエストを 0 件にして動作する
5. WHEN ローカルで index.html を `file://` スキームでブラウザ(Chrome、Edge、Firefox、Safari の各最新安定版)から直接開いた場合、THE Quiz_App SHALL GitHub Pages 配信時と同一の画面表示および同一の機能で動作する
6. IF 必須リソース(CSS、JavaScript、問題データのいずれか)の読み込みに失敗した場合、THEN THE Quiz_App SHALL クイズを開始できない状態にして、読み込みに失敗したことを示すエラーメッセージを画面に表示する

### 要件 2: レスポンシブデザインと配色

**User Story:** 研修参加者として、PC でもスマートフォンでも見やすい画面で学習したい。それにより、場所を選ばず学習できる。

#### Acceptance Criteria

1. THE Quiz_App SHALL ネイビー(色相 200°〜240°、明度 35% 以下)を背景色・見出し・ヘッダー等の基調色とし、オレンジ(色相 20°〜40°、彩度 80% 以上)を操作ボタン・強調表示のアクセント色として全画面で使用する
2. WHILE Viewport_Width が 320px 以上 767px 以下である間、THE Quiz_App SHALL 横スクロールバーを表示せず、全コンテンツを 1 カラムで表示する
3. WHILE Viewport_Width が 768px 以上である間、THE Quiz_App SHALL コンテンツ領域を画面中央に配置し、コンテンツ領域の最大幅を 960px 以下で表示する
4. THE Quiz_App SHALL 選択肢ボタンおよび操作ボタンのタップ領域を、高さ 44px 以上かつ幅 44px 以上で表示する
5. THE Quiz_App SHALL 本文テキストと背景色のコントラスト比を 4.5:1 以上にし、見出しや 18pt 以上の大きな文字およびボタンラベルと背景色のコントラスト比を 3:1 以上にする
6. THE Quiz_App SHALL 全画面の HTML に viewport メタタグ(幅をデバイス幅に一致させ、初期拡大率を 1.0 とする設定)を含める
7. WHEN Viewport_Width が 767px 以下と 768px 以上の間で切り替わった場合、THE Quiz_App SHALL ページを再読み込みせずに 500 ミリ秒以内に該当するレイアウトへ切り替える
8. IF Viewport_Width が 320px 未満である場合、THEN THE Quiz_App SHALL 横スクロールを許容しつつ、コンテンツの表示内容を欠落させず、すべての操作ボタンを操作可能な状態に保つ

### 要件 3: トップ画面と難易度選択

**User Story:** 研修参加者として、自分のレベルに合った難易度を選んでクイズを始めたい。それにより、適切な難しさで学習できる。

#### Acceptance Criteria

1. WHEN Quiz_App が起動した場合、THE Top_Screen SHALL Beginner、Basic、Intermediate の 3 つの Difficulty を、それぞれ 1 つの名称表示と 1 つ以上 100 文字以内の対象レベルの説明付きで、スクロールなしで同時に選択可能な状態で表示する
2. WHEN 利用者が Top_Screen 上で Difficulty を 1 つ選択した場合、THE Quiz_App SHALL 選択された Difficulty の Session を開始し、1 秒以内に Quiz_Screen の 1 問目を表示する
3. WHEN Session が開始された場合、THE Quiz_App SHALL 選択された Difficulty の 30 問すべてを重複なく出題対象にする
4. THE Quiz_App SHALL 1 つの Session 内で 1 度に 1 問のみ表示する
5. IF 選択された Difficulty の問題数が 30 問に満たない、または問題データの読み込みに失敗した場合、THEN THE Quiz_App SHALL Session を開始せず Top_Screen に留まり、問題を読み込めなかったことを示すエラー表示を行い、利用者が別の Difficulty を選択できる状態を維持する
6. WHEN Session が開始された場合、THE Quiz_App SHALL 前回の Session の回答状況および得点を引き継がず、正解数 0、回答済み問題数 0 の状態から開始する

### 要件 4: クイズ出題と進捗表示

**User Story:** 研修参加者として、現在の進み具合と正答数を確認しながら解答したい。それにより、学習の達成度を把握できる。

#### Acceptance Criteria

1. WHEN Question が表示された場合、THE Quiz_Screen SHALL 問題文と、重複のない 4 つの選択肢を表示する
2. WHEN Question が表示された場合、THE Quiz_Screen SHALL Progress_Indicator を「第 N / M 問」形式で表示する(N は 1 以上 M 以下の現在の問題番号、M は Session の出題数)
3. WHEN Question が表示された場合、THE Quiz_Screen SHALL その時点の正答数を「正答数: X」形式で表示する(X は 0 以上 N-1 以下の整数)
4. WHEN 利用者が解答して判定が確定した場合、THE Quiz_Screen SHALL 判定確定から 500 ミリ秒以内に正答数の表示を更新する
5. WHEN 利用者が選択肢を 1 つ選択した場合、THE Quiz_Screen SHALL その解答を確定し、同一 Question に対する選択肢の再選択操作を無効化して、2 回目以降の選択操作では正答数および判定結果を変更しない
6. WHEN 選択肢の表示順を決定する場合、THE Quiz_App SHALL 表示順にかかわらず、Question_Data の正解インデックスが指す選択肢を正解として判定する
7. IF Question_Data の選択肢数が 4 つではない、または正解インデックスが 0 から 3 の範囲外である場合、THEN THE Quiz_App SHALL その Question を出題対象から除外し、利用者にデータ不正を示すエラー表示を行い、Session の進行状態および正答数を保持する

### 要件 5: 即時判定と解説表示

**User Story:** 研修参加者として、解答直後に正誤と丁寧な解説を確認したい。それにより、理由まで理解して知識を定着できる。

#### Acceptance Criteria

1. WHEN 利用者が選択肢を選択した場合、THE Quiz_Screen SHALL 選択から 500 ミリ秒以内に「正解」または「不正解」の判定を表示する
2. WHEN 判定を表示する場合、THE Quiz_Screen SHALL 正解の選択肢を、他の選択肢とは異なる枠線または背景の表示と「正解」を示す文字またはアイコンで強調して示す
3. IF 利用者が不正解の選択肢を選択した場合、THEN THE Quiz_Screen SHALL 選択された選択肢を、正解の選択肢および未選択の選択肢とは異なる枠線または背景の表示と「不正解」を示す文字またはアイコンで区別して示す
4. WHEN 判定を表示する場合、THE Quiz_Screen SHALL 正解である理由 1 件と、他の 3 つの選択肢それぞれが誤りである理由 3 件を含む Explanation を、各理由がどの選択肢に対応するか判別できる形で表示する
5. WHEN 判定を表示する場合、THE Quiz_Screen SHALL 同じ Question に対する選択肢の再選択を受け付けない状態にする
6. WHEN 判定と Explanation が表示された場合、THE Quiz_Screen SHALL 「次の問題へ」ボタンを表示する
7. WHEN 利用者が「次の問題へ」ボタンを押下した場合、THE Quiz_Screen SHALL 次の Question を表示する
8. WHEN 最後の Question に対する判定と Explanation が表示された場合、THE Quiz_Screen SHALL 「次の問題へ」ボタンに代えて結果表示へ進むボタンを表示する
9. THE Quiz_Screen SHALL 判定結果を、色だけでなく「正解」または「不正解」の文字またはアイコンでも識別できるように表示する
10. IF 選択した Question に対応する Explanation を取得できない場合、THEN THE Quiz_Screen SHALL 判定結果と正解の選択肢の強調表示を維持したまま、Explanation を表示できない旨を示すメッセージを表示し、「次の問題へ」ボタンまたは結果表示へ進むボタンを表示する

### 要件 6: 結果発表

**User Story:** 研修参加者として、全問終了後に成績と講評を確認したい。それにより、自分の理解度を把握できる。

#### Acceptance Criteria

1. WHEN Session の全 Question への解答が完了した場合、THE Result_Screen SHALL 全 Question 数に対する正答数(整数)と正答率(百分率、小数点以下を切り捨てた整数値)を Score として表示する
2. WHEN Result_Screen を表示する場合、THE Result_Screen SHALL 正答率に応じた評価コメントを、AC3 から AC6 の区分に従って 1 件のみ表示する
3. WHEN 正答率が 90% 以上 100% 以下である場合、THE Result_Screen SHALL 最上位の評価コメントを表示する
4. WHEN 正答率が 70% 以上 90% 未満である場合、THE Result_Screen SHALL 上位から 2 番目の評価コメントを表示する
5. WHEN 正答率が 50% 以上 70% 未満である場合、THE Result_Screen SHALL 上位から 3 番目の評価コメントを表示する
6. WHEN 正答率が 0% 以上 50% 未満である場合、THE Result_Screen SHALL 復習を促す評価コメントを表示する
7. THE Result_Screen SHALL トップ画面へ戻るボタンと、同じ Difficulty でもう一度挑戦するボタンを表示する
8. WHEN 同じ Difficulty でもう一度挑戦するボタンが押された場合、THE Quiz_App SHALL 前回の Session の正答数と解答履歴を破棄し、同じ Difficulty で新しい Session を開始する
9. WHEN トップ画面へ戻るボタンが押された場合、THE Quiz_App SHALL 前回の Session の正答数と解答履歴を破棄し、トップ画面を表示する

### 要件 7: 誤答問題の復習

**User Story:** 研修参加者として、間違えた問題だけをやり直したい。それにより、弱点を効率よく克服できる。

#### Acceptance Criteria

1. WHEN 直前の Session の結果が Result_Screen に表示され、かつ当該 Session で誤答した Question が 1 問以上ある場合、THE Result_Screen SHALL 「間違えた問題だけ復習する」ボタンを表示する
2. WHEN 利用者が「間違えた問題だけ復習する」ボタンを押下した場合、THE Quiz_App SHALL 直前の Session で誤答した Question のみを出題対象とする Review_Session を開始し、1 問目の Question を Quiz_Screen に表示する
3. WHILE Review_Session が進行している間、THE Quiz_Screen SHALL Progress_Indicator の「N / M」表示において、N を現在の Question の出題順(1 から開始)、M を当該 Review_Session の出題対象の Question 総数(誤答問題数)として表示する
4. WHEN Review_Session の全 Question への解答が完了した場合、THE Result_Screen SHALL Review_Session の Score(正答数と出題総数)を、元の Session の Score とは別に表示する
5. WHEN Review_Session の結果が Result_Screen に表示され、かつ当該 Review_Session で誤答した Question が 1 問以上ある場合、THE Result_Screen SHALL 「間違えた問題だけ復習する」ボタンを表示し、押下時には当該 Review_Session で誤答した Question のみを出題対象とする新たな Review_Session を開始する
6. WHEN Session または Review_Session の結果が Result_Screen に表示され、かつ当該 Session または Review_Session の全 Question に正解している場合、THE Result_Screen SHALL 「間違えた問題だけ復習する」ボタンを表示せず、全問正解であることを示すメッセージを表示する
7. IF Review_Session の開始時に出題対象の Question を取得できなかった場合、THEN THE Quiz_App SHALL Review_Session を開始せず、復習を開始できなかったことを示すエラーメッセージを Result_Screen 上に表示し、直前の Session の結果表示を維持する

### 要件 8: 学習履歴の保存と表示

**User Story:** 研修参加者として、前回のスコアや学習履歴をトップ画面で確認したい。それにより、成長の推移を把握できる。

#### Acceptance Criteria

1. WHEN Session または Review_Session が完了した場合、THE Quiz_App SHALL Difficulty、実施日時(ISO 8601 形式、ミリ秒精度)、正答数(0 以上 出題数以下の整数)、出題数(1 以上の整数)、正答率(正答数 ÷ 出題数 × 100 を小数点以下第 1 位に四捨五入した 0.0 〜 100.0 の値)を 1 件の履歴レコードとして History_Store に保存する
2. WHEN Top_Screen を表示する場合、THE Top_Screen SHALL 各 Difficulty の前回スコア(正答数、出題数、正答率)を、当該 Difficulty で実施日時が最も新しい履歴レコードから表示する
3. WHEN Top_Screen を表示する場合、THE Top_Screen SHALL 各 Difficulty の最高正答率(当該 Difficulty の全履歴レコード中の最大値)と挑戦回数(当該 Difficulty の履歴レコード件数)を表示する
4. WHEN Top_Screen を表示する場合、THE Top_Screen SHALL 全 Difficulty を合わせた直近 10 件以内の学習履歴を、実施日時の新しい順に表示する
5. IF ある Difficulty に History_Store の記録がない場合、THEN THE Top_Screen SHALL 当該 Difficulty の前回スコア、最高正答率、挑戦回数の表示に代えて「未挑戦」と表示する
6. THE Quiz_App SHALL History_Store を JSON 形式で localStorage に保存する
7. FOR ALL 有効な履歴データについて、JSON へのシリアライズ、デシリアライズ、再シリアライズを順に行った結果は元のデータと等価である(ラウンドトリップ特性)
8. IF localStorage が利用できない場合、またはデータの読み込みや書き込みに失敗した場合、THEN THE Quiz_App SHALL 履歴機能を無効として扱い、履歴が利用できない旨を Top_Screen に表示し、クイズ機能を継続して動作させる
9. IF History_Store のデータが JSON として解析できない場合、または履歴レコードの必須項目(Difficulty、実施日時、正答数、出題数、正答率)の欠落もしくは型不正がある場合、THEN THE Quiz_App SHALL 破損データを無視して履歴を空の状態として表示する
10. WHERE 履歴削除機能が提供される場合、THE Top_Screen SHALL 確認ダイアログで承認された時点で History_Store の全データを削除し、キャンセルされた場合は History_Store のデータを変更しない

### 要件 9: クイズデータの構成

**User Story:** 研修管理者として、各難易度の問題データが漏れなく用意されていてほしい。それにより、すぐに研修で使用できる。

#### Acceptance Criteria

1. THE Question_Data SHALL Beginner 30 問、Basic 30 問、Intermediate 30 問、合計 90 問の Question を含む
2. THE Question_Data SHALL 各 Question に、一意の識別子、Difficulty、問題文(1 文字以上 300 文字以下)、4 つの選択肢(各 1 文字以上 100 文字以下)、正解インデックス(0 以上 3 以下の整数)、Explanation(1 文字以上 1,000 文字以下)を含む
3. THE Question_Data SHALL 90 問すべてを実際の内容で記述し、ダミーデータ、プレースホルダー文字列、および省略表記(「...」「以下同様」など)を含まない
4. THE Question_Data SHALL 各 Question の 4 つの選択肢を、前後の空白を除いた状態で相互に異なる文字列にする
5. THE Question_Data SHALL 各 Question の Explanation に、正解である理由 1 件と、正解以外の 3 つの選択肢それぞれが誤りである理由 3 件を含む
6. THE Question_Data SHALL 同一 Difficulty 内で問題文が重複しない
7. THE Question_Data SHALL Beginner の Question をクラウドの基本概念と主要サービスの役割の範囲で作成する
8. THE Question_Data SHALL Basic の Question を EC2、S3、VPC、IAM などの基本操作と設計の入り口の範囲で、CLF〜SAA 基礎レベルとして作成する
9. THE Question_Data SHALL Intermediate の Question を可用性・セキュリティ設計、コスト最適化、サーバーレス連携などの範囲で、SAA〜SAP 実務レベルとして作成する
10. THE Question_Data SHALL オリジナルの問題文で作成し、公式試験問題の転載を含まない
11. THE Question_Data SHALL 各 Difficulty 内で正解インデックス 0〜3 の各値が 4 問以上 11 問以下含まれるように分布させる
12. THE Quiz_App SHALL Question_Data をローカルの静的ファイルとして読み込み、外部ネットワークへのリクエストを行わない
13. IF Question_Data の読み込みに失敗した場合、THEN THE Top_Screen SHALL 読み込み失敗を示すエラーメッセージを表示し、Session の開始操作を受け付けない
14. IF 読み込んだ Question_Data が、Difficulty ごとの問題数(各 30 問)、選択肢数(4 つ)、正解インデックスの範囲(0 以上 3 以下)、または Explanation の非空のいずれかに違反している場合、THEN THE Top_Screen SHALL データ不正を示すエラーメッセージを表示し、Session の開始を受け付けない
15. FOR ALL Question について、正解インデックスが指し示す選択肢は存在し、Explanation が空文字でない(不変条件)

### 要件 10: アクセシビリティと操作性

**User Story:** 研修参加者として、キーボードや支援技術でも操作できるようにしたい。それにより、多様な利用環境で学習できる。

#### Acceptance Criteria

1. THE Quiz_App SHALL ボタン、リンク、選択肢、入力欄を含むすべての操作要素を、キーボード(Tab、Shift+Tab、Enter、Space)のみで到達および実行可能にする
2. THE Quiz_App SHALL Tab キーによるフォーカス移動順を、画面上の視覚的な表示順(左から右、上から下)と一致させる
3. WHILE 操作要素がフォーカスされている間、THE Quiz_App SHALL 隣接する背景色との輝度コントラスト比 3:1 以上、かつ幅 2px 以上のフォーカス表示を行う
4. WHEN 判定と Explanation が表示された場合、THE Quiz_Screen SHALL 判定結果(正解または不正解)と Explanation の本文を、aria-live 属性を持つ領域内に表示し、表示から 1 秒以内に支援技術へ通知する
5. WHEN 画面が切り替わった場合、THE Quiz_App SHALL 切り替え後 500 ミリ秒以内に、新しい画面の先頭見出しまたは最初の主要操作要素へフォーカスを移動する
6. IF キーボード操作によってフォーカスが移動できなくなる状態(キートラップ)が発生する場合、THEN THE Quiz_App SHALL Tab キーまたは Shift+Tab キーによりその要素から抜け出せる状態を維持する
7. THE Quiz_App SHALL HTML の lang 属性に `ja` を設定する
