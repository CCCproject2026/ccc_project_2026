# Mockセンサーデータの生成・MQTT送信

Python 3.11以上を使用します。生成器は標準ライブラリのみ、送信器は `paho-mqtt==2.1.0` が必要です。
以下はプロジェクトルートで実行するコマンドです。送信器を実行すると実際にBrokerへ送信します。

```sh
# 必要ならJSONLを再生成（既存のtelemetry-3min.jsonlを置き換える）
python3 main/iot/mock-data/generate_telemetry.py

# 最初の3バッチだけ送信
uv run --no-project --python 3.11 --with paho-mqtt==2.1.0 \
  main/iot/mock-data/publish_telemetry.py --limit 3

# 全90バッチを送信（約3分）
uv run --no-project --python 3.11 --with paho-mqtt==2.1.0 \
  main/iot/mock-data/publish_telemetry.py --host 127.0.0.1 --port 1883
```

送信先の既定値は `127.0.0.1:1883`。生成ファイルの1行を1メッセージとし、2秒間隔、QoS 0、retain=falseで送ります。
Topicは各行のdevice_idから `fall/{device_id}/data` を作ります。既定の生成データでは `fall/esp32-mpu6050-01/data` です。

送信前にBrokerとAIを起動し、AIの `MQTT_SUBSCRIBED` ログを確認してください。
AIでDevice API確認を有効にしている場合、同じdeviceCodeをWebのDBにACTIVEで登録する必要があります。

## オプション

| オプション | 用途 |
|---|---|
| `--input PATH` | 別のJSONL。既定はこのフォルダのtelemetry-3min.jsonl |
| `--host HOST --port PORT` | Broker接続先 |
| `--device-id CODE` | 本文device_idとTopicを同じcodeで上書き |
| `--limit N` | 先頭Nバッチだけ送信 |
| `--qos 0` / `--qos 1` | 0が既定。1はBrokerのPUBACKまで待機 |
| `--keep-timestamps` | 保存済みts/ts_msを維持。省略時は送信時刻に合わせて更新 |
| `--tls` | CA・hostname検証付きTLS。port未指定なら8883 |
| `--ca-file PATH` | TLS用の追加CAファイル |
| `--username NAME` | MQTTユーザー名。MQTT_USERNAME環境変数も使用可 |

パスワードは `MQTT_PASSWORD` 環境変数から読みます。コマンド引数やログには出しません。
TLS検証を無効にするオプションはありません。client IDは送信ごとに生成し、AIのclient IDと競合させません。

標準では各バッチの最後のサンプル時刻を送信直前の現在時刻に合わせ、ts/ts_msを整合させます。
samples内のt・センサー値・boot_msは変更しません。これは送信時刻に合わせた再生であり、厳密な50Hz実機収録ではありません。
送信が遅れたときに過去の予定分をまとめて送る処理はありません。

## 確認するログ

- 送信側: `Sent N/...`。QoS 0では送信完了、QoS 1ではBrokerの応答完了を示します。AIの受理や推論成功は保証しません。
- AI側: `SENSOR_BATCH_ACCEPTED samples=100`、拒否時は `SENSOR_BATCH_REJECTED reason=...`。
- AIの `/health/input`: `accepted_batches` / `rejected_batches` / `device_api` を確認できます。

接続は最大10秒、各Publishは最大5秒で待機を終了します。失敗・切断時は非ゼロ終了し、自動再接続や再送ループは行いません。
Ctrl+Cで停止できます。既存JSONL内の転倒風データは、学習済みモデルがfallと判定することを保証するfixtureではありません。

今回、送信・テストは実行していません。Window生成・推論・結果配信は受信経路へまだ接続されていません。
