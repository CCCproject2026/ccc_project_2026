# Device API・キャッシュ契約（AI-03）

更新日: 2026-11-04。対象: [Issue #190](https://github.com/CCCproject2026/ccc_project_2026/issues/190)。
状態: 実装用の契約案。Web/AI/IoT担当者間の合意・実APIの提供完了を表すものではない。
本変更はAPI契約・状態表・応答fixtureのみで、API、HTTPクライアント、キャッシュの実装は含まない。

## 根拠と実装先

- [Web詳細設計 #222 §7・§9・§12](https://github.com/CCCproject2026/ccc_project_2026/issues/222#issuecomment-6546020998): code検索、Bearer認証、応答形式、30秒の反映遅延の提案元。
- Web実装の関連Issue: [#102 デバイスAPI](https://github.com/CCCproject2026/ccc_project_2026/issues/102)、[#149 GET /api/devices](https://github.com/CCCproject2026/ccc_project_2026/issues/149)。いずれも一覧APIが元の範囲であり、code検索・サービス認証の追加対応はWeb担当との調整が必要。リンクがあることをcode検索実装済みの根拠にはしない。
- AI実装先: [#193 HTTP境界](https://github.com/CCCproject2026/ccc_project_2026/issues/193)、[#194 キャッシュ](https://github.com/CCCproject2026/ccc_project_2026/issues/194)、[#198 Worker・OFFLINE掃除](https://github.com/CCCproject2026/ccc_project_2026/issues/198)。
- [現行DB定義](../../../main/web/prisma/schema.prisma): `Device.deviceCode` は一意、状態は `ACTIVE` / `INACTIVE`。`MAINTENANCE` は#222の追加予定で、現行DBにはない。
- 確認したローカルHEAD: `a0d8ddb05e874a30b350522bbdee018d433e1bb1`。`src/app/api/devices/` は存在せず、AIの `app/integrations/device.py` も未実装。実稼働Endpointは未確認。

## HTTP契約

以下は#222に合わせた実装予定の契約。例示URLへ接続できることは保証しない。

| 項目 | 契約案 |
|---|---|
| Method / path | `GET /api/devices/by-code/{deviceCode}` |
| Base URL | 配置担当が提供するWebのHTTPS origin。AIの `DEVICE_API_URL` はoriginとして扱い、末尾の `/` を除いて固定pathを結合する |
| Code | MQTTの `device_id` = AIの `device_code` = DBの `deviceCode`。`^[A-Za-z0-9_-]{1,64}$`、大文字小文字を維持。AIではtrimや小文字化をせず、検証後にpath segmentとしてURL encode |
| 認証 | `Authorization: Bearer <DEVICE_API_TOKEN>`。専用参照トークン、32文字以上の乱数、HTTPS必須。ユーザーのClerkセッションは使わない |
| Web認証境界 | 当該routeをClerkのログイン誘導から除外し、handlerで必ずサービス認証。トークンはSHA-256後に固定長・定数時間比較。スタッフAPIの認可は維持 |
| トークン管理 | 両サーバーへ秘密情報として配置。`NEXT_PUBLIC_` 禁止、ログ出力禁止。未設定を許可扱いにしない。更新は両側の設定変更・再起動で同期 |
| Response headers | 全応答に `Cache-Control: no-store`、JSON応答は `Content-Type: application/json`。AIのRAMキャッシュは本書のTTLで明示的に管理 |
| 200 body | `{ "device_code": "ESP32-001", "status": "ACTIVE" }`。DBのcodeと状態を返す。割当の有無を利用可否に変換しない |
| 404 body | `{ "code": "NOT_FOUND", "message": "Device not found" }`。認証後、未登録またはcode形式違反。AIは有効なcodeに対する契約通りのJSON 404だけをnegative cache化 |
| 401 / 403 | `{ "code": "UNAUTHENTICATED", "message": "Unauthorized" }` / `{ "code": "FORBIDDEN", "message": "Forbidden" }`。401は欠落・不正トークン、403は認証済みだが参照権限なしの場合 |
| 障害応答 | 429・5xxは未登録扱いにしない。Web共通の `{ code, message }` 形式。AIの分岐はHTTP statusと安全な機械判定コードを使用し、messageには依存しない |
| Redirect | 自動追従しない。3xxは契約違反、別originへトークンを転送しない |
| 全体timeout | 1要求2秒。接続・TLS・応答本文読取までの全体deadlineをmonotonicで制御し、超過時は要求を中止。個別のconnect/read timeoutだけで全体上限を満たしたとみなさない |
| Retry | 同じ要求内で再試行しない。後述のcooldown後、次の入力で要求する |

200ではJSON object、必須2項目が文字列、codeの完全一致、statusの既知値を検証する。未知enum・不正JSON・code不一致はUNKNOWNであり、ACTIVEやNOT_FOUNDとして保存しない。余分なフィールドは無視し、キャッシュにはcode・正規化status・期限だけを保持する。WebはElder・Assignment・氏名を返さず、AIも保持しない。

## 状態正規化とキャッシュ

| HTTP / Web状態 | AI内部状態 | TTL | 入力とBuffer |
|---|---|---|---|
| 200 ACTIVE | ACTIVE | 30秒 | 後続の鮮度検査を通った入力のみ受理 |
| 200 INACTIVE | INACTIVE | 30秒 | 入力拒否、対象Bufferを削除 |
| 200 MAINTENANCE（Web追加予定） | INACTIVE | 30秒 | 保守中は推論不可、対象Bufferを削除。DBへのenum追加は本Task外 |
| 契約通りの404 | NOT_FOUND | 5秒 | 入力拒否、対象Bufferを削除 |
| 不正200 / 不正404 / 3xx / その他の非成功応答 | UNKNOWN | 保存しない | 入力拒否、対象Bufferを削除、API障害として記録 |
| 429 / 5xx / network / timeout | UNKNOWN | 保存しない | 期限切れACTIVEを使わず、対象Bufferを削除 |
| 401 / 403 | UNKNOWN・認証停止 | 保存しない | サービス全体の推論・API要求を抑止し、全Bufferを削除。設定修正・再起動で復旧 |

TTLは検証済み応答の取得完了時からmonotonicで計測し、`now < expires_at` の間だけ有効。期限ちょうどは失効する。キャッシュhitでTTLを延長しない。コード変更・無効化は最長で残存TTLと進行中の要求時間の影響を受け、即時反映は保証しない。

キャッシュは1プロセスRAM内、上限128件（positiveとnegativeの合計）。期限切れを先に除去し、なお満杯なら最終アクセスが最古のものを除去する。削除されたcodeのBufferも削除する。再登場やINACTIVE→ACTIVE復帰では新規100点から開始する。UNKNOWNのcodeを無制限に保存しない。

## 障害・復旧の状態表

API要求は単一Workerで直列化し、MQTT callback・health handlerから呼ばない。cooldownはAPI origin単位で1つ持ち、未知codeの連続入力でも迂回できない。

| 状態 / イベント | 動作 | 次の状態 |
|---|---|---|
| 通常 / 有効キャッシュ | 利用可否を返す。HTTP要求なし | 通常 |
| 通常 / miss・期限切れ | 1回要求し、200/404を検証して保存 | 通常 |
| 通常 / 一時障害・契約違反 | API障害フラグを立て、失敗完了から5秒のcooldown | DEGRADED |
| DEGRADED / cooldown中 | 有効ACTIVEキャッシュのみ継続可。miss・期限切れはUNKNOWNで拒否。要求なし | DEGRADED |
| DEGRADED / cooldown満了後の入力 | キャッシュmiss・期限切れなら1回要求 | 成功200/契約通り404なら通常、再失敗ならDEGRADED |
| DEGRADED / 入力なし・有効cache hitのみ | 復旧確認要求を作らず、API障害フラグを維持 | DEGRADED |
| 任意 / 401・403 | 有効ACTIVEキャッシュも使わず停止。ERRORを記録 | 認証停止 |
| 認証停止 / 次の入力 | 自動再試行なし。設定修正と再起動が必要 | 認証停止 |

429/503等の `Retry-After` が有効なら、5秒と指定待機時間の長い方を使う。秒数とHTTP-dateを受け付け、日付は受信時のUTCとの差を求めてからmonotonic期限へ変換する。過去日付・不正値・負数は5秒へfallbackする。cooldown中の入力で期限を延長しない。

将来の推論readyはAPI障害中503とし、有効キャッシュの継続処理と区別する。404やINACTIVE自体はAPI障害ではない。現在の `/health/ready` はモデル未接続のため常に503で、本Taskでは変更しない。`/health/input` の接続・購読・Worker判定とも区別する。

## OFFLINEの責務

| 項目 | 契約案 |
|---|---|
| 利用可否 | Web/DBがACTIVE・INACTIVE・MAINTENANCEを管理。通信状態で書き換えない |
| 通信状態 | AIが有効なACTIVE入力の処理時刻をmonotonicで記録。最後の受理から5秒以上でOFFLINE |
| 定期掃除 | 入力がなくてもWorkerが1秒ごとに確認。期限経過した対象Buffer・連続区間を削除。HTTP待機等で掃除が遅れるため、結果送信直前にも期限を確認 |
| 復帰 | 新しい有効なACTIVE入力でONLINE、新規100点を蓄積。無効・古い・拒否入力やHTTP成功だけではONLINEに戻さない |
| AIの通知責務 | ONLINE/OFFLINEの遷移を運用ログに1回記録。AIからDevice.statusやDBを更新しない |
| Webの表示責務 | 外部通知のTopic/schema/QoS/鮮度契約が未合意の間は「未取得」。結果が来ないことをnormal・OFFLINEとみなさない |
| 外部通知 | AI・Web・IoT・インフラで別途合意が必要。現時点ではWeb向けOFFLINEイベントの送信・到達を保証しない |

## 合意・提供状況（T05–08 / T16）

| 項目 | この文書で具体化した内容 | 残る確認 |
|---|---|---|
| T05 | #222のcode検索path・200/404、応答fixture | Web実装Issueへのcode検索範囲の追加、実URL提供 |
| T06（API部分） | 専用Bearer参照トークン、Clerkと分離 | Web/AIの認証契約承認、秘密情報の配置担当 |
| T07 | positive TTL30秒、negative TTL5秒、origin共通cooldown5秒、上限128 | 反映遅延と認証停止範囲のWeb/AI承認 |
| T08 | AIが5秒でOFFLINE、1秒ごと掃除、DB非更新 | IoT送信周期との適合、外部通知経路・payload合意 |
| T16（API部分） | 要求全体2秒、要求内retryなし | 実装ライブラリで全体deadlineを満たすこと。MQTT/ACK条件は本Task外 |

#190の「合意」は本変更だけでは完了しない。担当者承認と上記未決事項の解消を確認してから完了扱いにする。GitHub Issueへの投稿・更新は本変更では行っていない。

## 応答fixture

[responses.json](fixtures/responses.json) は架空codeによる契約例で、実APIから採取した応答ではない。status・headers・bodyをHTTP応答として使い、`expected` はAI側の解釈を示すメタデータである。MAINTENANCEは将来例、invalid系は意図的な契約違反例。自動テストは追加・実行しない。
