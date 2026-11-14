# AI・IoT入力の索引

AIの説明では「実装済み入力検証」と「まだ接続されていない推論・結果配信」を分ける。予測値はリスク候補であり、医学的診断や転倒の確定ではない。

## 実装済みの入力経路

1. 模擬publisherまたはデバイスが `fall/{device_id}/data` にMQTT publishする想定。模擬側は `main/iot/mock-data/`、broker設定は `main/broker/mosquitto.conf`。
2. `app/integrations/mqtt_client.py` の `MqttConnection` が購読し、callbackの `MqttSensorInput.receive` はpayloadを有限Queueへ非ブロッキング投入する。callbackはJSON検証、HTTP、推論をしない。
3. `InputPipeline._run` の単一WorkerがQueueを取り出し、`MqttSensorInput.process` → `sensor_json.decode_batch` → `SensorInputService.accept` を通す。
4. `InputPipeline._accept_batch` は必要時に `DeviceManager` でWebのDevice APIを照会し、ACTIVEな検証済みbatchの受理件数を更新する。ここが現在の終点である。

payload field、件数、時刻、軸、topic照合の正確な契約は `sensor_json.py` と `domain/sensor.py` を読む。実機のサンプリング精度、物理軸、符号、モデルとの一致は未確認なら未確認とする。

## モデル関連で確認できること

- `InferenceEngine.load` は MQTT開始前にmanifestと成果物のhashを検証してCPUモデルとScalerをloadする。
- `WindowPreprocessor.transform` は、既存の学習済み `StandardScaler` を使い、100×6の時系列をfloat32のNCL `(1, 6, 100)` tensorへ変換する。Scalerの再fitやモデルの再学習はしない。
- `InferenceEngine.predict` はbinary logitにsigmoidを一度だけ適用し、thresholdとの比較で `fall` / `normal` を作る。ただし現時点のpipelineからこの関数は呼ばれない。

## health endpointの意味

- `/health/live`: processとinput Workerが生存しているか。
- `/health/input`: MQTT接続・SUBACK・Workerの状態。受信可能は推論可能を意味しない。
- `/health/ready`: 現在は `inference_pipeline_not_connected` として503。readyを稼働証拠にしない。

## Device APIの失敗境界

`app/integrations/device.py` はAI側のHTTP client、timeout、有限cache、認証失敗時の停止を扱う。WebのDevice APIのresponse schemaとの接続を説明するときは `docs/contracts/device-api/openapi.json` と両実装を照合する。AI clientに `MAINTENANCE` の互換処理があっても、Web Prismaの`DeviceStatus`に同値があると推測しない。
