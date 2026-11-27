# Detailed Design — 詳細設計

## Task情報・関連設計

Issue #248。基本設計: [basic-design.md](basic-design.md)。

## Module・Function

`parseExpectedAssignmentId(request)` はクエリを1件だけ受け、ID または `none` を `string | null` に変換する。省略・複数・不正形式は 400。

PATCH が `status: "INACTIVE"` のときは、再認証後にこの値を `updateElder` へ渡す。`updateElder` は期待値なしの退所を拒否し、`exitElder` → `lockForElderExit` でロック後に照合する。

## データ形式・Validation

`expectedAssignmentId` は `[A-Za-z0-9_-]{1,64}`、または未割当を表す固定値 `none`。同名パラメータの複数指定は曖昧なため拒否する。

## インターフェース

`PATCH /api/elders/:id?expectedAssignmentId=<assignment-id|none>`

`status: "INACTIVE"` では上記クエリが必須。成功は 200 と更新済み Elder、期待値の欠落・不正は 400、割当状態の不一致は 409（`{ error }`）、再認証未完了は Clerk の 403 ヒント。`ACTIVE` への更新は期待値を不要とする。

## 状態遷移

ACTIVE → INACTIVE: 期待割当と現行割当が一致した場合のみ、Elder更新・割当終了・監査記録を同一トランザクションで確定する。不一致では全てロールバックする。

## Error・Exception handling

409 は最新状態を取得して操作者が再確認する。ロック競合や timeout は既存の 503 を維持する。400 はクライアントが現在の割当を取得して期待値を付け直す必要がある。

## Configuration・認証・認可

既存の `requireRole("NURSE")` と Clerk strict reverification を変更しない。新しい設定・秘密情報はない。

## Logging・運用

一致時のみ既存の `END_BY_ELDER_EXIT` 監査記録を残す。不一致時は監査記録を残さず 409 を返す。個人情報や生データの追加ログは行わない。

## 未決事項・備考

Web の常設ユニットテスト基盤は未導入。DBを使う競合シナリオは隔離 PostgreSQL が必要であり、本タスクでは静的検証と手動 API シナリオを記録する。


## web 固有項目

<!-- 共通の同名Templateに追加する項目。該当しない項目は理由を記載。 -->

### Page・Component・Form

画面変更なし。

### Route Handler・API契約

`src/app/api/elders/[id]/route.ts` の PATCH / DELETE が `expectedAssignmentId` の必須検証を共有する。

### Database・Prisma

既存 `Elder.status`、`DeviceAssignment.unassignedAt`、監査ログを使用する。schema / migration は変更しない。

### Clerk・権限制御

NURSE かつ DB で有効なスタッフのみ実行でき、退所は Clerk の再認証を完了してから行う。

### リアルタイム通信・ブラウザ動作

リアルタイム通信の変更はない。

