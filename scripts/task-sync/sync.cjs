const { detectArea } = require('../task-prep/prepare.cjs');
const SYNC = '<!-- task-sync:link:v1 -->';
const PREP = '<!-- task-preparation:v1 -->';
const UUID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

function config(env) {
  for (const key of ['LINEAR_TEAM_ID', 'TASK_SYNC_SINCE']) {
    if (!env[key]) throw new Error(`${key} is required`);
  }
  if (!new RegExp(`^${UUID}$`, 'i').test(env.LINEAR_TEAM_ID)) throw new Error('LINEAR_TEAM_ID must be a UUID');
  if (env.LINEAR_PROJECT_ID && !new RegExp(`^${UUID}$`, 'i').test(env.LINEAR_PROJECT_ID)) throw new Error('LINEAR_PROJECT_ID must be a UUID');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(env.TASK_SYNC_SINCE) ||
      !Number.isFinite(Date.parse(env.TASK_SYNC_SINCE))) throw new Error('TASK_SYNC_SINCE must be an ISO UTC timestamp');
  return { teamId: env.LINEAR_TEAM_ID, projectId: env.LINEAR_PROJECT_ID || undefined, since: env.TASK_SYNC_SINCE };
}

function linearOrigin(body = '') {
  return body.match(new RegExp(`^<!-- task-sync:linear:(${UUID}) -->$`, 'mi'))?.[1];
}

function githubOrigin(description = '') {
  return description.match(/^Task sync source: (https:\/\/github\.com\/[^\s/]+\/[^\s/]+\/issues\/[1-9][0-9]*)\s*$/m)?.[1];
}

function guidance(issue, base, ref) {
  const { area } = detectArea(issue);
  return '\n\n## 開発準備\n\n' +
    `Development area: ${area}\n\n` +
    `[共通Template](${base}/tree/${ref}/docs/templates/common) · ` +
    `[領域別Template](${base}/tree/${ref}/docs/templates/${area}) · ` +
    `[開発手順](${base}/blob/${ref}/docs/development/workflow.md)\n\n` +
    '設計書の生成ファイルは対応するGitHub Issueの開発準備コメントから取得できます。';
}

function unique(items, predicate) {
  const matches = items.filter(predicate);
  if (matches.length > 1) throw new Error('Conflicting task mappings; resolve duplicate links before retrying');
  return matches[0];
}

async function sync({ github, linear, context, settings }) {
  const { owner, repo } = context.repo;
  const base = `${context.serverUrl}/${owner}/${repo}`;
  if (context.serverUrl !== 'https://github.com') throw new Error('This integration currently supports github.com');
  const ref = encodeURIComponent(context.payload.repository.default_branch);
  // Read both inventories completely before creating anything. A failed read must
  // never be mistaken for an empty target. Include closed/archived counterparts.
  const ghIssues = (await github.paginate(github.rest.issues.listForRepo,
    { owner, repo, state: 'all', per_page: 100 })).filter(issue => !issue.pull_request);
  const linearIssues = await linear.list(settings);
  for (const task of linearIssues) {
    const origin = githubOrigin(task.description || '');
    if (origin) unique(linearIssues, item => githubOrigin(item.description || '') === origin);
  }
  const pending = [];
  const linked = new Set();

  async function link(gh, task) {
    if (linked.has(gh.number)) return;
    linked.add(gh.number);
    const comments = await github.paginate(github.rest.issues.listComments,
      { owner, repo, issue_number: gh.number, per_page: 100 });
    const botComments = comments.filter(item => item.user?.login === 'github-actions[bot]');
    const existing = botComments.find(item => item.body?.startsWith(SYNC));
    const body = `${SYNC}\n対応するLinear Task: [${task.identifier}](${task.url})\n\n` +
      '新規作成の相互連携です。作成後のタイトル・本文・状態・担当者は自動同期しません。';
    if (!existing || existing.body !== body) {
      // Same issueId + URL is an idempotent Linear attachment upsert.
      await linear.attach(task.id, gh.html_url);
      if (existing) await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
      else await github.rest.issues.createComment({ owner, repo, issue_number: gh.number, body });
    }
    if (!botComments.some(item => item.body?.startsWith(PREP))) pending.push(gh);
  }

  // Linear -> GitHub first. Mark the origin in the create operation itself so a
  // crash before backlink creation can recover by listing Issues on the next run.
  for (const task of linearIssues) {
    const origin = githubOrigin(task.description || '');
    if (origin) {
      const gh = unique(ghIssues, issue => issue.html_url === origin);
      if (origin.startsWith(`${base}/issues/`) && !gh) throw new Error(`Missing GitHub counterpart for ${task.identifier}; restore it or resolve the mapping`);
      if (gh) await link(gh, task);
      continue;
    }
    let gh = unique(ghIssues, issue => linearOrigin(issue.body || '') === task.id ||
      (issue.body || '').includes(`<!-- migrated-from-linear: ${task.identifier} -->`));
    if (!gh && !task.archivedAt) {
      const issue = { title: task.title, body: task.description || '' };
      const area = detectArea(issue).area;
      const label = { web: 'Web', 'ai-server': 'AI Server', iot: 'IoT', common: 'Other' }[area];
      const body = `<!-- task-sync:linear:${task.id} -->\n[Linear: ${task.identifier}](${task.url})\n\n` +
        `${task.description || ''}\n\n### Development area\n\n${label}` + guidance(issue, base, ref);
      const result = await github.rest.issues.create({ owner, repo, title: task.title, body });
      gh = result.data;
      ghIssues.push(gh);
    }
    if (gh) await link(gh, task);
  }

  // Event processing and scheduled recovery use the same source inventory.
  for (const gh of ghIssues) {
    if (linked.has(gh.number) || Date.parse(gh.created_at) < Date.parse(settings.since)) continue;
    if (linearOrigin(gh.body || '') || /<!-- migrated-from-linear: [A-Z0-9]+-\d+ -->/.test(gh.body || '')) continue;
    let task = unique(linearIssues, item => githubOrigin(item.description || '') === gh.html_url);
    if (!task) {
      const previous = await github.paginate(github.rest.issues.listComments,
        { owner, repo, issue_number: gh.number, per_page: 100 });
      if (previous.some(item => item.user?.login === 'github-actions[bot]' && item.body?.startsWith(SYNC))) {
        throw new Error(`Linear counterpart for GitHub #${gh.number} is outside the sync inventory; check team/project/date or deleted tasks`);
      }
      const input = { teamId: settings.teamId, title: gh.title,
        description: `Task sync source: ${gh.html_url}\n\n${gh.body || ''}` + guidance(gh, base, ref) };
      if (settings.projectId) input.projectId = settings.projectId;
      task = await linear.create(input);
      linearIssues.push(task);
    }
    await link(gh, task);
  }
  return pending;
}

module.exports = { sync, config, linearOrigin, githubOrigin };
