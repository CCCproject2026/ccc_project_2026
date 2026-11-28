# Linear ↔ GitHub Task作成の連携

CCCチームの新規Taskと、このRepositoryの新規Issueを相互に作成します。実装は `.github/workflows/task-sync.yml` と `scripts/task-sync/` です。

| 作成元 | 動作 |
| --- | --- |
| GitHub | Issue作成イベントでLinearのCCCチームにTaskを作成 |
| Linear | 10分間隔のActionsで新規Taskを取得し、GitHub Issueを作成 |
| 両方 | 相互リンクを追加し、GitHubで領域別の空の設計書４点と索引を生成 |

定期実行はGitHubの混雑等で遅延することがあります。即時確認にはActionsの「Linear GitHub Task Sync」→「Run workflow」を使います。Webhookサーバーの設置は不要です。

## 有効化

この変更をデフォルトブランチへ取り込んだ後、GitHub Repositoryの **Settings → Secrets and variables → Actions** に設定します。キーをIssue、PR、チャット、Repository内のファイルに貼らないでください。

| 種類 | 名前 | 設定値 |
| --- | --- | --- |
| Secret | `LINEAR_API_KEY` | CCCチームを読み取り、Issue・Attachmentを作成できるLinear Personal API key |
| Variable | `LINEAR_TEAM_ID` | CCCチームのUUID。`CCC`という表示名ではなくUUID |
| Variable | `TASK_SYNC_SINCE` | 同期を開始する固定UTC日時。書式は `YYYY-MM-DDTHH:mm:ssZ` |
| Variable | `TASK_SYNC_ENABLED` | 他の設定を終えた後に `true` |
| Variable（任意） | `LINEAR_PROJECT_ID` | 特定Projectに限定する場合のUUID。今回のCCCチーム全体では未設定 |

Linear APIキーはLinearのSettings → Security & accessで作成します。CCCチームのページでコマンドメニューの「Copy model UUID」からIDを取得できます。APIから調べる場合は `teams { nodes { id name key } }` を使います。

`TASK_SYNC_SINCE` は有効化開始日時にしてください。未設定では失敗し、過去のTaskを無条件に一括作成しません。稼働後は毎回現在日時へ更新せず、同じ値を維持してください。これにより実行停止中のTaskも回収できます。

GitHub側は標準の `GITHUB_TOKEN` を使用し、`contents: read` / `issues: write` が必要です。追加のGitHub PATは不要です。未設定の `TASK_SYNC_ENABLED` は無効扱いで、既存のTask Preparationは引き続き利用できます。

Linear標準連携など、同じ対象のIssue作成を行う別の同期処理と併用しないでください。今回の実装が認識するのは専用マーカーと既存の `migrated-from-linear` マーカーです。

## 担当者の使い方

GitHubでは既存のDevelopment Taskフォームを利用できます。Linearでは通常の新規Taskを作成すれば同期対象になります。領域を明示する場合は [Taskフォーマット](../templates/task.md) をDescriptionへコピーし、次の形式で記入してください。

```markdown
### Development area

Web
```

指定可能な値は `Web` / `AI Server` / `IoT` / `Other` です。未指定時はタイトル・Descriptionから判定し、不明な場合は共通テンプレートを用意します。Linearの作成画面へカスタムフォームを登録する機能は、このActionsには含めません。

Linearには「GitHub Issue・開発準備」のAttachmentが表示されます。そこからGitHub Issueを開き、開発準備コメントの実行リンクで `synced-task-designs` Artifactを取得します。ZIP内のIssue番号フォルダがTaskごとの設計書です。既存Task Preparationが先に生成した場合は、そのコメントに記載されたArtifactを使います。

## 同期する内容

新規作成時のタイトル・本文を複製し、開発領域の判定、Template案内、相互リンクを追加します。添付画像等のバイナリは転送せず、本文内の元リンクを保持します。閲覧には元サービスの権限が必要な場合があります。

今回の対象は**新規Taskの相互作成**です。作成後のタイトル・本文の編集、Status、Assignee、Priority、ラベル、コメント、削除は双方向同期しません。GitHubユーザーとLinearユーザーの対応付けも行いません。

## 重複防止・復旧

- Linearから作成したGitHub Issueには `<!-- task-sync:linear:<UUID> -->` を作成時に保存します。
- GitHubから作成したLinear Taskには `Task sync source: <GitHub Issue URL>` を作成時に保存します。
- 次の実行は両側の一覧を取得して既存の対応先を再利用します。GitHubはclosedを含み、Linearは設定範囲内のarchivedも含みます。
- 作成成功後にタイムアウトしても、次回の取得で対応先を発見できれば、リンク・開発準備から復旧します。書込みAPIの自動再試行は行いません。
- LinearのAttachmentは同じTaskとURLの組合せで再利用し、GitHubの同期コメントはbot専用マーカーで再利用します。
- 既存の `<!-- migrated-from-linear: CCC-番号 -->` があるIssueを見つけた場合は再利用します。
- 同期済みの相手が消えた・対象範囲外になった場合は、検出できるリンクを基にエラーで停止します。マーカーを手動削除すると対応を追跡できなくなるため保持してください。
- 対応関係が複数ある場合や一覧取得に失敗した場合は、新規作成を進めずエラーにします。

同期と既存Task Preparationは同じconcurrency groupで書込みを直列化します。GitHubの待機実行が置き換わっても、新規Taskの同期は次の定期実行で回収します。既存Issueの編集イベントが置き換わった場合はTask Preparationを再実行してください。

`GITHUB_TOKEN` によるIssue作成は通常、別のIssueイベントworkflowを起動しません。そのため同期workflow内で直接設計書を生成し、Artifact保存が成功してから開発準備コメントを投稿します。途中で失敗した場合も、開発準備コメントのないTaskを次回処理します。

この方式は固定開始日時以降を再確認する小規模チーム向けです。Task数が増えるとAPI呼出しも増えるため、実行時間・rate limitを確認してください。長期運用で負荷が増えた場合は永続的な対応表とWebhookへ移行します。APIの一時的不整合、手動でのマーカー削除、外部同期との競合まで含めたexactly-onceの保証はありません。

## 検証・運用確認

```bash
node --test scripts/task-prep/*.test.cjs scripts/task-sync/*.test.cjs
```

ローカルでは両方向作成、再実行、作成直後の通信失敗、Attachment失敗、移行済みIssue、closed/archived、ページング、APIエラー、設定不足をモックで検証します。

有効化後は次を実サービスで確認してください。

1. GitHubにWeb領域のTaskを作り、CCCに１件だけ作成されること。
2. LinearのCCCにAIまたはIoTのTaskを作り、GitHubに１件だけ作成されること。
3. 両側のリンクから開発準備コメント・Artifactを開けること。
4. 「Run workflow」で再実行してもTask・リンクコメントが重複しないこと。

エラーはActionsの実行ログで確認します。権限やrate limitを修正して再実行してください。停止は `TASK_SYNC_ENABLED=false` にします。既存Task・設計書は削除されません。

仕様参照: [Linear GraphQL・認証](https://linear.app/developers/graphql)、[Pagination](https://linear.app/developers/pagination)、[Attachmentの冪等性](https://linear.app/developers/attachments)、[GITHUB_TOKENとイベント起動](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)。
