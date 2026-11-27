# Implementation Plan — 実装計画

## Task情報・実装目的

Issue #248。PATCH 経由の退所も、DELETE と同じ割当競合照合の対象にする。

## 実装対象・変更ファイル

| ファイル | 変更 |
| --- | --- |
| `main/web/src/app/api/elders/[id]/route.ts` | 退所時の期待割当IDを必須検証し、PATCH に渡す |
| `main/web/src/features/elder-management/server/elder-service.ts` | 照合なしの退所をサービス層でも拒否する |
| `main/web/src/features/device-management/server/assignment-service.ts` | 期待値を必須型にし、ロック後に常に照合する |

## 開発環境

静的検証は `main/web` で既存 `node_modules` を使い `pnpm lint` と `pnpm build` を実行する。競合の結合テストには Clerk と隔離 PostgreSQL が必要で、実データベースは使用しない。

## 作業Task

<!-- 順序、Owner、Priority、依存Task、現在のStatusを記入。 -->

| No | Task | Owner | Priority | Dependency | Status |
| -- | ---- | ----- | -------- | ---------- | ------ |
| 1 | PATCH/DELETE の期待値必須化 | Codex | High | なし | 完了 |
| 2 | サービス/トランザクションの照合保証 | Codex | High | 1 | 完了 |
| 3 | lint・build・差分確認 | Codex | High | 1,2 | 実施中 |
| 4 | 独立コードレビュー | 別Agentまたは人間 | High | 3 | 完了 |

## テスト対象・完了条件

`test-plan.md` の TP-248-01〜05 を参照する。ユーザー方針によりテストコードは追加せず、期待値あり/なし、割当追加・交換・解除後の 409 と副作用なしは隔離環境での確認対象とする。

## Risk・未決事項

API を直接呼ぶ旧クライアントは、退所時に 400 となる。これは照合なしの退所を禁止する意図した破壊的契約変更であり、連携元は事前取得した割当 ID または `none` を付ける必要がある。


## web 固有項目

<!-- 共通の同名Templateに追加する項目。該当しない項目は理由を記載。 -->

### Web作業の分解観点

Route Handler・server feature のみを変更し、Prisma schema / migration、Client component、Clerk設定は変更しない。

### Web検証観点

既存 Web に `test` script はなく、ユーザー方針によりテストコードは追加しない。lint/build と、隔離環境が用意できた場合の API 手動確認を行う。

