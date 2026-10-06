# 02 MQTT・Device 詳細設計

前提・表記は[01](01_AI_Server_詳細設計.md)を参照。未決の推奨値はIoT・Web・インフラとの合意後に採用する。

## 1. MQTT契約

| 項目 | 設計・候補 | 状態 |
|---|---|---|
| Broker | 既存Mosquittoを利用、hostは環境設定 | 接続先 `[TBD]` |
| Protocol | MQTT 3.1.1を推奨。paho-mqttのCallback API v2を使用する案 | `[TBD]` |
| TLS | 本番はTLS必須、CAとhostnameを検証。証明書検証無効化は禁止 | CA配布・TLS終端 `[TBD]` |
| Port | 本番8883、閉じたローカル環境1883は既存設計の値 | 実環境 `[TBD]` |
| Authentication | 本番username/password + ACLを推奨 | アカウント・配布方法 `[TBD]` |
| Subscribe | `fall/+/data`を候補。Topicキーをdevice_codeへ統一する案 | MQTT Topic `[TBD]` |
| Result Publish | `fall/{device_code}/events`を候補 | MQTT Topic `[TBD]` |
| Operation Log Publish | 結果とは別の`ai/server/logs`を候補 | MQTT Topic `[TBD]` |
| Sensor QoS | 0を推奨。欠測区間を捨てて最新の連続データを使う | QoS `[TBD]` |
| Result QoS | 1を推奨。重複を許容しWebで排除 | QoS `[TBD]` |
| Log QoS | 0を推奨。stdoutを一次記録とする | QoS `[TBD]` |
| Retain | センサー・結果・ログともfalseを推奨。過去fallの再通知を避ける | Retain `[TBD]`、既存Broker設計は結果true |
| Keep Alive | 60秒を推奨。センサーOFFLINE判定とは独立 | `[TBD]` |
| Session | clean_session=true、安定した専用client_idを推奨。切断中の古いセンサーを復元しない | `[TBD]` |
| Reconnect | 初回失敗を含め1,2,4,…最大30秒のbackoffを推奨。再接続後に必ず再購読 | 値 `[TBD]` |

接続成功と購読成功を分けて管理する。CONNACK拒否・SUBACK拒否はログと非Ready化。認証・ACL・証明書設定不備は設定修正を要し、短周期の無限再試行をしない。ネットワーク障害は上記backoffで継続再試行する。Broker接続前の初回失敗も捕捉できる非同期接続／network loop構成とする。

送信は`publish()`戻り値の受付成否と、`on_publish`または`MQTTMessageInfo`による完了を区別する。QoS 1の完了はBrokerのPUBACKであり、ブラウザ処理完了ではない。callback内でPUBACKを待たない。Pahoの挙動は[公式client API](https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html)に基づく。使用versionは実装時に固定する。

センサーはliveデータとして扱い、retained受信は捨てる。ただし購読後のlive転送ではretainフラグだけで送信者のretain設定を検知できない場合があるため、IoT設定のretain=falseと鮮度検査も必要である。

## 2. Sensor Data

1メッセージ=1サンプル、1デバイスあたり50メッセージ/秒を本依頼の基準とする。

```json
{
  "device_code": "ESP32-001",
  "measured_at": "2026-09-23T10:00:00.000Z",
  "accelerometer": {"x": 0.0, "y": 0.0, "z": 0.0},
  "gyroscope": {"x": 0.0, "y": 0.0, "z": 0.0}
}
```

| Field | Type | Required | Validation | Description |
|---|---|---|---|---|
| root | object | Yes | UTF-8 JSONの単一object。array/null不可 | 1サンプル |
| device_code | string | Yes | 空白なし・空不可。候補`[A-Za-z0-9_-]{1,64}`、最終規約 `[TBD]` | 大小文字を維持する識別子 |
| measured_at | string | Yes | timezone付きISO 8601、UTCに正規化、解析不能・naive時刻不可 | 計測時刻。ミリ秒以上の精度を推奨 |
| accelerometer | object | Yes | x/y/z必須 | 加速度。単位はモデル契約と照合 `[TBD]` |
| accelerometer.x | number | Yes | 有限のint/float。bool/string/null不可 | acc_x |
| accelerometer.y | number | Yes | 同上 | acc_y |
| accelerometer.z | number | Yes | 同上 | acc_z |
| gyroscope | object | Yes | x/y/z必須 | 角速度。単位はモデル契約と照合 `[TBD]` |
| gyroscope.x | number | Yes | 有限のint/float。bool/string/null不可 | gyro_x |
| gyroscope.y | number | Yes | 同上 | gyro_y |
| gyroscope.z | number | Yes | 同上 | gyro_z |

設計方針: JSONの重複キー、NaN/Infinity、余分なフィールドも拒否する。受信上限は4 KiB/メッセージを内部設計値とする。値の絶対範囲はMPU6050の設定レンジと学習時の単位が不明なので`[TBD]`。ゼロ値は正当な値として許可し、欠測をゼロ埋めしない。検証で数値文字列を暗黙変換しない。

Topicが`fall/{device_code}/data`に合意された場合、Topicのキーと本文device_codeを厳密照合し、不一致を破棄する。本文の自己申告だけを認証とはみなさずBroker ACLで送信デバイスを制限する。

内部`SensorSample`はdevice_code、UTC measured_at、6個の数値を持つ。`Envelope`はこれとは別に受信時刻・monotonic時刻・MQTT世代を持つ。生payloadはログやDBに保存しない。

## 3. 既存MQTT設計との差異

| 既存資料 | 本依頼の基準 | 対応 |
|---|---|---|
| device_id、ts、samples配列（最大100点） | device_code、measured_at、6軸1点 | 確認事項。IoT側の送信形式を合意するまで結合不可 |
| 加速度g、角速度deg/s | 学習時と同じ単位が必要 | モデル提供者へ確認。暗黙の単位変換禁止 |
| timezoneなしJSTのts、ts_ms等 | timezone付きmeasured_at | timestampの正本と同期方式 `[TBD]` |
| device_id、is_fall、confidence | device_code、result、detected_at | Web／Broker担当と05の形式に調整 |

両形式の自動判別や二重実装は今回の標準機能にしない。バッチ送信が継続する場合は、`t`の意味・各点の絶対時刻・順序・重複識別を先に確定し、受信境界のadapterだけを別途設計する。100点を1サンプルとしてBufferに投入してはならない。

## 4. Device API / Cache

```text
validated message → device_code → 有効なCache?
  Yes → status確認
  No  → HTTPS Device API → 応答検証 → 最小Cache
status == ACTIVE → Buffer
INACTIVE / NOT_FOUND / UNKNOWN → 破棄・必要ならBufferクリア
```

| 項目 | 提案契約・未決事項 |
|---|---|
| Endpoint | `[TBD]`。例: `GET /api/devices/by-code/{device_code}`。実在するAPIとして扱わない |
| Request | pathのdevice_codeをURL encode。Elder IDを送らない |
| Authentication | `[TBD]`。専用read-only service credential推奨。ユーザーセッションを流用しない |
| 200 response | 最小例`{"device_code":"ESP32-001","status":"ACTIVE"}`。実際のenum・構造 `[TBD]` |
| 応答検証 | code一致・status既知・必要項目必須。余分なElder／Assignment情報は保持しない |
| 404 | NOT_FOUNDとしてnegative cache、推論しない |
| 401/403 | 設定不備としてERROR。推論停止、即時再試行なし |
| 429/5xx/network/timeout | UNKNOWN、期限切れCacheを使わず推論しない。Retry-Afterがあれば尊重 |
| Timeout | `[TBD]`、要求全体2秒を推奨（接続・読取とも有限、ライブラリの個別timeoutだけで全体上限とみなさない） |
| Retry | 当該要求内の再試行はなし。5秒のcooldown後、次の受信で再取得を推奨 `[TBD]` |
| Cache TTL | ACTIVE/INACTIVE 30秒、404 5秒を推奨 `[TBD]`。期限はmonotonic基準 |

Cacheは`dict[device_code]`でcode・正規化status・期限のみを保持する。通信失敗時は短いcooldown状態のみ保持する。保持上限128件を内部設計値とし、期限切れ→最古アクセス順に除去して未知コードの大量受信でメモリを増やさない。API呼出しはWorkerで直列処理する。将来複数台では遅いAPIが他Deviceを遅延させる制約を持つため、その段階で並列化を再検討する。

TTL中のACTIVEは有効とみなすため、Web無効化の反映に最大TTL程度の遅延がある。即時無効化は保証しない。期限切れ時の再取得失敗は対象Bufferをクリアする。INACTIVE→ACTIVE復帰、Cacheから削除されたDeviceの再登場時も新規Windowから開始する。Device検証後に03の鮮度を再確認し、API待機中に古くなったサンプルを使わない。

## 5. Device statusと通信状態

Webで管理する利用可否`ACTIVE/INACTIVE`（実enum `[TBD]`）と、AIが観測する`ONLINE/OFFLINE`を混同しない。割当の有無からAIがElderや稼働可否を推測しない。MAINTENANCE等の実enumはWeb担当と正規化表を確定するまでUNKNOWN扱いとする。

最後の有効なACTIVEサンプルの処理時刻をmonotonicで記録する。OFFLINE Timeoutは`[TBD]`（推奨5秒）。Workerは受信がなくても1秒ごとに期限を確認し、OFFLINE時にBuffer・連続区間情報を削除する。復帰は新規100点から開始する。通信状態のWebへの通知Topic／payloadは`[TBD]`であり、結果がないことをnormalや明示的OFFLINEイベントとして代用しない。
