const { detectArea } = require('./prepare.cjs');
const MARKER = '<!-- task-preparation:v1 -->';

module.exports = async ({ github, context }) => {
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;
  // Read latest state so a queued run does not publish stale classification.
  const { data: issue } = await github.rest.issues.get({ owner, repo, issue_number });
  const { area, reason } = detectArea(issue);
  const base = `${context.serverUrl}/${owner}/${repo}`;
  const ref = encodeURIComponent(context.payload.repository.default_branch);
  const template = `${base}/tree/${ref}/docs/templates`;
  const body = `${MARKER}\n## 開発準備\n\n領域: **${area}**\n\n${reason}\n\n` +
    `- [共通Template](${template}/common)\n` +
    (area === 'common' ? '' : `- [領域別の追加項目](${template}/${area})\n`) +
    `- [生成ファイルをダウンロード（この実行のArtifacts）](${base}/actions/runs/${context.runId})\n` +
    `- [担当者の作業手順](${base}/blob/${ref}/docs/development/workflow.md)\n\n` +
    `生成ファイルは実行時点のIssueに基づきます。領域変更時は最新の実行結果を使用してください。\n\n` +
    `ローカル生成: \`node scripts/task-prep/prepare.cjs --id ${issue_number} --area ${area}\`\n\n` +
    '領域を修正する場合は本文の `Development area` を編集してください。複数領域はOtherを選び、必要な追加項目を使用します。記入済みファイルは自動更新しません。';
  const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 });
  const previous = comments.find(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.startsWith(MARKER));
  if (previous) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: previous.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number, body });
  }
};
