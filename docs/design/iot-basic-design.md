# Basic Design — IoT 基本設計

## Task情報
- Issue: #168「Iot 基本設計」
- Task名: IoT（ESP32 + MPU6050）の内部設計 ～データ送信まで
- 領域: IoT
- 担当者: Riddlerx
- Priority: Urgent
- 関連設計: docs/templates/iot/basic-design.md（本ファイルの構成に準拠）

## 目的・背景
- 入居者の転倒を検知し、スタッフへリアルタイム通知するための**データ取得基盤**を確立する。
- 現状は `main/iot` に ESP32 + MPU6050 のファームウェアが実装済み。本Taskでは「センサー値がどのように収集・加工・送信され、AIサーバーで判定されるか」の**内部設計を具体化**し、後続実装（AIモデル連結・Web連携）の土台を明確にする。

## 対象範囲・対象外

### 対象
- ESP32 + MPU6050 のセンサー値の取得・加工（EMAフィルタ・単位変換）
- 50Hzサンプリング、100サンプル（2秒窓）のバッチ送信
- HTTP POST → AIサーバー（FastAPI）へのスキーマ定義
- AI判定結果（転倒有無・確信度）の受信とデバイス上での扱い
- デバイス単体のWebダッシュボード/API（GET /api/sensor, /api/status）

### 対象外（今回扱わない）
- Webダッシュボード（main/web）側のAPI・DB・UI実装
- AIモデルの学習・推論ロジック本体（判定関数のIFのみ定義）
- 実運用（複数デバイス・認証・暗号化・OTA）は後続Task

## システム構成・コンポーネント責務
```
[MPU6050] --I2C--> [ESP32 Firmware] --(WiFi/HTTP POST)--> [FastAPI AI Server]
                                         ^                                  |
                                         +----------(JSON判定結果)----------+
                                            │
                                            └→ [Web dashboard / Serial log]
```

| コンポーネント | 責務 |
|---|---|
| MPU6050 (I2C, ADDR 0x68) | 3軸加速度・3軸角速度・温度を生データ出力 |
| ESP32 Firmware (`main.cpp`) | センサー読み取り・ノイズ平滑化・単位変換・バッチ蓄積・HTTP送信・判定結果受信・ローカル配信（/api/sensor）|
| WiFi | APへ接続。SAMPLE 50Hz のバッチを自宅/施設のLAN経由で送信 |
| FastAPI AI Server | `/sensor` を受信し転倒判定（実装は別Task）、`fall_detected` を返却 |

## データフロー・処理フロー
1. `loop()` が `SAMPLE_INTERVAL_MS=20ms` 毎に `readSensor()` を実行（50Hz）
2. `readSensor()`:
   - RAW値取得 → EMAフィルタ（`FILTER_ALPHA=0.1`）で平滑化
   - 単位変換: 加速度 `m/s²→g`（÷9.80665）、角速度 `rad/s→deg/s`（×180/π）
3. バッチ配列 `BatchSample[BATCH_SIZE=100]` に追加（= 2秒分）
4. `BATCH_SIZE` 到達で `sendToServer()`:
   - JSON生成（下記スキーマ）→ `POST {SERVER_URL}{SERVER_PATH}/sensor`
   - タイムアウト3秒
5. 判定結果を受信 → `fall_detected`/`confidence`/`reason` をSerialログへ出力
6. 同時にESP32内Webサーバーが `GET /api/sensor`（最新値）、`GET /api/status`（ヘルス）を配信

## データ送信スキーマ（インターフェース定義）

### 送信（ESP32 → AI Server） `POST /sensor`
```json
{
  "device_id": "esp32-mpu6050-01",
  "samples": [
    { "t": 12345, "ax": 0.02, "ay": 0.01, "az": 1.00,
      "gx": 0.10, "gy": -0.05, "gz": 0.00 }
  ]
}
```
- `ax/ay/az`: 加速度 [g]（静止時 Z≈1.0）
- `gx/gy/gz`: 角速度 [deg/s]
- `t`: ミリ秒タイムスタンプ
- AIモデルの学習データと単位を一致させる（accel=g, gyro=deg/s）… critical

### 応答（AI Server → ESP32） `200 OK`
```json
{ "fall_detected": false, "confidence": 0.02, "reason": "normal" }
```

## 外部システムとの連携
- AIサーバーとの責任分界: **送信側=デバイス、判定=AIサーバー**。ESP32は判定の実装を持たない。
- レスポンス受信後もデバイスはバッファを空にし次のバッチを継続（送信処理はBlockingだが3sタイムアウトで非応答時は破棄して継続）。
- WiFi未接続時は送信をスキップ（`[HTTP] WiFi not connected` ログ）し、データは欠落する前提。

## 非機能要件
- 性能: 50Hz 継続取得。バッチ送信は2秒毎（約100サンプル/回）
- 通信: タイムアウト3秒、Content-Type: application/json
- 可用性: WiFi未接続時もデバイスは動作継続（Serial出力のみ）
- セキュリティ: 現状は平文HTTP・認証なし（実運用時に対策）。秘密情報（SSID/PW/ServerURL）は `config.h` に隔離し`.gitignore` で除外（`config.example.h` をテンプレとして配布）
- 運用: 設定は `config.h` で一括管理（WiFi, I2Cピン, サンプルレート, バッチ数, Server URL, デバイスID）

## 制約・前提条件
- ESP32のスタックメモリ・`JsonDocument` 容量に収まるペイロードであること（バッチ100は実測で問題なし）
- `AsyncWebServer` と `HTTPClient` の併用（送信中もローカル配信可能）
- AIモデルの入力レート（50Hz / 2秒窓）とサンプリング仕様を一致させる

## 未決事項・備考
- AIサーバーの実装（FastAPIの `/sensor` エンドポイント）は別Task。本設計のRequest/Responseスキーマを契約として固定する
- サーバーURLの実環境アドレスは `config.h` で変更
- 転倒以外のイベント（バッテリー低下等）は Web 領域との連携で別途設計