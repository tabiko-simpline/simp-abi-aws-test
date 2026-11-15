# Requirements Document

## Introduction

本書は、社内研修用の AWS クイズ Web アプリケーション(以下「クイズアプリ」)の要件を定義する。クイズアプリは HTML / CSS / JavaScript のみで構成され、ビルド工程なしで GitHub Pages にそのまま公開できる静的サイトである。利用者は 3 つの難易度(AWS初心者、基礎だけわかる初級者、中級エンジニア向け)から選択し、各難易度 30 問(合計 90 問)の 4 択問題に解答して、解説付きで学習できる。誤答問題の復習機能と、localStorage による学習履歴の保存・表示も提供する。

なお、各要件の受入基準は、本アプリが満たすべき仕様を「〜すること」の形式で記述している。

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

1. Quiz_App は、HTML ファイル、CSS ファイル、JavaScript ファイル、および問題データ・画像などの静的アセットファイルのみで構成すること。
2. Quiz_App は、ビルド工程(トランスパイル、バンドル、minify を含む)およびパッケージのインストールコマンドを一切実行せず、リポジトリのファイルをそのまま配置するだけで動作すること。
3. GitHub Pages のサブパス配下(例: `/リポジトリ名/`)から index.html が配信された場合でも、Quiz_App は、すべての CSS、JavaScript、問題データ、画像を `/` で始まる絶対パスではなく相対パスで読み込み、読み込み失敗(404 など)が 0 件の状態で初回表示を完了すること。
4. Quiz_App は、サーバーサイド処理を必要とせず、配信元オリジン以外へのネットワークリクエストを 0 件で動作すること。
5. ローカルで index.html を `file://` スキームでブラウザ(Chrome、Edge、Firefox、Safari の各最新安定版)から直接開いた場合でも、Quiz_App は、GitHub Pages 配信時と同一の画面表示および同一の機能で動作すること。
6. 必須リソース(CSS、JavaScript、問題データのいずれか)の読み込みに失敗した場合、Quiz_App は、クイズを開始できない状態とし、読み込みに失敗した旨のエラーメッセージを画面に表示すること。

### 要件 2: レスポンシブデザインと配色

**User Story:** 研修参加者として、PC でもスマートフォンでも見やすい画面で学習したい。それにより、場所を選ばず学習できる。

#### Acceptance Criteria

1. Quiz_App は、全画面において、ネイビー(色相 200°〜240°、明度 35% 以下)を背景色・見出し・ヘッダー等の基調色とし、オレンジ(色相 20°〜40°、彩度 80% 以上)を操作ボタン・強調表示のアクセント色として使用すること。
2. Viewport_Width が 320px 以上 767px 以下の場合、Quiz_App は、横スクロールバーを表示せず、全コンテンツを 1 カラムで表示すること。
3. Viewport_Width が 768px 以上の場合、Quiz_App は、コンテンツ領域を画面中央に配置し、コンテンツ領域の最大幅を 960px 以下とすること。
4. Quiz_App は、選択肢ボタンおよび操作ボタンのタップ領域を、高さ 44px 以上かつ幅 44px 以上とすること。
5. Quiz_App は、本文テキストと背景色のコントラスト比を 4.5:1 以上とし、見出し、18pt 以上の大きな文字、およびボタンラベルと背景色のコントラスト比を 3:1 以上とすること。
6. Quiz_App は、全画面の HTML に viewport メタタグ(幅をデバイス幅に一致させ、初期拡大率を 1.0 とする設定)を含めること。
7. Viewport_Width が 767px 以下と 768px 以上の間で切り替わった場合、Quiz_App は、ページを再読み込みせずに 500 ミリ秒以内に該当するレイアウトへ切り替えること。
8. Viewport_Width が 320px 未満の場合、Quiz_App は、横スクロールを許容しつつ、コンテンツの表示内容を欠落させず、すべての操作ボタンを操作可能な状態に保つこと。

### 要件 3: トップ画面と難易度選択

**User Story:** 研修参加者として、自分のレベルに合った難易度を選んでクイズを始めたい。それにより、適切な難しさで学習できる。

#### Acceptance Criteria

1. Quiz_App の起動時、Top_Screen は、Beginner、Basic、Intermediate の 3 つの Difficulty を、それぞれ 1 つの名称表示と 1 つ以上 100 文字以内の対象レベルの説明を付けて、スクロールなしで同時に選択可能な状態で表示すること。
2. 利用者が Top_Screen 上で Difficulty を 1 つ選択した場合、Quiz_App は、選択された Difficulty の Session を開始し、1 秒以内に Quiz_Screen の 1 問目を表示すること。
3. Session の開始時、Quiz_App は、選択された Difficulty の 30 問すべてを、重複なく出題対象とすること。
4. Quiz_App は、1 つの Session 内で 1 度に 1 問のみを表示すること。
5. 選択された Difficulty の問題数が 30 問に満たない場合、または問題データの読み込みに失敗した場合、Quiz_App は、Session を開始せず Top_Screen に留まり、問題を読み込めなかった旨のエラーを表示すること。この場合も、利用者が別の Difficulty を選択できる状態を維持すること。
6. Session の開始時、Quiz_App は、前回の Session の回答状況および得点を引き継がず、正答数 0、回答済み問題数 0 の状態から開始すること。

### 要件 4: クイズ出題と進捗表示

**User Story:** 研修参加者として、現在の進み具合と正答数を確認しながら解答したい。それにより、学習の達成度を把握できる。

#### Acceptance Criteria

1. Question の表示時、Quiz_Screen は、問題文と、重複のない 4 つの選択肢を表示すること。
2. Question の表示時、Quiz_Screen は、Progress_Indicator を「第 N / M 問」の形式で表示すること。N は 1 以上 M 以下の現在の問題番号、M は Session の出題数とする。
3. Question の表示時、Quiz_Screen は、その時点の正答数を「正答数: X」の形式で表示すること。X は 0 以上 N-1 以下の整数とする。
4. 利用者の解答により判定が確定した場合、Quiz_Screen は、判定確定から 500 ミリ秒以内に正答数の表示を更新すること。
5. 利用者が選択肢を 1 つ選択した場合、Quiz_Screen は、その解答を確定し、同一 Question に対する選択肢の再選択操作を無効化すること。2 回目以降の選択操作では、正答数および判定結果を変更しないこと。
6. 選択肢の表示順を決定する場合、Quiz_App は、表示順にかかわらず、Question_Data の正解インデックスが指す選択肢を正解として判定すること。
7. Question_Data の選択肢数が 4 つではない場合、または正解インデックスが 0 から 3 の範囲外である場合、Quiz_App は、その Question を出題対象から除外し、利用者にデータ不正を示すエラーを表示すること。この場合も、Session の進行状態および正答数を保持すること。

### 要件 5: 即時判定と解説表示

**User Story:** 研修参加者として、解答直後に正誤と丁寧な解説を確認したい。それにより、理由まで理解して知識を定着できる。

#### Acceptance Criteria

1. 利用者が選択肢を選択した場合、Quiz_Screen は、選択から 500 ミリ秒以内に「正解」または「不正解」の判定を表示すること。
2. 判定の表示時、Quiz_Screen は、正解の選択肢を、他の選択肢とは異なる枠線または背景の表示と、「正解」を示す文字またはアイコンで強調して示すこと。
3. 利用者が不正解の選択肢を選択した場合、Quiz_Screen は、選択された選択肢を、正解の選択肢および未選択の選択肢とは異なる枠線または背景の表示と、「不正解」を示す文字またはアイコンで区別して示すこと。
4. 判定の表示時、Quiz_Screen は、正解である理由 1 件と、他の 3 つの選択肢それぞれが誤りである理由 3 件を含む Explanation を表示すること。各理由は、どの選択肢に対応するかが判別できる形で表示すること。
5. 判定の表示時、Quiz_Screen は、同じ Question に対する選択肢の再選択を受け付けない状態にすること。
6. 判定と Explanation の表示後、Quiz_Screen は、「次の問題へ」ボタンを表示すること。
7. 利用者が「次の問題へ」ボタンを押下した場合、Quiz_Screen は、次の Question を表示すること。
8. 最後の Question に対する判定と Explanation の表示後、Quiz_Screen は、「次の問題へ」ボタンに代えて、結果表示へ進むボタンを表示すること。
9. Quiz_Screen は、判定結果を、色だけでなく「正解」または「不正解」の文字またはアイコンでも識別できるように表示すること。
10. 選択した Question に対応する Explanation を取得できない場合、Quiz_Screen は、判定結果と正解の選択肢の強調表示を維持したまま、Explanation を表示できない旨のメッセージを表示すること。この場合も、「次の問題へ」ボタンまたは結果表示へ進むボタンを表示すること。

### 要件 6: 結果発表

**User Story:** 研修参加者として、全問終了後に成績と講評を確認したい。それにより、自分の理解度を把握できる。

#### Acceptance Criteria

1. Session の全 Question への解答が完了した場合、Result_Screen は、全 Question 数に対する正答数(整数)と、正答率(百分率、小数点以下を切り捨てた整数値)を、Score として表示すること。
2. Result_Screen は、正答率に応じた評価コメントを、AC3 から AC6 の区分に従って 1 件のみ表示すること。
3. 正答率が 90% 以上 100% 以下の場合、Result_Screen は、最上位の評価コメントを表示すること。
4. 正答率が 70% 以上 90% 未満の場合、Result_Screen は、上位から 2 番目の評価コメントを表示すること。
5. 正答率が 50% 以上 70% 未満の場合、Result_Screen は、上位から 3 番目の評価コメントを表示すること。
6. 正答率が 0% 以上 50% 未満の場合、Result_Screen は、復習を促す評価コメントを表示すること。
7. Result_Screen は、トップ画面へ戻るボタンと、同じ Difficulty でもう一度挑戦するボタンを表示すること。
8. 同じ Difficulty でもう一度挑戦するボタンが押された場合、Quiz_App は、前回の Session の正答数と解答履歴を破棄し、同じ Difficulty で新しい Session を開始すること。
9. トップ画面へ戻るボタンが押された場合、Quiz_App は、前回の Session の正答数と解答履歴を破棄し、トップ画面を表示すること。

### 要件 7: 誤答問題の復習

**User Story:** 研修参加者として、間違えた問題だけをやり直したい。それにより、弱点を効率よく克服できる。

#### Acceptance Criteria

1. 直前の Session の結果が Result_Screen に表示され、かつ当該 Session で誤答した Question が 1 問以上ある場合、Result_Screen は、「間違えた問題だけ復習する」ボタンを表示すること。
2. 利用者が「間違えた問題だけ復習する」ボタンを押下した場合、Quiz_App は、直前の Session で誤答した Question のみを出題対象とする Review_Session を開始し、1 問目の Question を Quiz_Screen に表示すること。
3. Review_Session の進行中、Quiz_Screen は、Progress_Indicator の「N / M」表示において、N を現在の Question の出題順(1 から開始)、M を当該 Review_Session の出題対象の Question 総数(誤答問題数)として表示すること。
4. Review_Session の全 Question への解答が完了した場合、Result_Screen は、Review_Session の Score(正答数と出題総数)を、元の Session の Score とは別に表示すること。
5. Review_Session の結果が Result_Screen に表示され、かつ当該 Review_Session で誤答した Question が 1 問以上ある場合、Result_Screen は、「間違えた問題だけ復習する」ボタンを表示すること。このボタンの押下時、Quiz_App は、当該 Review_Session で誤答した Question のみを出題対象とする新たな Review_Session を開始すること。
6. Session または Review_Session の結果が Result_Screen に表示され、かつ当該 Session または Review_Session の全 Question に正解している場合、Result_Screen は、「間違えた問題だけ復習する」ボタンを表示せず、全問正解であることを示すメッセージを表示すること。
7. Review_Session の開始時に出題対象の Question を取得できなかった場合、Quiz_App は、Review_Session を開始せず、復習を開始できなかった旨のエラーメッセージを Result_Screen 上に表示すること。この場合も、直前の Session の結果表示を維持すること。

### 要件 8: 学習履歴の保存と表示

**User Story:** 研修参加者として、前回のスコアや学習履歴をトップ画面で確認したい。それにより、成長の推移を把握できる。

#### Acceptance Criteria

1. Session または Review_Session が完了した場合、Quiz_App は、次の項目を 1 件の履歴レコードとして History_Store に保存すること。
   - Difficulty
   - 実施日時(ISO 8601 形式、ミリ秒精度)
   - 正答数(0 以上、出題数以下の整数)
   - 出題数(1 以上の整数)
   - 正答率(正答数 ÷ 出題数 × 100 を小数点以下第 1 位に四捨五入した、0.0〜100.0 の値)
2. Top_Screen は、表示時に、各 Difficulty の前回スコア(正答数、出題数、正答率)を表示すること。前回スコアは、当該 Difficulty で実施日時が最も新しい履歴レコードから取得すること。
3. Top_Screen は、表示時に、各 Difficulty の最高正答率と挑戦回数を表示すること。最高正答率は当該 Difficulty の全履歴レコード中の最大値、挑戦回数は当該 Difficulty の履歴レコード件数とする。
4. Top_Screen は、表示時に、全 Difficulty を合わせた直近 10 件以内の学習履歴を、実施日時の新しい順に表示すること。
5. ある Difficulty に History_Store の記録がない場合、Top_Screen は、当該 Difficulty の前回スコア、最高正答率、挑戦回数の表示に代えて「未挑戦」と表示すること。
6. Quiz_App は、History_Store を JSON 形式で localStorage に保存すること。
7. 有効な履歴データは、JSON へのシリアライズ、デシリアライズ、再シリアライズを順に行った結果が、元のデータと等価になること(ラウンドトリップ特性)。
8. localStorage が利用できない場合、またはデータの読み込みや書き込みに失敗した場合、Quiz_App は、履歴機能を無効として扱い、履歴が利用できない旨を Top_Screen に表示すること。この場合も、クイズ機能は継続して動作させること。
9. History_Store のデータが JSON として解析できない場合、または履歴レコードの必須項目(Difficulty、実施日時、正答数、出題数、正答率)の欠落もしくは型不正がある場合、Quiz_App は、破損データを無視して、履歴を空の状態として表示すること。
10. 履歴削除機能を提供する場合、Top_Screen は、確認ダイアログで承認された時点で History_Store の全データを削除し、キャンセルされた場合は History_Store のデータを変更しないこと。

### 要件 9: クイズデータの構成

**User Story:** 研修管理者として、各難易度の問題データが漏れなく用意されていてほしい。それにより、すぐに研修で使用できる。

#### Acceptance Criteria

1. Question_Data は、Beginner 30 問、Basic 30 問、Intermediate 30 問、合計 90 問の Question を含むこと。
2. Question_Data は、各 Question に、次の項目を含むこと。
   - 一意の識別子
   - Difficulty
   - 問題文(1 文字以上 300 文字以下)
   - 4 つの選択肢(各 1 文字以上 100 文字以下)
   - 正解インデックス(0 以上 3 以下の整数)
   - Explanation(1 文字以上 1,000 文字以下)
3. Question_Data は、90 問すべてを実際の内容で記述し、ダミーデータ、プレースホルダー文字列、および省略表記(「...」「以下同様」など)を含まないこと。
4. Question_Data は、各 Question の 4 つの選択肢を、前後の空白を除いた状態で相互に異なる文字列とすること。
5. Question_Data は、各 Question の Explanation に、正解である理由 1 件と、正解以外の 3 つの選択肢それぞれが誤りである理由 3 件を含むこと。
6. Question_Data は、同一 Difficulty 内で問題文が重複しないこと。
7. Question_Data は、Beginner の Question を、クラウドの基本概念と主要サービスの役割の範囲で作成すること。
8. Question_Data は、Basic の Question を、EC2、S3、VPC、IAM などの基本操作と設計の入り口の範囲で、CLF〜SAA 基礎レベルとして作成すること。
9. Question_Data は、Intermediate の Question を、可用性・セキュリティ設計、コスト最適化、サーバーレス連携などの範囲で、SAA〜SAP 実務レベルとして作成すること。
10. Question_Data は、オリジナルの問題文で作成し、公式試験問題の転載を含まないこと。
11. Question_Data は、各 Difficulty 内で、正解インデックス 0〜3 の各値が 4 問以上 11 問以下となるように分布させること。
12. Quiz_App は、Question_Data をローカルの静的ファイルとして読み込み、外部ネットワークへのリクエストを行わないこと。
13. Question_Data の読み込みに失敗した場合、Top_Screen は、読み込み失敗を示すエラーメッセージを表示し、Session の開始操作を受け付けないこと。
14. 読み込んだ Question_Data が、次のいずれかに違反している場合、Top_Screen は、データ不正を示すエラーメッセージを表示し、Session の開始を受け付けないこと。
    - Difficulty ごとの問題数(各 30 問)
    - 選択肢数(4 つ)
    - 正解インデックスの範囲(0 以上 3 以下)
    - Explanation の非空
15. すべての Question について、正解インデックスが指し示す選択肢が存在し、Explanation が空文字でないこと(不変条件)。

### 要件 10: アクセシビリティと操作性

**User Story:** 研修参加者として、キーボードや支援技術でも操作できるようにしたい。それにより、多様な利用環境で学習できる。

#### Acceptance Criteria

1. Quiz_App は、ボタン、リンク、選択肢、入力欄を含むすべての操作要素を、キーボード(Tab、Shift+Tab、Enter、Space)のみで到達および実行できるようにすること。
2. Quiz_App は、Tab キーによるフォーカス移動順を、画面上の視覚的な表示順(左から右、上から下)と一致させること。
3. 操作要素がフォーカスされている間、Quiz_App は、隣接する背景色との輝度コントラスト比 3:1 以上、かつ幅 2px 以上のフォーカス表示を行うこと。
4. 判定と Explanation の表示時、Quiz_Screen は、判定結果(正解または不正解)と Explanation の本文を、aria-live 属性を持つ領域内に表示し、表示から 1 秒以内に支援技術へ通知すること。
5. 画面が切り替わった場合、Quiz_App は、切り替え後 500 ミリ秒以内に、新しい画面の先頭見出しまたは最初の主要操作要素へフォーカスを移動すること。
6. キーボード操作によってフォーカスが移動できなくなる状態(キートラップ)が発生する場合、Quiz_App は、Tab キーまたは Shift+Tab キーによってその要素から抜け出せる状態を維持すること。
7. Quiz_App は、HTML の lang 属性に `ja` を設定すること。
