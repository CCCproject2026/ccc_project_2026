# AI Server

MQTT Brokerから最大100点のセンサーバッチを受信し、既存のJSON検証・UTC時刻変換・Topic照合へ接続しています。
単一Workerで入力検証→Device確認（設定時）→デバイス別Buffer→100点Window→実モデル判定→MQTT結果配信まで接続しています。
Device API未設定時はローカル検証用に推論します。実機の特徴軸・既知入出力との照合は未完了で、本番Readyとは区別します。

学習済み重み・Scalerは `artifacts/sisfall_model/` から起動時に一度ロードします。
`processing/preprocessing.py` に標準化、`processing/inference.py` にCPU推論を実装済みです。
既知入出力による意味的互換性確認は未完了です。結果配信は#192のレビュー案（基本4項目＋event_id）をローカル試験用に採用しています。
[モデル受領状況・manifest・再現手順](artifacts/README.md)を参照してください。

Device APIの実装契約・キャッシュ状態表・応答例は
[AI-03 Device API・キャッシュ契約](../../docs/contracts/device-api/README.md)を参照してください。
Webの検索API・AIクライアント・キャッシュ・Worker接続は実装済みです。実通信と担当者間の合意は未確認です。

## 起動

### ダミーデータから判定結果を確認する

以下はすべてリポジトリルートで実行します。モデル・Scaler配置後、AIと依存Brokerを起動します。

```sh
docker compose up -d --build ai-server
docker compose logs -f ai-server
```

`MQTT_SUBSCRIBED`後、別ターミナルで**送信前に**結果を購読します。

```sh
docker compose exec -T mqtt-broker mosquitto_sub -h 127.0.0.1 -t 'fall/+/events' -q 1 -v
```

さらに別ターミナルで送信します（既存の仮想環境を使用）。

```sh
main/ai/.venv/bin/python main/iot/mock-data/publish_telemetry.py --limit 3
curl -sS http://localhost:8000/health/input | main/ai/.venv/bin/python -m json.tool
```

購読側へ`device_code / result / detected_at / model_version / event_id`のJSONが届きます。
AIログには`INFERENCE_RESULT result=fall`または`normal`、確率、処理時間が出ます。
ダミーデータの名称と実モデルの分類が一致する保証はありません。結果を決め打ち・改変しません。
healthの`inference.completed_windows / last_result / publish`で計算と配信を確認します。
last_resultは最後の生成結果であり、現在の人物状態やWeb受信成功を示すものではありません。
`publish.accepted`はclient受付、`acked`はBroker ACK、`delivery_unknown`は送達不明を観測した累計です。
timeout後にACKが来る場合はunknownとackedの両方に含まれます。
切断直前のpublishがNO_CONNの場合、Paho内部に残る可能性があるためunknownに数え、ACK追跡対象にはしません。
新規Publishで再送せず、Paho内部送信Queueも100件に制限します。
結果はretain=falseで、後から購読しても以前の結果は取得できません。Web画面・Alert機能は本変更の対象外です。

### ローカル推論の時系列方針

- 50Hzの間隔10〜30ms、100点の幅1.88〜2.08秒を許容。補間・ゼロ埋めはしない。
- 最大100点バッチでは先頭が元々約2秒古いため、**バッチ末尾の古さ2秒・未来1秒**と全体幅2.08秒以下を別々に検査する。
  受信時・Worker処理時・Device API待機後で確認する。単点送信時はその点が末尾となる。
- Window生成後、推論の前後にもWindow末尾の古さ2秒・未来1秒、5秒OFFLINE、世代、欠落、停止を確認する。
  これらは開発用候補値であり、実機の時刻精度・バッチ配送遅延との合意済み値ではない。
- 検証エラーは当該バッチを拒否し対象Bufferをresetする。構造的推論エラーはWorker停止、その他の推論例外は3連続で停止。
  Worker停止はlive/inputの503で検知できるが、自動再起動は未実装。
- MQTT再接続でclient内の古いQoS 1結果が遅延配送される可能性がある。Webのevent_id・鮮度検査は別途必要。

### 検証コマンド

```sh
cd main/ai
.venv/bin/python -m unittest discover -s tests -v
# 実モデル＋専用localhost Brokerでの結合試験（通常の開発Brokerと分離する）
MQTT_TEST_PORT=18884 .venv/bin/python -m unittest discover -s tests -p test_mqtt_inference.py -v
```

結合試験はローカルモデル・Scalerと、指定portの匿名・平文テストBrokerが必要です。
環境変数未指定時は結合試験のみskipします。ランダムなテストdevice/client IDを使います。

### 通常の起動手順

Docker Composeを使う場合、リポジトリ直下から実行します。

事前に `artifacts/sisfall_model/best_1dcnn_pytorch.pth` と `scaler.pkl` を配置してください。
両ファイルはGit管理外です。Dockerにも同じファイルとmanifestをコピーします。
欠落・hash不一致・ロード失敗時はMQTT受付前に起動を中止します。

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
  → processing/inference.py: InferenceEngine.load()
    → manifest・hash確認 → CPUモデル・Scalerを一度ロード
  → processing/pipeline.py: InputPipeline.start()
    → integrations/mqtt_client.py: MqttConnection.start()
      → CONNACK → fall/+/data をsubscribe → SUBACK
      → on_message → MqttSensorInput.receive() → 有限Queue
    → 単一Worker → MqttSensorInput.process()
      → integrations/sensor_json.py: decode_batch()
      → application/sensor_input.py: accept()
      → integrations/device.py: Cache / HTTPS照会（設定時のみ）
      → InputPipeline._accept_batch(): 世代・鮮度の再確認
        → BufferManager: 100点Window、Stepごとにimmutableコピー
        → InferenceEngine.predict(): 前処理・CPU推論
        → 終了／欠落／世代／鮮度／Deviceキャッシュ失効の再確認
        → ResultPublisher: fall/{device_code}/events、QoS 1、retain=false
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
| `processing/pipeline.py` | 単一Worker、Queue・Buffer掃除、推論・送信の組立て |
| `processing/buffer.py` | 最大128デバイス、各100点、連続性・鮮度検証 |
| `processing/result.py` | UTC結果JSON・event_id、有限送信・非ブロッキングACK追跡 |

依存は外部アダプターからapplication/domainへ向けます。domainはPahoやFastAPIに依存しません。
`processing/pipeline.py` は今回の受信処理を組み立てる側で、既存配置を維持しています。
データ型は `domain/sensor.py` から直接importします。未使用の再公開用 `core/schemas.py` は削除しました。運用ログの構造化・転送は今後の実装です。

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
- Workerが接続世代変更・満杯時に全Bufferをresetし、JSON/Schema不良時は安全に解析できるTopicの対象Deviceをresetする。
- Bufferはデバイス別100点・最大128台。5秒無通信で削除。重複最終時刻は点数に加えず、逆行は拒否、欠測は新しい区間から開始する。
- 満杯時の全破棄は暫定方針であり、1台のバーストが他端末にも影響する。
  端末間の連続性を共有する要件は現実装にはないため、端末単位の欠落通知・Buffer resetと、
  満杯時は新着だけを拒否する方式への見直しを検討する。公平性が必要なら端末別Queue・上限も検討する。
  切断時の世代失効とは分けて設計し、方針決定までは現在の全破棄動作を維持する。
- 正常な入力は `SENSOR_BATCH_ACCEPTED samples=100`、不正入力は安全な理由コードを記録。
  生payload・認証情報はログへ出さない。今回のカウンターは再起動で0に戻り、DB保存はしない。
- 終了時は受付停止→Worker終了待ち→受付済み結果のACK待ち→MQTT停止→残りQueue破棄。全体5秒、通信終了用0.5秒を予約する。超過は異常終了として報告する。Pythonの稼働中スレッドを強制終了する保証はない。未処理データは再送・復元しない。
- Envelopeは受信UTCに加えてmonotonic時刻を持つ。待機時間の計測用。ローカルの鮮度方針は下記に明記する。

## Health

| Endpoint | 200の条件 |
|---|---|
| `/health/live` | アプリ起動中かつ入力Workerが生存 |
| `/health/input` | Broker接続・SUBACK成功・入力Worker生存。受理/拒否件数も返す |
| `/health/ready` | 現在は常に503。理由は `model_compatibility_unverified`。モデル読込状態・version・互換性未確認も返す |

受信できることと、転倒推論できることを分けて表示します。
`rejected_batches` はWorkerの拒否とQueue投入前の拒否の合計です。
`receive_rejections` はQueue投入前の拒否を `retained_sensor` / `empty_payload` /
`payload_too_large` / `queue_full` 別に集計します。同じ理由コードをWARNINGログにも記録します。
Queueから掃除した未処理データは `discarded_batches` に別集計し、`rejected_batches` には含めません。
`queue_discards` は掃除の契機別の件数です。`continuity_reset` は満杯・切断による欠落通知をWorkerが
処理した場合、`reconnect` は再購読前、`shutdown` は終了時の掃除を表します。
欠落通知は共有Eventのため、`continuity_reset` だけでは満杯と切断を区別できません。
実際に取り除いた件数を `SENSOR_QUEUE_DISCARDED reason=... batches=...` のWARNINGログにも記録します。
Queue投入を拒否した新着やWorkerが取り出し済みのバッチは、この破棄件数に二重計上しません。
拒否・破棄の合計は `rejected_batches + discarded_batches` で確認できます。
200 `receiving` は受信準備状態を表し、拒否がないことは保証しません。
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
| `DEVICE_API_URL` | WebのHTTPS origin。`/api`は含めない |
| `DEVICE_API_TOKEN` | Webと共通の32文字以上の専用参照トークン |

Device APIの両設定が空の場合はDevice確認を省略するローカル推論です。片方だけ・HTTP URL・不正tokenは起動エラー。
設定時はACTIVEだけを受理し、INACTIVE/NOT_FOUND/UNKNOWNは拒否件数へ加算します。
キャッシュはACTIVE/INACTIVEが30秒、404が5秒、最大128件。失敗時は共通5秒cooldownと
Retry-Afterを適用し、401/403では再起動まで要求を停止します。
`/health/input` と `/health/ready` の `device_api` で設定有無・障害・認証停止・要求数・hit数を確認できます。
API障害でも入力Workerが生存していれば `/health/input` のHTTP statusは200のままです。

`MODEL_PATH` / `SCALER_PATH` / `MODEL_VERSION` が空の場合はmanifestの値を使います。
相対pathは作業ディレクトリによらず `main/ai` 基準です。上書きpathもmanifestのhashと照合します。
Window設定は後続接続用。StepはWINDOW_STEP（既定50）を使用します。鮮度許容値は下記のローカル方針であり、実機での合意は未完了です。

## 確認結果と開発ツール

2026-10-29、ローカルMosquittoと別ポート18080の新実装で、既存IoT生成器由来の100点を送信。
受理100点→不正JSON拒否1件→正常データを再受理し累計200点、input/live=200、ready=503を確認。
テストファイルは追加せず、一時的なコマンドで実通信を確認しました。TLS/認証付きBrokerは未検証です。

依存は `pyproject.toml` と `uv.lock` で管理し、変更時は `uv lock` を実行します。
Dockerは `uv sync --locked` で不整合を拒否します。
既存の整形・静的チェックは `make -C main/ai fix` / `make -C main/ai check` を利用できます。

入力項目の詳細: [バッチ入力設計](../../docs/detailed_design/ai-server/07_Batch_Input実装.md)

設計レビュー後、正常・不正・正常を連続送信して正常200点/不正1件を確認。停止所要約0.15秒。停止待ち上限と証明書エラー分類は一時的な異常再現でも確認した。Worker異常時のプロセス終了・自動復旧、ログ集約、鮮度検査は後続タスクであり、全設計実装済みとは扱わない。

### PR #220 追加レビュー対応（2026-11-06）

- `ts` と `ts_ms` はUTCで比較し、差の絶対値1ms以下を許容する。1ms超の不一致とtimezone不一致は引き続き拒否する。各サンプルの時刻は `ts_ms + t` で生成する。
- 終了時は合計5秒の待機予算内でWorker用に0.5秒を予約し、MQTT停止だけで予算を使い切ることを防ぐ。
- 確認: Ruff check / format --check（AI・IoT全16ファイル）、git diff --checkを通過。一時コマンドで±1msの受理・±1.001msの拒否、timezone不一致の拒否、ts_ms基準の維持、待機中Workerの終了を確認。MQTT停止をタイムアウトさせる代替処理でも約4.5秒でWorkerが終了し、MQTT側の例外が保持されることを確認した。テストファイルは追加していない。実機IoT・実Brokerでの再確認は未実施。
