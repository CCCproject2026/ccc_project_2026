# 開発Template

Taskを受け取ったら [開発手順](../development/workflow.md) に従って生成し、担当者が記入します。設計内容は自動で決定しません。該当しない項目は理由を記載してください。

| 配置 | 目的 |
| --- | --- |
| [common/basic-design.md](common/basic-design.md) | 目的、範囲、構成、責務、フロー、非機能要件 |
| [common/detailed-design.md](common/detailed-design.md) | 実装可能な入出力、ロジック、状態、異常処理 |
| [common/implementation-plan.md](common/implementation-plan.md) | 作業順序、担当、優先度、依存関係、完了条件 |
| [common/test-plan.md](common/test-plan.md) | 受入条件、検証ケース、実行結果、証跡 |
| [web/](web/) | 上記の基本設計・詳細設計・実装計画に追加するWeb固有項目 |
| [ai-server/](ai-server/) | 同じ３種類に追加するAI固有項目 |
| [iot/](iot/) | 同じ３種類に追加するDevice固有項目 |
| [task.md](task.md) | Linear／自由記述Issue用の空のTaskフォーマット |

領域別ファイルは追加項目のみを保持し、生成時に共通ファイルへ結合します。Test Planは共通で、領域別実装計画の検証観点を反映してください。出力はTaskごとに４文書と索引READMEです。

| Development area | 合成元 |
| --- | --- |
| Web | common + web |
| AI Server | common + ai-server |
| IoT | common + iot |
| Other／複数領域／判定不能 | common |

複数領域では共通文書を１組用意し、関係する領域の追加項目を担当者が追記します。独立した受入条件・担当作業がある場合は既存の親子Issue運用に合わせて分割できます。

参考資料は [Component Design](../component-design.md)、[全体構成](../../main/docs/architecture.md)、[Prisma schema](../../main/web/prisma/schema.prisma)。実装と資料に差がある場合は既存の決定事項を確認し、Taskの未決事項として残します。
