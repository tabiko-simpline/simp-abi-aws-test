// 初級(beginner)の問題を window.QUIZ_DATA.questions に追記する。
(function () {
  'use strict';
  // questions.js が未読み込みでも壊れないよう防御的に初期化する
  window.QUIZ_DATA = window.QUIZ_DATA || { version: 1, questions: [] };
  window.QUIZ_DATA.questions.push(
    {
      id: "beginner-001",
      difficulty: "beginner",
      text: "AWSの料金モデルの特徴として、最も適切なものはどれですか。",
      choices: [
        "使ったリソースの量や時間に応じて支払う従量課金が基本である",
        "利用開始時に数年分の利用料を前払いする必要がある",
        "利用しなくても毎月固定額が請求される",
        "利用できるサービスの数に応じて月額が決まる"
      ],
      answerIndex: 0,
      explanation: {
        correct: "AWSは使った分だけ支払う従量課金(pay-as-you-go)が基本で、初期投資を抑えて必要な分だけ利用できます。",
        incorrect: {
          "1": "数年分の前払いは必須ではありません。Savings Plansなどで割引を受ける選択肢はありますが、利用開始に前払いは不要です。",
          "2": "固定額が常に請求される仕組みではありません。多くのサービスは利用量に応じて課金され、使わなければ費用は発生しません。",
          "3": "利用できるサービス数による月額制ではありません。課金は各サービスの利用量ごとに計算されます。"
        }
      }
    },
    {
      id: "beginner-002",
      difficulty: "beginner",
      text: "負荷の増減に合わせて、リソースを自動的に増やしたり減らしたりできる性質を何と呼びますか。",
      choices: [
        "耐久性",
        "弾力性(エラスティシティ)",
        "可搬性",
        "冗長性"
      ],
      answerIndex: 1,
      explanation: {
        correct: "弾力性(エラスティシティ)は、需要に応じてリソースを拡張・縮小できる性質で、無駄な費用を抑えつつ性能を保てます。",
        incorrect: {
          "0": "耐久性はデータが失われにくいことを指します。Amazon S3の高い耐久性が例ですが、リソース量の増減とは別の概念です。",
          "2": "可搬性は環境間で移動しやすいことを指す言葉で、負荷に応じたリソースの増減を表すものではありません。",
          "3": "冗長性は障害に備えて同じ機能を複数用意することです。可用性向上が目的で、需要に応じた増減とは異なります。"
        }
      }
    },
    {
      id: "beginner-003",
      difficulty: "beginner",
      text: "AWSの「アベイラビリティーゾーン(AZ)」の説明として、正しいものはどれですか。",
      choices: [
        "世界各地に配置されたコンテンツ配信用のキャッシュ拠点",
        "AWSアカウントごとに割り当てられる論理的な管理単位",
        "1つのリージョン内にある、独立した電源やネットワークを持つ1つ以上のデータセンター群",
        "ユーザーの自社拠点に設置されるAWSの機器"
      ],
      answerIndex: 2,
      explanation: {
        correct: "AZはリージョン内で物理的に分離された1つ以上のデータセンター群で、複数のAZに分散配置すると障害に強い構成にできます。",
        incorrect: {
          "0": "コンテンツ配信用のキャッシュ拠点はエッジロケーションの説明で、Amazon CloudFrontが利用します。AZではありません。",
          "1": "アカウントごとの論理的な管理単位はAWSアカウントなどの概念で、物理的なデータセンター群であるAZとは異なります。",
          "3": "自社拠点に設置するAWS機器はAWS Outpostsなどのサービスです。AZはAWSが運用する施設側の概念です。"
        }
      }
    },
    {
      id: "beginner-004",
      difficulty: "beginner",
      text: "責任共有モデルにおいて、Amazon EC2を利用する場合に利用者が責任を負うものはどれですか。",
      choices: [
        "データセンターの物理的なセキュリティ",
        "物理サーバーのハードウェア保守",
        "ホストOSを動かす仮想化基盤の管理",
        "ゲストOSのセキュリティパッチ適用"
      ],
      answerIndex: 3,
      explanation: {
        correct: "EC2ではゲストOS以降(OSパッチ、アプリ、データ、セキュリティグループ設定など)が利用者の責任です。",
        incorrect: {
          "0": "データセンターの物理セキュリティは「クラウド自体のセキュリティ」としてAWSが責任を負います。",
          "1": "物理サーバーのハードウェア保守もAWSの責任範囲で、利用者が行う必要はありません。",
          "2": "ホストOSや仮想化基盤の管理はAWSが担当します。利用者が責任を持つのはその上のゲストOS以降です。"
        }
      }
    },
    {
      id: "beginner-005",
      difficulty: "beginner",
      text: "1つのAZの障害でシステム全体が停止しないようにするための、基本的な設計方針はどれですか。",
      choices: [
        "複数のAZにリソースを分散して配置する",
        "1つのAZ内で最も大きいインスタンスタイプを選ぶ",
        "すべてのリソースを同じAZに集約する",
        "バックアップを取らずにコストを下げる"
      ],
      answerIndex: 0,
      explanation: {
        correct: "複数のAZに分散して配置(マルチAZ)すれば、1つのAZで障害が起きても別のAZで処理を継続でき、可用性が高まります。",
        incorrect: {
          "1": "大きなインスタンスは性能向上にはなりますが、AZ障害には無力です。単一AZに依存する点は変わりません。",
          "2": "同じAZに集約するとそのAZの障害で全体が停止する恐れがあり、可用性の観点では避けるべき構成です。",
          "3": "バックアップを省くと復旧手段を失います。コスト削減にはなっても可用性や耐障害性の向上にはなりません。"
        }
      }
    },
    {
      id: "beginner-006",
      difficulty: "beginner",
      text: "画像や動画、ログなどのファイルを容量無制限に近い形で保存できるオブジェクトストレージはどれですか。",
      choices: [
        "Amazon EBS",
        "Amazon S3",
        "Amazon RDS",
        "AWS Lambda"
      ],
      answerIndex: 1,
      explanation: {
        correct: "Amazon S3はオブジェクトストレージで、高い耐久性を持ち、容量を意識せずファイルを保存できます。",
        incorrect: {
          "0": "Amazon EBSはEC2にアタッチするブロックストレージで、容量を指定して使います。オブジェクトストレージではありません。",
          "2": "Amazon RDSはリレーショナルデータベースのマネージドサービスで、ファイル保存用途のストレージではありません。",
          "3": "AWS Lambdaはコードを実行するサーバーレスのコンピューティングサービスで、ファイルを保管する用途ではありません。"
        }
      }
    },
    {
      id: "beginner-007",
      difficulty: "beginner",
      text: "OSを自由に選び、クラウド上で仮想サーバーとして利用できるAWSのサービスはどれですか。",
      choices: [
        "Amazon S3",
        "Amazon Route 53",
        "Amazon EC2",
        "Amazon SNS"
      ],
      answerIndex: 2,
      explanation: {
        correct: "Amazon EC2は、OSやインスタンスタイプを選んで仮想サーバーを起動できるコンピューティングサービスです。",
        incorrect: {
          "0": "Amazon S3はオブジェクトストレージで、仮想サーバーとしてOSを動かすサービスではありません。",
          "1": "Amazon Route 53はDNSサービスで、名前解決やルーティングを担います。サーバーを提供するものではありません。",
          "3": "Amazon SNSは通知を送信するメッセージングサービスで、仮想サーバーを提供するものではありません。"
        }
      }
    },
    {
      id: "beginner-008",
      difficulty: "beginner",
      text: "MySQLやPostgreSQLなどのデータベースを、バックアップやパッチ適用を自動化して運用できるサービスはどれですか。",
      choices: [
        "Amazon CloudFront",
        "AWS CloudTrail",
        "Amazon SQS",
        "Amazon RDS"
      ],
      answerIndex: 3,
      explanation: {
        correct: "Amazon RDSはリレーショナルデータベースのマネージドサービスで、バックアップやパッチ適用、マルチAZ構成などを支援します。",
        incorrect: {
          "0": "Amazon CloudFrontはコンテンツ配信ネットワーク(CDN)で、データベースを運用するサービスではありません。",
          "1": "AWS CloudTrailはAPI操作の履歴を記録する監査用サービスで、データベース機能は持ちません。",
          "2": "Amazon SQSはメッセージキューイングサービスで、リレーショナルデータベースの代わりにはなりません。"
        }
      }
    },
    {
      id: "beginner-009",
      difficulty: "beginner",
      text: "サーバーを管理せず、イベントをきっかけにコードを実行でき、実行時間に応じて課金されるサービスはどれですか。",
      choices: [
        "AWS Lambda",
        "Amazon EBS",
        "Amazon VPC",
        "AWS Billing"
      ],
      answerIndex: 0,
      explanation: {
        correct: "AWS Lambdaはサーバーレスでコードを実行でき、リクエスト数と実行時間に応じた課金のため、サーバー管理が不要です。",
        incorrect: {
          "1": "Amazon EBSはEC2用のブロックストレージで、コードを実行するサービスではありません。",
          "2": "Amazon VPCは仮想ネットワークを構築するサービスで、コードの実行機能は持ちません。",
          "3": "AWS Billingは請求や料金の確認を行う機能であり、コードを実行するサービスではありません。"
        }
      }
    },
    {
      id: "beginner-010",
      difficulty: "beginner",
      text: "AWS上に論理的に分離された専用の仮想ネットワークを作成するサービスはどれですか。",
      choices: [
        "Amazon CloudWatch",
        "Amazon VPC",
        "AWS IAM",
        "Amazon DynamoDB"
      ],
      answerIndex: 1,
      explanation: {
        correct: "Amazon VPCは、IPアドレス範囲やサブネット、ルートテーブルなどを自分で設計できる仮想ネットワークを提供します。",
        incorrect: {
          "0": "Amazon CloudWatchは監視とログ、アラームのサービスで、ネットワークを構築するものではありません。",
          "2": "AWS IAMはユーザーや権限を管理するサービスで、ネットワークの分離を行うものではありません。",
          "3": "Amazon DynamoDBはNoSQLデータベースで、仮想ネットワークを作る機能はありません。"
        }
      }
    },
    {
      id: "beginner-011",
      difficulty: "beginner",
      text: "AWSリソースへのアクセスを、ユーザーやロールごとに許可・拒否するための権限管理サービスはどれですか。",
      choices: [
        "Amazon Route 53",
        "AWS CloudFormation",
        "AWS IAM",
        "Amazon CloudFront"
      ],
      answerIndex: 2,
      explanation: {
        correct: "AWS IAMは、ユーザー、グループ、ロール、ポリシーを使って誰が何にアクセスできるかを制御します。",
        incorrect: {
          "0": "Amazon Route 53はDNSサービスで、ドメイン名の解決を担当します。アクセス権限の管理は行いません。",
          "1": "AWS CloudFormationはテンプレートでインフラを構築するサービスで、権限管理が主目的ではありません。",
          "3": "Amazon CloudFrontはコンテンツ配信のCDNで、AWSリソースへの権限制御を担うサービスではありません。"
        }
      }
    },
    {
      id: "beginner-012",
      difficulty: "beginner",
      text: "EC2のCPU使用率などを監視し、しきい値を超えたときにアラームを発生させられるサービスはどれですか。",
      choices: [
        "AWS CloudTrail",
        "Amazon S3",
        "Amazon SQS",
        "Amazon CloudWatch"
      ],
      answerIndex: 3,
      explanation: {
        correct: "Amazon CloudWatchはメトリクスの収集、ログの集約、アラームの設定ができる監視サービスです。",
        incorrect: {
          "0": "AWS CloudTrailはAPI呼び出しの操作履歴を記録するサービスで、CPU使用率などの性能監視は目的ではありません。",
          "1": "Amazon S3はオブジェクトストレージで、メトリクスを監視しアラームを出す主機能はありません。",
          "2": "Amazon SQSはメッセージキューで、リソースの状態を監視するサービスではありません。"
        }
      }
    },
    {
      id: "beginner-013",
      difficulty: "beginner",
      text: "世界中のエッジロケーションにコンテンツをキャッシュし、利用者に低遅延で配信するサービスはどれですか。",
      choices: [
        "Amazon CloudFront",
        "Amazon EBS",
        "AWS Lambda",
        "Amazon RDS"
      ],
      answerIndex: 0,
      explanation: {
        correct: "Amazon CloudFrontはCDNで、利用者に近いエッジロケーションからコンテンツを配信し、遅延を減らします。",
        incorrect: {
          "1": "Amazon EBSはEC2に接続するブロックストレージで、コンテンツの世界的な配信は行いません。",
          "2": "AWS Lambdaはコード実行サービスで、エッジキャッシュによる配信が主な役割ではありません。",
          "3": "Amazon RDSはデータベースサービスで、静的コンテンツのキャッシュ配信を行うものではありません。"
        }
      }
    },
    {
      id: "beginner-014",
      difficulty: "beginner",
      text: "ドメイン名をIPアドレスに変換する、可用性の高いDNSサービスはどれですか。",
      choices: [
        "AWS Trusted Advisor",
        "Amazon Route 53",
        "Amazon SNS",
        "Amazon EFS"
      ],
      answerIndex: 1,
      explanation: {
        correct: "Amazon Route 53はDNSサービスで、ドメイン登録、名前解決、ヘルスチェックに基づくルーティングを提供します。",
        incorrect: {
          "0": "AWS Trusted Advisorはコストやセキュリティなどの改善提案を行うサービスで、DNSの機能はありません。",
          "2": "Amazon SNSは通知を配信するサービスで、ドメイン名の名前解決は行いません。",
          "3": "Amazon EFSは共有ファイルストレージで、DNSとは関係がありません。"
        }
      }
    },
    {
      id: "beginner-015",
      difficulty: "beginner",
      text: "スキーマ固定でないキーバリュー型のデータを、ミリ秒単位の低遅延で扱えるフルマネージドNoSQLデータベースはどれですか。",
      choices: [
        "Amazon RDS for MySQL",
        "Amazon S3 Glacier",
        "Amazon DynamoDB",
        "AWS CloudTrail"
      ],
      answerIndex: 2,
      explanation: {
        correct: "Amazon DynamoDBはフルマネージドのNoSQLデータベースで、規模が拡大しても低遅延で読み書きできます。",
        incorrect: {
          "0": "Amazon RDS for MySQLはリレーショナルデータベースで、固定スキーマのテーブルを前提とします。NoSQLではありません。",
          "1": "Amazon S3 Glacierは長期アーカイブ用のストレージで、低遅延のデータベース用途には向きません。",
          "3": "AWS CloudTrailは操作履歴の記録サービスであり、アプリケーションデータを格納するデータベースではありません。"
        }
      }
    },
    {
      id: "beginner-016",
      difficulty: "beginner",
      text: "1つのメッセージを複数の購読者へメールやHTTPなどで一斉に通知するパブリッシュ/サブスクライブ型のサービスはどれですか。",
      choices: [
        "Amazon SQS",
        "AWS Lambda",
        "Amazon EBS",
        "Amazon SNS"
      ],
      answerIndex: 3,
      explanation: {
        correct: "Amazon SNSはトピックに発行したメッセージを、複数のサブスクライバーへ同時に配信するプッシュ型の通知サービスです。",
        incorrect: {
          "0": "Amazon SQSはメッセージをキューに溜めて受け手が取り出す方式で、1対多の一斉通知が主目的ではありません。",
          "1": "AWS Lambdaはコード実行サービスで、通知の配信基盤ではありません。SNSの配信先になることはあります。",
          "2": "Amazon EBSはブロックストレージで、メッセージ配信の機能はありません。"
        }
      }
    },
    {
      id: "beginner-017",
      difficulty: "beginner",
      text: "システム間の処理を疎結合にするため、メッセージを一時的にためて非同期に処理できるサービスはどれですか。",
      choices: [
        "Amazon SQS",
        "Amazon Route 53",
        "AWS IAM",
        "AWS Billing"
      ],
      answerIndex: 0,
      explanation: {
        correct: "Amazon SQSはメッセージキューで、送信側と受信側を切り離し、処理速度の差を吸収して非同期に処理できます。",
        incorrect: {
          "1": "Amazon Route 53はDNSサービスで、メッセージの一時保管や非同期処理の仕組みは持ちません。",
          "2": "AWS IAMは権限管理のサービスで、システム間のメッセージを仲介するものではありません。",
          "3": "AWS Billingは請求情報の確認機能で、アプリケーション間の連携とは関係がありません。"
        }
      }
    },
    {
      id: "beginner-018",
      difficulty: "beginner",
      text: "テンプレートにインフラ構成をコードとして記述し、AWSリソースを自動的に作成・更新できるサービスはどれですか。",
      choices: [
        "Amazon CloudWatch",
        "AWS CloudFormation",
        "Amazon CloudFront",
        "AWS Trusted Advisor"
      ],
      answerIndex: 1,
      explanation: {
        correct: "AWS CloudFormationはJSONやYAMLのテンプレートで構成を定義し、同じ環境を繰り返し再現できるIaCのサービスです。",
        incorrect: {
          "0": "Amazon CloudWatchは監視サービスで、テンプレートからリソースを作成する機能は持ちません。",
          "2": "Amazon CloudFrontはコンテンツ配信のCDNで、インフラを自動構築するサービスではありません。",
          "3": "AWS Trusted Advisorは環境の改善提案を行うサービスで、リソースの作成はしません。"
        }
      }
    },
    {
      id: "beginner-019",
      difficulty: "beginner",
      text: "EC2インスタンスにアタッチして、OSやデータの保存先として使えるブロックストレージはどれですか。",
      choices: [
        "Amazon S3",
        "Amazon Route 53",
        "Amazon EBS",
        "Amazon SNS"
      ],
      answerIndex: 2,
      explanation: {
        correct: "Amazon EBSはEC2にアタッチして使うブロックストレージで、OSのルートボリュームやデータ領域に利用できます。",
        incorrect: {
          "0": "Amazon S3はオブジェクトストレージで、APIでアクセスします。EC2へのブロックデバイスとしては直接使いません。",
          "1": "Amazon Route 53はDNSサービスで、データを保存するストレージではありません。",
          "3": "Amazon SNSは通知サービスで、データを保存する用途ではありません。"
        }
      }
    },
    {
      id: "beginner-020",
      difficulty: "beginner",
      text: "受信したトラフィックを複数のEC2インスタンスに振り分けるサービスはどれですか。",
      choices: [
        "AWS CloudTrail",
        "Amazon S3",
        "AWS Lambda",
        "Elastic Load Balancing(ELB)"
      ],
      answerIndex: 3,
      explanation: {
        correct: "Elastic Load Balancingは、受信トラフィックを複数のターゲットに分散し、異常なターゲットを避けて可用性を高めます。",
        incorrect: {
          "0": "AWS CloudTrailは操作履歴の記録サービスで、トラフィックの分散は行いません。",
          "1": "Amazon S3はオブジェクトストレージで、リクエストをEC2に振り分ける機能はありません。",
          "2": "AWS Lambdaはコード実行サービスで、EC2へのトラフィック分散を行うものではありません。"
        }
      }
    },
    {
      id: "beginner-021",
      difficulty: "beginner",
      text: "負荷に応じてEC2インスタンスの台数を自動で増減させるサービスはどれですか。",
      choices: [
        "Amazon EC2 Auto Scaling",
        "Amazon EBS",
        "AWS IAM",
        "Amazon Route 53"
      ],
      answerIndex: 0,
      explanation: {
        correct: "Amazon EC2 Auto Scalingは、設定したポリシーに基づいてインスタンス数を自動で増減させ、性能とコストを両立します。",
        incorrect: {
          "1": "Amazon EBSはストレージで、インスタンス台数を自動調整する機能はありません。",
          "2": "AWS IAMは権限管理のサービスで、台数の増減は行いません。",
          "3": "Amazon Route 53はDNSサービスで、インスタンスの台数を調整する機能は持ちません。"
        }
      }
    },
    {
      id: "beginner-022",
      difficulty: "beginner",
      text: "「いつ、誰が、どのAPIを呼び出したか」というAWSアカウント内の操作履歴を記録するサービスはどれですか。",
      choices: [
        "Amazon CloudWatch Metrics",
        "AWS CloudTrail",
        "Amazon SQS",
        "Amazon CloudFront"
      ],
      answerIndex: 1,
      explanation: {
        correct: "AWS CloudTrailは、AWSアカウント内のAPI呼び出しや操作を記録し、監査やセキュリティ調査に役立ちます。",
        incorrect: {
          "0": "CloudWatch Metricsは性能指標を収集する機能で、誰がAPIを呼び出したかという操作履歴の記録が目的ではありません。",
          "2": "Amazon SQSはメッセージキューで、アカウント内の操作履歴を記録する機能はありません。",
          "3": "Amazon CloudFrontはコンテンツ配信のサービスで、API操作の監査証跡を取得する目的のものではありません。"
        }
      }
    },
    {
      id: "beginner-023",
      difficulty: "beginner",
      text: "コスト最適化、セキュリティ、耐障害性などの観点で、AWS環境の改善点を提案してくれるサービスはどれですか。",
      choices: [
        "Amazon SNS",
        "Amazon EFS",
        "AWS Trusted Advisor",
        "AWS Lambda"
      ],
      answerIndex: 2,
      explanation: {
        correct: "AWS Trusted Advisorは、ベストプラクティスに照らして環境を確認し、コストやセキュリティ面の改善提案を提示します。",
        incorrect: {
          "0": "Amazon SNSは通知サービスで、環境を評価して改善提案を出す機能はありません。",
          "1": "Amazon EFSは共有ファイルストレージで、環境の評価や提案を行うものではありません。",
          "3": "AWS Lambdaはコード実行サービスで、環境のチェックを行うことを目的としたものではありません。"
        }
      }
    },
    {
      id: "beginner-024",
      difficulty: "beginner",
      text: "毎月の利用料金に上限の目安を設定し、超過しそうなときに通知を受け取りたい場合に使う機能はどれですか。",
      choices: [
        "Amazon CloudFront",
        "AWS CloudTrail",
        "Amazon VPC",
        "AWS Budgets"
      ],
      answerIndex: 3,
      explanation: {
        correct: "AWS Budgetsは、コストや使用量の予算を設定し、実績や予測がしきい値を超えると通知してくれます。",
        incorrect: {
          "0": "Amazon CloudFrontはCDNで、料金の予算管理や通知を行う機能ではありません。",
          "1": "AWS CloudTrailは操作履歴の記録サービスで、料金の予算を管理するものではありません。",
          "2": "Amazon VPCは仮想ネットワークを作るサービスで、予算の設定や通知とは関係がありません。"
        }
      }
    },
    {
      id: "beginner-025",
      difficulty: "beginner",
      text: "AWSアカウントのルートユーザーを保護するための対策として、最も推奨されるものはどれですか。",
      choices: [
        "MFA(多要素認証)を有効にし、日常の作業では使わない",
        "パスワードをチーム全員で共有して使う",
        "アクセスキーを作成してアプリケーションに埋め込む",
        "日常の管理作業は常にルートユーザーで行う"
      ],
      answerIndex: 0,
      explanation: {
        correct: "ルートユーザーは全権限を持つため、MFAを有効にし、日常作業はIAMユーザーやロールで行うのが基本です。",
        incorrect: {
          "1": "パスワードを共有すると、誰が操作したか追跡できず漏えいのリスクも高まります。",
          "2": "ルートユーザーのアクセスキーをアプリに埋め込むと、漏えい時の被害が極めて大きくなります。",
          "3": "全権限を持つルートユーザーを日常的に使うのは、最小権限の原則に反し危険です。"
        }
      }
    },
    {
      id: "beginner-026",
      difficulty: "beginner",
      text: "ほとんど参照しない長期保存データを、低コストで保管したい場合に適したストレージクラスはどれですか。",
      choices: [
        "Amazon S3 Standard",
        "Amazon S3 Glacier",
        "Amazon EBS gp3",
        "インスタンスストア"
      ],
      answerIndex: 1,
      explanation: {
        correct: "Amazon S3 Glacier系のストレージクラスは、アーカイブ向けに保管コストを抑えられます。取り出しには時間や費用がかかります。",
        incorrect: {
          "0": "Amazon S3 Standardは頻繁にアクセスするデータ向けで、長期保管のみの用途では割高になります。",
          "2": "Amazon EBS gp3はEC2に接続する汎用SSDで、長期アーカイブ向けの低コスト保管には向きません。",
          "3": "インスタンスストアはインスタンスの停止や終了でデータが消える一時的な領域で、長期保管には使えません。"
        }
      }
    },
    {
      id: "beginner-027",
      difficulty: "beginner",
      text: "複数のEC2インスタンスから同時にマウントして共有できる、マネージドなファイルストレージはどれですか。",
      choices: [
        "Amazon EBS",
        "Amazon Route 53",
        "Amazon EFS",
        "Amazon SNS"
      ],
      answerIndex: 2,
      explanation: {
        correct: "Amazon EFSは、NFSで複数のEC2インスタンスから同時にマウントでき、容量が自動で伸縮する共有ファイルシステムです。",
        incorrect: {
          "0": "Amazon EBSは基本的に1つのインスタンスにアタッチして使うブロックストレージで、共有ファイルシステムではありません。",
          "1": "Amazon Route 53はDNSサービスで、ファイルを保存・共有するものではありません。",
          "3": "Amazon SNSは通知サービスで、ファイルシステムとしてマウントできません。"
        }
      }
    },
    {
      id: "beginner-028",
      difficulty: "beginner",
      text: "性能不足に対し、サーバーの台数を増やして処理を分散する方式を何と呼びますか。",
      choices: [
        "スケールアップ",
        "スケールダウン",
        "リフト&シフト",
        "スケールアウト"
      ],
      answerIndex: 3,
      explanation: {
        correct: "スケールアウトは、サーバーの台数を増やして負荷を分散する水平方向の拡張で、クラウドと相性が良い方式です。",
        incorrect: {
          "0": "スケールアップは、1台のサーバーのCPUやメモリを大きくする垂直方向の拡張で、台数は増えません。",
          "1": "スケールダウンはリソースを小さくする縮小方向の操作で、性能不足の解消にはなりません。",
          "2": "リフト&シフトは、既存システムを大きく変えずクラウドへ移行する手法で、台数を増やす方式ではありません。"
        }
      }
    },
    {
      id: "beginner-029",
      difficulty: "beginner",
      text: "コードをアップロードするだけで、サーバー構築やロードバランサーの設定などをAWSが自動的に行ってくれるサービスはどれですか。",
      choices: [
        "AWS Elastic Beanstalk",
        "Amazon S3 Glacier",
        "AWS CloudTrail",
        "AWS Budgets"
      ],
      answerIndex: 0,
      explanation: {
        correct: "AWS Elastic Beanstalkは、アプリケーションをアップロードすると、EC2やELB、Auto Scalingなどの環境を自動で構築・運用します。",
        incorrect: {
          "1": "Amazon S3 Glacierはアーカイブ用のストレージで、アプリケーション環境を構築する機能はありません。",
          "2": "AWS CloudTrailは操作履歴を記録するサービスで、環境構築を自動化するものではありません。",
          "3": "AWS Budgetsは予算管理のサービスで、アプリケーションを実行する環境を提供しません。"
        }
      }
    },
    {
      id: "beginner-030",
      difficulty: "beginner",
      text: "AWSのWell-Architected Frameworkについて、正しい説明はどれですか。",
      choices: [
        "AWSが提供する仮想サーバーの種類の名称である",
        "安全で効率的なシステムを設計するための、ベストプラクティスを体系化した指針である",
        "AWSの料金を自動で割り引くための契約プランである",
        "AWSリソースの操作履歴を保管するサービスである"
      ],
      answerIndex: 1,
      explanation: {
        correct: "Well-Architected Frameworkは、運用上の優秀性、セキュリティ、信頼性などの観点でベストプラクティスをまとめた設計指針です。",
        incorrect: {
          "0": "仮想サーバーの種類を示す名称ではありません。インスタンスタイプはAmazon EC2側の概念です。",
          "2": "料金を割り引く契約プランはSavings Plansなどで、Well-Architected Frameworkは設計の指針です。",
          "3": "操作履歴を保管するのはAWS CloudTrailで、Well-Architected Frameworkはサービスではなく指針です。"
        }
      }
    }
  );
})();
