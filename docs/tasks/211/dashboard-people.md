# CCC-248 / #211 Dashboard の高齢者・スタッフ情報の DB 連携

## 対象と調査結果

- Linear: https://linear.app/cccpj/issue/CCC-248
- GitHub: https://github.com/CCCproject2026/ccc_project_2026/issues/211
- ユーザー確認により高齢者・スタッフ情報だけを対象とする。
- 参照: `docs/basic_design/web_basic.md`、`docs/development/workflow.md`、現行 Prisma schema。
- 従来は Dashboard と詳細が `mockDashboardData.ts` の架空人物・集計値を参照していた。
- デバイス・アラート・バッテリー・対応履歴の DB / MQTT 連携は対象外。共通レイアウト・サイドバーと Dashboard のアラーム、デバイス統計には従来モックが残る。

## 設計

- Server Component から server-only の取得処理を利用し、既存 `requireStaffPage` で ACTIVE スタッフだけを許可する。
- 一覧は ACTIVE の Elder だけ。氏名・生年月日・居室・ID のみを24件ずつ取得する。件数は DB の count。安定した居室・ID順でページングする。
- 有効スタッフ数は User.status = ACTIVE の件数。オンライン・出勤状況とは扱わず、メール等の個人情報は取得しない。
- 一覧・件数は RepeatableRead の読取トランザクションで取得。業務クエリは3回で、入居者数による N+1 はない。
- 既存 listElders / listStaff は管理画面用の追加集計・情報を取得するため、Dashboard の一覧にそのまま流用しない。
- 詳細は既存 getElder を再利用。実 DB ID をモック ID に変換しない。基本情報だけを表示し、無関係な架空端末・履歴は付加しない。
- 年齢は既存の日付ヘルパーで日本時間の今日と DB DATE を比較する。
- ページパラメータは正の安全な整数のみ。範囲外は最終ページに補正。0件表示・loading・error の再試行・詳細404を用意する。
- DB schema、migration、既存 API、認可ルール、共有キャッシュは変更しない。現行モデルにテナント列はなく、新しいデータ分離ルールも導入しない。

## 検証

- CLI は使わず統合 JavaScript ランタイム経由で TypeScript Compiler API（tsconfig適用）と ESLint API（src全体）を実行。エラー・警告0件。
- TypeScript をインメモリで変換し、Node assert で検証: 日本時間の誕生日前後、ページ番号9パターン、範囲外補正、24件制限、ACTIVE条件、0件、認可拒否、DBエラー伝播。成功。DB・認証はテストダブルであり、実DB結合試験ではない。
- 実DB反映、ログインしたブラウザでの表示・操作、実DBクエリ計測は未検証。
- ローカルビルドは CLI 禁止のため未実施。GitHub PR の既存 build / lint CI を確認する。

## 残存リスクと手動確認

- 対象外のアラームはモックのまま。実在の入居者一覧との一致や、実際の監視状態を保証しない。別Taskで連携が必要。
- 詳細のデバイス・対応履歴欄は実在人物への架空情報表示を避けるため非表示。各機能の実装・部品は削除しない。
- ACTIVE の両ロールで一覧・詳細を確認し、PENDING / INACTIVE と未ログインを拒否できることを実環境で確認する。
- DBで高齢者の追加・氏名変更・退所、スタッフの有効化・停止後にページを再取得して反映を確認する。自動ポーリングは対象外。
- 0件、25件以上、存在しないID、DB停止、再試行を実環境で確認する。
