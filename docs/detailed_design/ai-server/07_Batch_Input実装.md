# 最大100点バッチ入力

2026-10-27: ユーザー指示により最大100点バッチを採用し、#188の契約資料のみという範囲を入力処理の実装まで拡張した。テストコードは追加しない。

## レイヤーと依存方向

```text
integrations/mqtt_client.py  MQTT callback用受信Queue・Worker用入力アダプター
  → integrations/sensor_json.py  外部JSONの検証・変換
  → application/sensor_input.py  Topic照合・後続処理への引渡し
  → domain/sensor.py  不変のSensorBatch / SensorSample
```

applicationはdomainだけに依存する。domainは標準ライブラリだけを使用する。
後続のDevice判定・Buffer処理は `SensorInputService(consume=...)` に注入する。
既存のcoreは設定と起動管理を維持する。データ型は `domain/sensor.py` から直接importし、未使用の再公開用 `core/schemas.py` は削除する。

## 入力契約（実装で採用した規約）

- 既存 `main/iot/mock-data/generate_telemetry.py` の形式に合わせる。1点JSONとの自動判別はしない。
- root必須項目は `device_id`, `ts`, `ts_ms`, `boot_ms`, `tz_offset_sec`, `samples`。余分な項目は拒否。
- `device_id` は `[A-Za-z0-9_-]{1,64}`。内部では同じ値を `device_code` として扱う。
- Topicは `fall/{device_id}/data`。大小文字を含め本文と厳密一致。retained入力は拒否。
- `samples` は1〜100点。各点は `t, ax, ay, az, gx, gy, gz` が必須。
- `ts_ms` はバッチ先頭のUnix epochミリ秒。`t` は先頭からのミリ秒差。最初のtは0、以後は厳密増加。
- 各点のUTC計測時刻は `ts_ms + t`。バッチ全点に受信時刻を付与する方式ではない。
- `ts` は `ts_ms` と同一の時刻であること。timezoneなしの場合は明示された `tz_offset_sec` を使う。timezone付きの場合もoffset一致を確認する。
- `ts_ms`, `boot_ms`, `t` は非負整数。boolは不可。`boot_ms` はメタデータであり計測時刻の正本にはしない。
- 6軸は有限のJSON数値のみ。文字列、bool、null、NaN、Infinityを拒否。ゼロは許可。
- UTF-8以外、重複キー、不正JSONを拒否。不正点があればバッチ全体を拒否し、部分投入しない。
- 単位変換は行わない。既存Broker設計のg / deg/sとモデル側の整合確認は#189に残る。

最大100点以外の規約は、既存生成器と設計から今回実装に採用したもの。IoT・インフラ担当との合意済みとは記録しない。担当者・合意日は未確定。

## バッチ化に伴う内部上限

従来の1点4KiBは適用しない。最大64KiB/メッセージ、受信Queueは16バッチを既定とする。Queue内payloadは最大1MiB（Pythonオブジェクト分は別）。全Queueを無効化する独立EventはQueue満杯・接続切断に使用する。サイズ超過・不正入力は当該バッチだけを拒否し、正常な別Deviceを巻き込まない（設計06に合わせたレビュー修正）。

## 接続口と残作業

- `receive(payload, topic, retained, generation)` はMQTT callbackから呼ぶ。JSON検証や後続処理はしない。
- 単一WorkerがQueueからEnvelopeを取得し `process(envelope, generation=current_generation)` を呼ぶ。旧世代を拒否する。
- Workerは `discontinuity` を受けたらQueueを破棄し、新しい連続区間から再開する。2026-10-29にEvent解除・世代管理・停止処理まで接続した。Bufferは未実装であり、そのresetはBuffer追加時に必要。
- 検証済みバッチはconsumeへ1回渡す。Device確認後にsamplesを順番にBufferへ渡す。100点バッチを1サンプルとして扱わない。
- 2026-10-29にMQTTネットワーク接続・Worker起動・入力検証までをlifespanへ接続した。今回の終点は検証済みバッチの受理件数とログ。Device API・Buffer・推論は未接続でreadyは503、別の `/health/input` で受信準備状態を表示する。
- Step、許容間隔、Window時間幅、鮮度、未来許容は未確定。今回の入力検証は順序と型を扱い、これらの候補値を確定値として適用しない。
- 100点の蓄積自体で先頭点は約1.98秒古くなる。従来の古さ2秒候補をそのまま採用すると転送遅延で破棄されやすいため、バッチ化に合わせて鮮度契約を再決定する。

2026-10-29にローカルBroker経由の100点受信を確認した。#188の全項目合意や推論完了を意味しない。結果Topic/QoS/Retainは#192、API契約は#190の範囲を維持する。


## 2026-10-29 設計レビュー

照合対象は設計01の実行方式、02のMQTT契約、06のエラー・ログ、ユーザーが採用した最大100点と本書07の差分。設計の候補値を新たな合意済み値とは扱わない。

| 指摘 | 修正・対応 |
|---|---|
| 不正1バッチで正常な他DeviceまでQueue破棄 | 入力不良は当該バッチだけを拒否。全体破棄は満杯・切断に限定 |
| 旧接続の掃除が購読後の新着を破棄し得る | 再購読前のロック区間で旧Queueと通知を消し込む |
| Envelopeにmonotonic時刻がない | 受信時に記録。鮮度閾値は未合意なので追加しない |
| Paho loop_stopに待機上限がない | 停止処理をdaemonスレッドへ分離し、Workerと共通の5秒予算で待機。超過は例外で通知 |
| 証明書検証失敗も通信障害として再試行 | SSLCertVerificationErrorを区別して再接続を停止。設定修正を要するERRORを出力 |
| 標準loggingの既定出力先がstderr | lifespanでstdoutを明示 |

実Brokerで正常100点・不正JSON・正常100点を連続送信し、200点受理/1件拒否/Queue空を確認。停止約0.15秒。monotonic記録、待機タイムアウト、証明書検証エラーの再試行停止は一時的なコマンドで確認。テストファイルは作成していない。実TLS/認証付きBrokerは未検証。

今回の入力受信範囲を超える未完了事項:

- Worker異常時はlive/inputが503になるが、プロセス終了と自動復旧は#200の監視実装で対応する。
- 生データは出力しないが、反復エラーの60秒集約など運用ログ全体は#199で対応する。
- Device API、Bufferの対象Device reset、時系列/鮮度検査、推論、結果配信は未接続。受理件数は推論可能・ACTIVE・鮮度内の保証ではない。
- 本番TLS必須の配備条件、ACL、接続先・時系列許容などの未合意値は本番準備で確定する。現状の平文匿名設定はローカル専用。
- 500メッセージ/4KiBという旧単点設計は、最大100点バッチ採用に伴い16バッチ/64KiBへ置き換えた。今回の仕様差分であり、旧値へ戻さない。
