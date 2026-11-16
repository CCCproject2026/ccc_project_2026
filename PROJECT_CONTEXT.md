# プロジェクト概要（Agent用）

この文書は、作業を始めるAgentがリポジトリの全体像を短時間で把握するための入口です。実装・API契約・モデル契約を変更または断定する前に、必ず対象コードと対応する契約文書を確認してください。

## 目的と安全上の前提

高齢者向けの転倒予防・検知支援システムです。AIの出力はリスク候補情報であり、医学的診断や転倒の確定判定ではありません。人間の確認と対応記録を維持します。

## 現在の構成

| 領域 | 場所 | 主な責務 |
| --- | --- | --- |
| Web | `main/web` | Next.js App Router。Clerk認証に加え、サーバー側でDBのスタッフ状態・権限を確認する。Prisma/PostgreSQLを利用する。 |
| AI Server | `main/ai/app` | FastAPI。MQTTセンサーデータの検証、有限Queue、単一Worker、必要時のDevice API照会、学習済みモデル/Scalerの読込を担う。 |
| IoT模擬送信 | `main/iot/mock-data` | 開発用の合成MQTTセンサーデータを送る。実機Firmwareはこのリポジトリでは確認できていない。 |
| Broker | `main/broker` | 開発用Mosquitto設定。匿名・非TLS設定を本番へ転用しない。 |
| 契約・開発手順 | `docs/contracts`、`docs/development`、`docs/agent-coding` | API/MQTTの根拠、開発・検証・レビュー手順。 |

## 現行のデータフロー

```text
IoT模擬送信
  -> Mosquitto (`fall/{device_id}/data`)
  -> AI: Paho callback
  -> 有限Queue
  -> 単一Workerでpayload/時刻/topicを検証
  -> （`DEVICE_API_URL` と `DEVICE_API_TOKEN` を有効に設定した場合）Device APIでACTIVEを確認
  -> 受理ログ・メトリクス
```

AIは起動時にモデルとScalerを読み込みます。しかし現行の `InputPipeline` は、検証済みバッチの受理が終点です。連続Buffer、Window生成、前処理、推論、結果publish、Webへの結果連携は接続されていません。したがって、MQTT受信成功は推論成功や転倒確定を意味しません。`/health/ready` は現時点で503を返します。

Webにはダッシュボード、利用者（Elder）、デバイス、スタッフ、プロフィール、対応記録の機能があります。AI結果をWebの転倒履歴・対応記録に直接作成する経路は、現行実装として断定しません。

## 最初に読む順序

1. `AGENTS.md` — 安全・開発・報告の共通ルール
2. この `PROJECT_CONTEXT.md` — 現行の入口情報
3. `docs/agent-coding/investigation.md` — 調査時点の詳細索引。記載内容は対象コードで再確認する
4. `docs/development/workflow.md` と `docs/agent-coding/workflow.md` — Issue、設計、レビュー、Git運用
5. 作業領域に応じた資料とコード
   - Web: `main/web/README.md`、対象の `src/app` / `src/features` / `src/shared`
   - AI/IoT: `main/ai/README.md`、`docs/contracts/device-api/README.md`、対象の `main/ai/app` / `main/iot/mock-data`
   - 検証: `docs/agent-coding/commands.md`

## 変更時に守る境界

- `src/app` は薄くし、Webの機能実装は `src/features`、共通部品は `src/shared` に置く。認証だけでなくDBのスタッフ有効性・権限もサーバー側で確認する。
- AIのdomain層をFastAPI/Pahoへ依存させない。MQTT callbackでは重い処理をせず、Workerは1つを維持する。
- MQTTの単位・軸順序・周波数・Window・前処理、モデル/Scalerの互換性、結果topic/payloadは推測で確定しない。再学習、モデル差替え、Scaler再fitは明示指示がない限り行わない。
- Device APIは専用Bearer認証を使用する。外部入力、重複、timeout/retry、競合、migrationの影響を確認する。
- Secret、`.env`、実利用者データ、生payloadを出力・共有しない。検証には合成データを使う。

## 実装前の確認

最初に `git status --short` で未コミット変更を保護します。Taskの受入条件と担当範囲を確認し、変更に必要な設計・契約を読んでください。古いルート `README.md` のHTTP送信、画像CNN、Socket.ioの説明は、現行実装の根拠にしません。

検証コマンドは `docs/agent-coding/commands.md` から変更範囲に対応するものだけ選びます。lint/buildだけで実機通信、認可、モデル互換性、推論結果配信が成功したとは結論づけません。
