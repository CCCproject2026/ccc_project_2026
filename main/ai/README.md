# AI Server

MQTT Brokerから最大100点のセンサーバッチを受信し、既存のJSON検証・UTC時刻変換・Topic照合へ接続しています。
現在の終点は検証済みバッチの受理件数とログ記録です。Device API、Buffer、モデル推論、結果Publishは未接続です。

## 起動

Docker Composeを使う場合、リポジトリ直下から実行します。

```sh
docker compose up -d --build ai-server
docker compose logs -f ai-server
```

依存する `mqtt-broker` も起動します。Compose内の接続先は `mqtt-broker:1883`。
`.env.example` はローカル開発用で、TLSなし・匿名の既存Brokerへ接続します。
本番はTLS、必要なCA、認証、Broker ACLを設定してください。

ホストから単体起動する場合:

```sh
cd main/ai
uv sync --locked
uv run --locked --env-file .env.example uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

`.env.example` は `127.0.0.1:1883` を使用します。ComposeのAIが同時起動中なら停止するか、
HTTPポートと `MQTT_CLIENT_ID` を別の値にしてください。同じclient IDは接続を奪い合います。
複数プロセスによる二重購読を避けるため1 worker・reloadなしで起動します。
独自設定はGit管理外の `.env` に保存して `--env-file .env` で読み込みます。

## 処理経路とコードを読む順序

```text
main.py → core/lifespan.py が依存関係を組み立てる
  → processing/pipeline.py: InputPipeline.start()
    → integrations/mqtt_client.py: MqttConnection.start()
      → CONNACK → fall/+/data をsubscribe → SUBACK
      → on_message → MqttSensorInput.receive() → 有限Queue
    → 単一Worker → MqttSensorInput.process()
      → integrations/sensor_json.py: decode_batch()
      → application/sensor_input.py: accept()
      → InputPipeline._accept_batch(): 世代の再確認・受理件数・ログ
```

| モジュール | 責務 |
|---|---|
| `main.py` | HTTP healthのみ。センサー用HTTP POSTは設けない |
| `core/config.py` | 環境設定の読込・検証 |
| `core/lifespan.py` | 全体の組立て、起動と停止の所有 |
| `integrations/mqtt_client.py` | Paho接続・購読・再接続と既存受信アダプター |
| `integrations/sensor_json.py` | 外部JSONの検証と内部型への変換 |
| `application/sensor_input.py` | Topicとcodeの照合、注入したconsumeの呼出し |
| `domain/sensor.py` | 不変のSensorBatch / SensorSample |
| `processing/pipeline.py` | 単一Worker、Queue掃除、今回の受理終点 |

依存は外部アダプターからapplication/domainへ向けます。domainはPahoやFastAPIに依存しません。
`processing/pipeline.py` は今回の受信処理を組み立てる側で、既存配置を維持しています。
データ型は `domain/sensor.py` から直接importします。未使用の再公開用 `core/schemas.py` は削除しました。その他のprocessingモジュールは今後の実装です。

## 接続と障害時の動作

- Paho 2.1.0、Callback API v2、MQTT 3.1.1、clean sessionを使用。
- `fall/+/data` を購読。既定QoS=0はローカル用設定で、環境変数で0/1を選択可能。
- 初回接続不能・一時切断は1〜30秒のbackoffで再接続。再接続ごとに再購読。
- 認証/CONNACK拒否・SUBACK拒否・証明書検証エラーは切断して受信不可にする。設定修正後に再起動する。
- callbackは受信サイズ/Retain判定と非ブロッキングQueue投入のみ。JSON解析はWorker側。
- 最大64KiB/メッセージ、16バッチのQueue。payload自体は最大1MiB（オブジェクト分は別）。
- 切断・満杯時に全体の連続性欠落を通知する。再購読前には旧Queueと通知を消し込み、新着を保護する。
  満杯時の掃除は保守的な全Queue破棄。不正JSON・サイズ超過・Retain等は当該入力だけを拒否する。
- 接続世代をdecode前と受理直前に照合し、処理中の切断にも対応する。
- 現在Bufferは未実装。将来追加する場合は世代変更・満杯時の全Buffer reset、入力不良時の対象DeviceのみのresetをWorkerへ追加する。
- 正常な入力は `SENSOR_BATCH_ACCEPTED samples=100`、不正入力は安全な理由コードを記録。
  生payload・認証情報はログへ出さない。今回のカウンターは再起動で0に戻り、DB保存はしない。
- 終了時は受付停止→MQTT停止→Worker終了待ち→残りQueue破棄。MQTT/Workerの待機予算は合計5秒。超過は異常終了として報告する。Pythonの稼働中スレッドを強制終了する保証はない。未処理データは再送・復元しない。
- Envelopeは受信UTCに加えてmonotonic時刻を持つ。待機時間の計測用であり、未合意の鮮度閾値はまだ適用しない。

## Health

| Endpoint | 200の条件 |
|---|---|
| `/health/live` | アプリ起動中かつ入力Workerが生存 |
| `/health/input` | Broker接続・SUBACK成功・入力Worker生存。受理/拒否件数も返す |
| `/health/ready` | 現在は常に503。理由は `inference_not_implemented` |

受信できることと、転倒推論できることを分けて表示します。
`rejected_batches` はWorkerで拒否した件数です。Queue投入前のサイズ/Retain拒否・満杯破棄は含みません。
Broker切断だけではliveを落とさず、inputを503にします。

## 設定

| 設定 | ローカル既定値 / 用途 |
|---|---|
| `MQTT_HOST`, `MQTT_PORT` | `127.0.0.1`, `1883`。Composeはhostを上書き |
| `MQTT_CLIENT_ID` | `ccc-ai-input`。並行起動時は別ID |
| `MQTT_KEEPALIVE` | 60秒 |
| `MQTT_QOS` | 0（0/1対応） |
| `MQTT_TLS` | false。TLS利用時はtrue、通常port=8883 |
| `MQTT_CA_FILE` | 空ならOS標準CA。指定時はTLS必須 |
| `MQTT_USERNAME`, `MQTT_PASSWORD` | 空。認証利用時に設定 |

Window/モデル/API設定は将来用の既存項目。未合意のStepや鮮度許容を今回の受信処理へ適用していません。

## 確認結果と開発ツール

2026-10-29、ローカルMosquittoと別ポート18080の新実装で、既存IoT生成器由来の100点を送信。
受理100点→不正JSON拒否1件→正常データを再受理し累計200点、input/live=200、ready=503を確認。
テストファイルは追加せず、一時的なコマンドで実通信を確認しました。TLS/認証付きBrokerは未検証です。

依存は `pyproject.toml` と `uv.lock` で管理し、変更時は `uv lock` を実行します。
Dockerは `uv sync --locked` で不整合を拒否します。
既存の整形・静的チェックは `make -C main/ai fix` / `make -C main/ai check` を利用できます。

入力項目の詳細: [バッチ入力設計](../../docs/detailed_design/ai-server/07_Batch_Input実装.md)

設計レビュー後、正常・不正・正常を連続送信して正常200点/不正1件を確認。停止所要約0.15秒。停止待ち上限と証明書エラー分類は一時的な異常再現でも確認した。Worker異常時のプロセス終了・自動復旧、ログ集約、鮮度検査は後続タスクであり、全設計実装済みとは扱わない。
