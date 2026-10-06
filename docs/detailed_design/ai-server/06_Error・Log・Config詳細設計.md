# 06 Error・Log・Config 詳細設計

本書はエラー・運用設定に加え、試験、1ヶ月の計画、整合性チェック、TBD、実装Checklist、最終コード構成をまとめる。文書は01〜06の6ファイルに限定する。

## 1. Error Handling

全エラー共通: エラーをnormalとしてPublishしない。例外の境界を受信1件・Window1件・起動処理に分け、回復可能なデータ不良で全プロセスを停止させない。原因不明の継続障害は非Readyとする。下記Retryの時間候補は02〜05のTBDに従う。

### MQTT Connection Error

| Item | 内容 |
|---|---|
| Error | MQTT Connection Error |
| Cause | Broker停止、DNS/ネットワーク、認証・TLS・ACL不備 |
| Detection | 接続例外、CONNACK拒否、切断callback、SUBACK拒否 |
| Action | 非Ready化、旧接続世代Queue/Buffer破棄。認証・証明書不備は設定修正を要求するログ |
| Retry | 通信障害はbackoff 1〜30秒候補で再接続・再購読。設定不備は即時連続再試行しない |
| Log Level | 一時障害WARNING、設定不備ERROR |
| Impact | センサー受信・新規結果通知が停止。再接続後も100点蓄積が必要 |

### MQTT Publish Error

| Item | 内容 |
|---|---|
| Error | MQTT Publish Error |
| Cause | 切断、送信Queue満杯、PUBACK未受信 |
| Detection | publish戻り値、完了通知・待機期限 |
| Action | FAILED / DELIVERY_UNKNOWNを区別しstdout記録。ACK確認前に送達済みとしない |
| Retry | client受付後はQoSの再送のみ。アプリ側の無条件再Publishなし |
| Log Level | ERROR（ログ転送自体の失敗はstdoutのみ） |
| Impact | 当該結果が欠落／遅延／重複し得る。Web受信は保証されない |

### JSON Decode Error

| Item | 内容 |
|---|---|
| Error | JSON Decode Error |
| Cause | 不正UTF-8、JSON破損、重複キー、非標準NaN等 |
| Detection | decode / JSON parser例外 |
| Action | 受信1件を破棄。信頼できるTopicからDevice特定可能ならBuffer reset |
| Retry | なし |
| Log Level | WARNING、連続発生は集約 |
| Impact | 対象サンプル欠落、連続100点の再蓄積が必要になる場合あり |

### Schema Validation Error

| Item | 内容 |
|---|---|
| Error | Schema Validation Error |
| Cause | 欠落、型・範囲・時刻・Topic code不一致、過大payload |
| Detection | strict schema、有限性、サイズ、時系列検査 |
| Action | 破棄、Deviceを安全に特定できればBuffer reset。生payloadをログ出力しない |
| Retry | なし |
| Log Level | WARNING |
| Impact | 対象DeviceのWindow遅延。正常な別Deviceを巻き込まない |

### Device Not Found

| Item | 内容 |
|---|---|
| Error | Device Not Found |
| Cause | 未登録code、削除済みDevice |
| Detection | Device API 404または有効negative cache |
| Action | Buffer作成なし、既存Buffer削除、短期negative cache |
| Retry | negative TTL満了後の次回受信で取得 |
| Log Level | WARNING、同一codeは集約 |
| Impact | 対象Deviceを推論しない |

### Device Inactive

| Item | 内容 |
|---|---|
| Error | Device Inactive |
| Cause | Webで無効化・利用停止 |
| Detection | 有効Cache/APIのstatus != ACTIVE（既知の非稼働状態） |
| Action | サンプル破棄、Buffer reset、状態変更時だけログ |
| Retry | TTL満了で再取得。ACTIVE復帰時は新規100点 |
| Log Level | INFO（正常な運用制御） |
| Impact | 対象Deviceの推論停止。他Deviceは継続 |

### Buffer Error

| Item | 内容 |
|---|---|
| Error | Buffer Error |
| Cause | 不正shape、内部状態不整合、時系列断絶、受信Queue overflow |
| Detection | append/window検査、非ブロッキングQueue投入失敗 |
| Action | 対象Buffer reset。Queue overflowは欠落フラグで全Queue/Buffer reset |
| Retry | 失敗サンプルを再投入せず新規連続区間を蓄積 |
| Log Level | 断絶・overflowはWARNING、内部不整合ERROR |
| Impact | 1回以上の推論機会を失う。メモリ無制限増加を防止 |

### Scaler Load Error

| Item | 内容 |
|---|---|
| Error | Scaler Load Error |
| Cause | 不在、破損、未fit、version・hash・features不一致 |
| Detection | loader例外、manifest照合、既知fixture検証 |
| Action | 起動失敗・非Ready・非ゼロ終了。新規fitで補わない |
| Retry | 成果物・環境修正後に再起動 |
| Log Level | ERROR |
| Impact | 全推論停止 |

### Model Load Error

| Item | 内容 |
|---|---|
| Error | Model Load Error |
| Cause | 不在、破損、クラス欠落、state_dict/shape/runtime/hash不一致 |
| Detection | loader例外、strict load、既知入力検証 |
| Action | 起動失敗・非Ready・非ゼロ終了。モデル再設計やunsafe fallbackなし |
| Retry | 既存モデル・クラス・対応環境を修正後に再起動 |
| Log Level | ERROR |
| Impact | 全推論停止 |

### Inference Error

| Item | 内容 |
|---|---|
| Error | Inference Error（Scaler transform / Tensor変換を含む） |
| Cause | 非有限値、不正output、計算例外、メモリ不足 |
| Detection | transform/model例外、shape・dtype・範囲・finite検査 |
| Action | Window破棄、結果なし。構造的な不一致は即非Ready・終了。その他3回連続失敗は非Ready・終了する内部方針 |
| Retry | 同じWindowは再推論しない。単発なら次Windowへ、成功時に連続失敗数をreset |
| Log Level | ERROR |
| Impact | 対象Window欠落、継続障害では全推論停止 |

### Device API Error

| Item | 内容 |
|---|---|
| Error | Device API Error |
| Cause | 401/403/429/5xx、応答形式不正、HTTPS/DNS障害 |
| Detection | HTTP status・応答schema・要求期限 |
| Action | 当該DeviceをUNKNOWN、Buffer reset。期限切れACTIVEを使わない。DEGRADED・ready=503 |
| Retry | 要求内はなし。cooldown後の次回受信で再取得。401/403は設定修正まで抑止 |
| Log Level | 一時障害WARNING、認証・形式不備ERROR |
| Impact | Cache未保持・失効Deviceの推論停止、有効Cacheの処理は継続可能 |

### Timeout

| Item | 内容 |
|---|---|
| Error | Timeout |
| Cause | Device API応答遅延、PUBACK遅延、Worker停止、Device無通信 |
| Detection | monotonic期限、未完了送信、Worker進捗監視、last_valid_received |
| Action | APIはUNKNOWN、PUBACKはDELIVERY_UNKNOWN、Worker停止は非Ready・終了、Device無通信はOFFLINE・Buffer破棄 |
| Retry | APIはcooldown、MQTTはclient再送、Workerは運用再起動、Deviceは新規サンプル待ち |
| Log Level | API/DeviceはWARNING、送信/WorkerはERROR |
| Impact | 期限切れ箇所に応じて対象Deviceまたはサーバー全体が停止 |

## 2. AI Operation Log

標準loggingで構造化JSONをstdoutへ出す。全体／Web基本設計に合わせ、必要イベントは別の運用ログMQTT Topicへも転送し、外部Log Workerが保存する。AIはDBライブラリ・DB接続設定を持たない。ログTopic未合意の状態でDB保存まで完成したとは扱わない。

| Event | Level | 発火条件・頻度 |
|---|---|---|
| SERVER_START | INFO | 起動1回 |
| SERVER_READY | INFO | Readyへの遷移ごと |
| MQTT_CONNECTED | INFO | CONNACK成功 |
| MQTT_DISCONNECTED | WARNING | 切断ごと |
| MQTT_RECONNECT | INFO | backoff後の接続試行、反復は集約 |
| MESSAGE_RECEIVED | DEBUG | 検証前受信。通常本番無効、MQTT転送しない |
| INVALID_MESSAGE | WARNING | JSON/schema不正、理由コードのみ |
| DEVICE_NOT_FOUND | WARNING | negative cache作成時 |
| DEVICE_STATE_CHANGED | INFO/WARNING | ACTIVE/INACTIVE/ONLINE/OFFLINE変更 |
| INFERENCE_SUCCESS | INFO | 成功Windowごと、device・Window終端・duration |
| INFERENCE_ERROR | ERROR | Windowの変換・推論失敗 |
| MODEL_LOAD_ERROR | ERROR | 起動時model検証失敗 |
| SCALER_LOAD_ERROR | ERROR | 起動時Scaler検証失敗 |
| PUBLISH_ERROR | ERROR | 即時失敗または送達不明 |
| PIPELINE_ERROR | WARNING/ERROR | API、Buffer、overflow、timeoutなどその他。error_codeで区別 |

共通項目は`logged_at`（サーバーUTC）、`level`、`event`、`server_run_id`、`message`。必要な場合だけ`device_code`、`model_version`、`window_end`、`duration_ms`、`error_code`、`count`、合意後の`event_id`を追加する。ログ転送の重複排除が必要なら`(server_run_id, log_sequence)`をWorkerと共有する案とし、ログ契約は`[TBD]`。

運用の見やすさと量の抑制のため、反復する無効メッセージはevent/error_code単位で最初の1件＋60秒単位の件数へ集約する。集約キー数も有限とし、不正codeごとに無制限な状態を作らない。モデルの重み、センサー全点、Elder情報、MQTT password、token、認証ヘッダー、secretを含むURL・例外文字列を出さない。

Broker切断時・起動時ロード失敗はstdoutのみでも記録が残る。ログ転送失敗をさらにMQTTログで通知する循環を禁止し、再帰抑止付きstdout fallbackとする。ログ転送は結果送信を妨げないbest effortで、永続化完了をAIでは保証しない。stdout保存先・rotation・保持期間はインフラ担当と`[TBD]`（候補10MB×3世代、個人情報を含まない運用ログ）。

## 3. Configuration

環境差分・secret・要求済みパラメータだけをenvにする。その他の合意済みポリシーは`config.py`の単一設定表で管理し、不要な環境変数を増やさない。

| Environment Variable | Type / 必須 | 値・検証 |
|---|---|---|
| MQTT_HOST | string / 必須 | 接続host。credentialを埋め込まない |
| MQTT_PORT | int / 必須 | 1〜65535。8883推奨、本番TLS設定と照合 |
| MQTT_USERNAME | string / 本番必須 | 専用AIアカウント |
| MQTT_PASSWORD | secret / 本番必須 | stdout・healthへ出さない |
| DEVICE_API_URL | URL / 必須 | 合意済みbase URL、HTTPS必須（閉じたローカル試験を除く） |
| DEVICE_API_TOKEN | secret / 認証方式がBearerなら必須 | Authentication確定後に採用。他方式なら不要 |
| MODEL_PATH | path / 必須 | 信頼済みbest_1dcnn_pytorch.pth |
| SCALER_PATH | path / 必須 | 対応Scaler。実ファイル名 `[TBD]` |
| MODEL_VERSION | string / 必須 | manifestと一致。空不可 |
| WINDOW_SIZE | int / 既定100 | 現行モデル契約では100以外を拒否 |
| WINDOW_STEP | int / 必須 | `[TBD]`、候補50または100。1以上WINDOW_SIZE以下で、合意値に固定 |
| SAMPLING_RATE | number / 既定50 | 現行モデル契約では50以外を拒否 |
| INFERENCE_THRESHOLD | number / 既定0.5 | 有限・0〜1。今回の前提では0.5以外を拒否 |

環境変数が存在することはモデルのWindowや閾値を自由に変更できるという意味ではない。単位・shape・class indexはenvによる試行錯誤で変更せず、既存成果物の対応表を正とする。

設定表に集約する項目: Topic、QoS、Retain、protocol/session/client_id、TLS有効化とCAパス、Keep Alive、reconnect間隔、Cache TTL、API timeout/cooldown、OFFLINE Timeout、timestamp許容、ACK待ち、ログ転送条件。値はTBD一覧で合意後に反映する。開発・本番は起動時に明示した設定profileを使い、port番号だけでTLSを自動判定しない。profileの選択方法は実装時にCLI引数等で固定し、envを無制限追加しない。

内部上限（調整は性能試験の結果による）: payload 4 KiB、受信Queue 500、Device Cache/Buffer各128、送信Queue 100、inflight 10、終了待ち5秒、Worker進捗上限10秒、推論連続失敗上限3回。これらは外部合意値とは区別する。

## 4. Security

- 本番MQTTはTLS＋hostname/CA検証、ブラウザはWSS、Device APIはHTTPS。閉じたローカル用匿名・平文設定を本番へ持ち込まない。
- Broker ACLはDeviceの自分のセンサーTopicへのpublish、AIのセンサーsubscribe・結果/運用ログpublish、ブラウザの必要な結果subscribeを分離する。AIはDevice statusの正本を書き換えない。
- Secretをソース、モデルmanifest、Docker image、ログに埋め込まない。`.env`はGit管理外・所有者のみ読取、`.env.example`はキーと非秘密の例のみ。本番は運用管理するsecretを注入する。
- Model/Scalerは信頼済み配布元とhashを確認、コンテナへread-only mount。運転中の差し替え・外部uploadロードを提供しない。pickle系は読込時にコード実行され得るため、ファイル名だけで安全と判断しない。
- FastAPIのhealthにはsecret・生データを返さず、インフラの必要範囲からのみアクセスを許可する。

## 5. Testing

主目的はAI Server側の正しい連携・前処理・例外処理。Model Accuracyの再評価や再学習ではない。単体試験はFake Clock / API stub / predictor stubで決定的に行い、モデル結合試験は必ず実物でも行う。stub成功を実モデル統合完了とみなさない。

### Unit Test

| 対象 | 入力・条件 | 合格条件 |
|---|---|---|
| Sensor validation | 正常JSON、欠損、bool、文字列、NaN、重複キー、過大payload、naive日時、code不一致 | 正常のみ受理、不正は理由付き破棄、secret・payloadをログに出さない |
| Device validation | ACTIVE/INACTIVE/404/未知enum、code不一致 | ACTIVEだけBufferへ。不正応答はUNKNOWN |
| Device Cache | TTL直前/直後、API失敗、negative cache、上限 | API呼出し回数・失効・上限が設計通り。stale ACTIVEを利用しない |
| Buffer | 2 Deviceの交互入力、重複・逆行・欠測・OFFLINE | データ混入なし、断絶後は100点未満でWindowなし |
| Window generation | 99/100/149/150/199/200点 | Step50は100/150/200、Step100は100/200で生成 |
| Preprocessing | 軸ごとに区別可能な固定Window、既存Scaler fixture | 順序・単位・shape・dtype・期待変換一致。fit系呼出しゼロ |
| Model inference | 実モデル既知fixture、stubの各output形式 | eval/no-grad、契約通りのp_fall、実物との数値一致 |
| Threshold | 0.499999 / 0.5 / 0.500001、NaN | normal / fall / fall、NaNは結果なし |
| Result generation | 有効Window、version、UTC時刻 | 基本4項目一致、再送でtimestamp不変 |
| 起動ゲート | hash、Feature順、Window、Scaler互換不一致 | readyにならず失敗。モデル構造を推測して通さない |

### Integration Test

ローカルMosquitto、Device API stub、AI Server、テストsubscriberで`MQTT → AI Server → Inference → MQTT Result`を検証する。入力は50Hz相当の連続時刻を持つ既知fixtureを使う。200点ならStep50で3結果、Step100で2結果を期待する（欠落・タイムアウトなしの条件）。各結果がcode・Window終端・既存モデル期待判定・versionと一致することを確認する。

その後、実Device API、実モデル／Scaler、ブラウザWSS、外部Log Workerを使い、AWS環境で同じ経路を確認する。AIからPostgreSQLやAlert POSTへの接続がないこと、ログが別Topic経由で保存されることも確認する。

### Error Test

| 試験 | 期待動作 |
|---|---|
| Invalid JSON / Invalid sensor data | 破棄、必要なBuffer reset、正常サンプルへ復帰 |
| Unknown Device / Inactive Device | 推論なし、API要求を50Hzで反復しない |
| Model loading failure / Scaler loading failure | 非Ready・起動失敗、stdoutに原因コード |
| MQTT disconnect | ready=503、旧世代Queue/Bufferを破棄 |
| MQTT reconnect / SUBACK拒否 | 成功時のみReady、復帰後100点から推論、拒否時は非Ready |
| Device API timeout / 401 / 500 | UNKNOWN、Buffer reset、規定のcooldown、stale ACTIVE禁止 |
| Queue overflow / 長時間のAPI待ち | Queueが有限、古い点を捨てる、欠落区間を跨がない |
| PUBACK timeout / duplicate | 送達不明と記録、アプリ側無条件再送なし、Web重複処理 |
| retained結果 / 古い結果 / Web再接続 | 合意した鮮度・重複ルールで扱う。過去fallを無条件再Alarmしない |
| Clock rollback / 未来時刻 / OFFLINE復帰 | Window reset、復帰後新規100点 |
| 終了・再起動 / Worker hang | 上限付き終了、非Ready、未送達記録、復元せず新規蓄積 |

### Performance / 完了条件

推奨試験は1 Device・50Hz・Step50で30分連続運転（時間・SLOは`[TBD]`）。CPU/RSS、Queue長、破棄件数、Window処理p50/p95/max、Broker ACK遅延、Web表示遅延を記録する。warm-up後にQueueやメモリが増え続けず、正常条件で予期しない欠落がなく、04/05の合意SLOを満たすことを確認する。複数Deviceの分離は機能試験し、複数台運用の性能保証とは分ける。

## 6. 1ヶ月の開発計画

| 週 | 実装タスク | 依存関係・週末の完了条件 |
|---|---|---|
| Week 1 | Project setup、FastAPI lifespan/health、MQTT接続、Sensor Schema、Device API/Cache骨格。モデル・Scaler・既存コード受領、契約と差異レビュー | 最優先で入力形式・API・モデル成果物を確保。stubで受信→Device判定が動く |
| Week 2 | Buffer、Window、時系列検証、既存Scaler、既存Model integration、local inference test | 実物のshape/output契約確定が前提。固定Windowから実モデル結果を確認 |
| Week 3 | Result MQTT、Web/WSS結合、Device status、再接続、Error Handling、AI Log/Worker契約 | 結果schema・重複・Retain合意済み。受信からWeb表示、運用ログ保存まで疎通 |
| Week 4 | 統合・異常・AWS・性能試験、Bug fix、起動/復旧手順、設計のTBD解消 | 合意した試験完了、既知制約記録、デモ経路を再現可能 |

モデルと外部契約の確認をWeek2末まで先送りしない。Week1で実物が入手できない場合はstubによる独立部分を先行できるが、モデル統合の完了日への影響を記録する。AWS TLS・認証準備はインフラ担当がWeek1から並行して進める。

## 7. Basic Designとの整合性チェック

Statusは依頼文とリポジトリの関連資料に対する確認結果。未提供のAI基本設計全文に対する完全な一致を宣言する表ではない。

| Basic Design | Detailed Design | Status |
|---|---|---|
| MQTT communication | 02: MQTT/TLS。既存Brokerの100点バッチと依頼の1点JSON、結果Retainが相違 | Requires Confirmation |
| Device identification | 02: device_code、Web API、Elder保持なし。既存device_idとの対応とAPI契約未確定 | Requires Confirmation |
| Buffer | 03: Device別deque、連続性reset、メモリ内のみ | Consistent |
| Window | 03: 50Hz/100点/6軸は一致、Step・時間許容は未決 | TBD |
| StandardScaler | 03/04: 既存transformのみ。ファイル・順序・単位・互換性の実物未確認 | Requires Confirmation |
| Existing 1D-CNN | 04: 既存pth・クラスを再利用。構造を変更しない。shape/outputは未確認 | Requires Confirmation |
| Result MQTT | 05: Broker経由。既存is_fall形式との差異と重複/保持の合意が必要 | Requires Confirmation |
| Web integration | 05: MQTT/WSS・Alert POSTなし。History/FallLogの既存文書間差異をWebで調整 | Requires Confirmation |
| Error handling | 06: 必須12種、非Ready・再接続・対象破棄の方針を定義 | Consistent |
| AI Log | 06: stdoutと別Topic→Log Worker。Topic・schema・保存条件が未決 | TBD |

追加確認: 全体図にRaspberry Pi、Broker設計と今回依頼にESP32の表記がある。今回AI入力はESP32基準とし、全体図を担当者が調整する。CNN構造の比較元と実ファイルは未提供のため、構造差異の有無は現時点で判定できない。

## 8. TBD一覧

| ID | 項目 | 推奨案 / 確認内容 | 確認先・期限 |
|---|---|---|---|
| T01 | Window Step | 50を推奨、100と比較して負荷・更新周期合意 | AI/Web、Week1 |
| T02 | MQTT Topic | fall/+/data、fall/{device_code}/events、別運用ログTopic | IoT/AI/Web/インフラ、Week1 |
| T03 | QoS | センサー0・結果1・ログ0候補。既存資料の表間差異も整理 | IoT/Web/インフラ、Week1 |
| T04 | Retain | 全てfalse推奨。既存結果trueとの差異解消 | Web/インフラ、Week1 |
| T05 | Device API Endpoint | code検索GET、200/404/enum/認証契約。例は未実装の候補 | Web、Week1 |
| T06 | Authentication | MQTT専用account/ACL、API service認証、WSS権限、CA配布 | Web/インフラ、Week1 |
| T07 | Cache TTL | ACTIVE/INACTIVE 30秒、404 5秒、API失敗cooldown 5秒候補 | AI/Web、Week1 |
| T08 | OFFLINE Timeout | 5秒候補。利用可否と別管理、Web通知経路も確認 | AI/IoT/Web、Week3前 |
| T09 | Timestamp | measured_atの正本、timezone・精度・同期、detected_atをWindow終端とする案 | IoT/AI/Web、Week1 |
| T10 | Event ID | UUID追加推奨、基本4項目だけの場合の制約、重複保持・鮮度 | AI/Web、Week3前 |
| T11 | Runtime environment | EC2 #2、CPU推奨、instance/OS/Python/依存version/メモリ/再起動 | AI/インフラ、Week1〜2 |
| T12 | Sensor形式 | 1点JSONと既存100点バッチの統一、code規約 | IoT/AI、Week1 |
| T13 | Model / Scaler実物 | 保存形式、クラス、shape、dtype、出力意味、Fall index、file/hash/version、fixture | モデル提供者、Week1 |
| T14 | Feature / Unit | 順序、gかm/s²、deg/sかrad/s、軸向き、学習時の追加前処理 | モデル提供者/IoT、Week1 |
| T15 | 時系列許容 | 間隔10〜30ms、幅1.98±0.10秒、古さ2秒、未来1秒の候補を実測 | IoT/AI、Week2 |
| T16 | 接続・待機条件 | MQTT 3.1.1、clean session、client_id、Keep Alive 60秒、再接続1〜30秒、API全体2秒、ACK5秒候補 | AI/インフラ、Week1〜3 |
| T17 | 運用ログ保存 | 別Topic/schema、Worker保存、stdout rotation/保持、ログ重複 | Web/インフラ、Week3前 |
| T18 | Web責務の差異 | スタッフHistoryとFallLog、割当変更時の結果、再接続通知・古い結果・normalの意味 | Web、Week3前 |
| T19 | 性能合格値 | CPU推論p95、Web1秒目標の測定条件、30分連続試験案 | AI/Web/インフラ、Week2 |
| T20 | AI基本設計本文 | 全文を受領して整合表を再照合。モデル構造差異も確認 | 設計担当、レビュー時 |

未決のまま外部へ接続して推測契約を本番採用しない。依存しない内部処理とstub試験は先行実装できる。

## 9. 実装Checklist

各行をGitHub Issue/Taskの単位とし、完了条件を同じ行に記す。実際のIssue作成・外部投稿は本設計作成の対象外。

- [ ] Project Setup: 依存version固定、FastAPI lifespan、1 worker、health、終了処理、起動失敗を確認。
- [ ] MQTT Client: TLS/認証、CONNACK/SUBACK、受信Queue、callback非ブロッキング、再接続試験を完了。
- [ ] Sensor Validation: strict JSON・6軸・時刻・code照合・サイズ境界の単体試験を完了。
- [ ] Device API: 合意Endpoint/enum/認証を実装し、200/404/401/429/5xx/timeoutを確認。
- [ ] Device Cache: TTL、negative cache、上限、cooldown、期限切れACTIVE禁止を確認。
- [ ] Buffer: Device分離、重複/逆行/欠測/reset、OFFLINE掃除、Queue overflowを確認。
- [ ] Window: 100点と合意Step、生成境界、時刻幅、immutableコピーを確認。
- [ ] StandardScaler: 対応ファイル読込、transformのみ、順序/単位/shape、fixture一致を確認。
- [ ] Existing Model Load: 既存クラス・strict load・hash/manifest・eval、起動拒否ケースを確認。
- [ ] Inference: gradient無効、出力意味固定、閾値0.5境界、NaN/shape異常を確認。
- [ ] Result Publish: 基本schema、UTC、version、Topic、QoS/Retain、受付/ACK/送達不明を確認。
- [ ] Device Status: 利用可否と通信状態を分離し、無効化/復帰/OFFLINE時のBuffer resetを確認。
- [ ] Web Integration: MQTT/WSSで表示、重複/古い結果/割当変更/連続fallの合意を検証。
- [ ] AI Log: 必須event、secret抑止、集約、stdout fallback、別Topic→Log Worker保存を確認。
- [ ] Error Handling: 必須12種とWorker監視、非Ready、復帰条件、上限付き停止を検証。
- [ ] Tests: Unit/Integration/Errorを実物成果物でも通し、未実施・既知制約を記録。
- [ ] AWS Integration: 接続先/TLS/ACL/WSS/HTTPS/モデルread-only/health/再起動を確認。
- [ ] Performance: 合意条件で連続運転し、CPU/RSS/Queue/遅延/欠落が合格範囲内。
- [ ] Documentation: TBD解消、基本設計の差分更新、起動・停止・障害復旧手順を確定。

## 10. 実装しやすいPythonプロジェクト構成

既存の`main/ai`配下に収める提案。ファイル単位のモジュールを優先し、mqtt/device/bufferごとの多層ディレクトリを作らない。

```text
main/ai/
├── app/
│   ├── __init__.py
│   ├── main.py               # lifespan / health / Worker監視
│   ├── config.py             # env検証・合意済み設定表
│   ├── schemas.py            # Sensor / Result
│   ├── mqtt_client.py        # 接続・購読・Publish・ACK追跡
│   ├── pipeline.py           # 単一Worker・全体順序
│   ├── device.py             # HTTPS API / Cache
│   ├── buffer.py             # DeviceBuffer / Window
│   ├── preprocessing.py      # 既存Scaler・Tensor変換
│   ├── inference.py          # load / eval / infer / threshold
│   ├── result.py             # JSON生成・送信要求
│   ├── logging_setup.py      # stdout / 運用ログ転送
│   └── existing_model.py     # 必要時のみ既存クラスを変更せず配置
├── models/                   # 配布時はread-only、ファイル名は実物確認
│   ├── best_1dcnn_pytorch.pth
│   ├── scaler.pkl            # 仮名
│   └── model_manifest.json   # 対応表、secretなし
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/             # 受領した既知入出力、小容量・非個人情報
├── requirements.txt          # 互換versionを固定
├── Dockerfile
└── .env.example              # secret値なし
```

依存候補はFastAPI、Uvicorn、Pydantic、paho-mqtt、HTTP client、NumPy、PyTorch、scikit-learn、保存形式に必要な場合のみjoblib、試験用pytest。versionは既存モデルとの互換確認後に固定する。既存クラスが複数ファイルならその構造を維持し、1ファイルへ無理に再設計しない。

既存`features/inference`の雛形との二重実装を避け、実装着手時に入口を`app.main:app`へ統一する。今回の成果物は詳細設計6ファイルであり、Python実装・既存雛形の削除・依存変更・実モデル試験はまだ実施していない。
