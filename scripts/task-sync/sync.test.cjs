const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sync, config } = require('./sync.cjs');
const { linearClient } = require('./linear.cjs');
const { detectArea } = require('../task-prep/prepare.cjs');

const teamId = '11111111-1111-4111-8111-111111111111';
const taskId = '22222222-2222-4222-8222-222222222222';
const settings = { teamId, since: '2026-09-08T00:00:00Z' };
const context = { repo: { owner: 'CCCproject2026', repo: 'ccc_project_2026' }, serverUrl: 'https://github.com',
  payload: { repository: { default_branch: 'main' } } };
const base = 'https://github.com/CCCproject2026/ccc_project_2026';
const ghTask = overrides => ({ number: 10, title: 'Clerk連携', body: '### Development area\n\nWeb',
  html_url: `${base}/issues/10`, created_at: '2026-09-08T01:00:00Z', ...overrides });
const linearTask = overrides => ({ id: taskId, identifier: 'CCC-201', title: '推論入力の確認', description: '',
  url: 'https://linear.app/cccpj/issue/CCC-201', createdAt: '2026-09-08T01:00:00Z', archivedAt: null, ...overrides });

function harness(gh = [], tasks = []) {
  const comments = new Map();
  const attachments = new Map();
  const calls = { ghCreate: 0, linearCreate: 0 };
  const github = { rest: { issues: {
    listForRepo: 'listForRepo', listComments: 'listComments',
    create: async input => {
      calls.ghCreate++;
      const item = ghTask({ number: 100 + calls.ghCreate, html_url: `${base}/issues/${100 + calls.ghCreate}`, ...input });
      gh.push(item);
      return { data: item };
    },
    createComment: async ({ issue_number, body }) => {
      const list = comments.get(issue_number) || [];
      list.push({ id: issue_number * 100 + list.length, body, user: { login: 'github-actions[bot]' } });
      comments.set(issue_number, list);
    },
    updateComment: async ({ comment_id, body }) => {
      for (const list of comments.values()) for (const item of list) if (item.id === comment_id) item.body = body;
    },
  } }, paginate: async (method, args) => method === 'listForRepo' ? [...gh] : [...(comments.get(args.issue_number) || [])] };
  const linear = {
    list: async () => [...tasks],
    create: async input => {
      calls.linearCreate++;
      const item = linearTask({ ...input, id: `33333333-3333-4333-8333-${String(calls.linearCreate).padStart(12, '0')}` });
      tasks.push(item);
      return item;
    },
    attach: async (id, url) => attachments.set(`${id}:${url}`, true),
  };
  return { github, linear, context, settings, comments, attachments, calls, gh, tasks };
}

test('GitHub -> Linear copies content, links both sides, and is repeatable', async () => {
  const h = harness([ghTask()]);
  const pending = await sync(h);
  assert.deepEqual(pending.map(x => x.number), [10]);
  assert.equal(h.tasks[0].teamId, teamId);
  assert.ok(h.tasks[0].description.includes(`Task sync source: ${base}/issues/10`));
  assert.ok(h.tasks[0].description.includes('docs/templates/web'));
  assert.equal(h.attachments.size, 1);
  assert.equal(h.comments.get(10).length, 1);
  h.comments.get(10).push({ body: '<!-- task-preparation:v1 -->', user: { login: 'github-actions[bot]' } });
  assert.deepEqual(await sync(h), []);
  assert.equal(h.calls.linearCreate, 1);
  assert.equal(h.calls.ghCreate, 0);
});

test('Linear -> GitHub prepares AI documents without relying on a second workflow event', async () => {
  const h = harness([], [linearTask()]);
  const [pending] = await sync(h);
  assert.equal(detectArea(pending).area, 'ai-server');
  assert.ok(pending.body.includes(`<!-- task-sync:linear:${taskId} -->`));
  assert.equal(h.attachments.size, 1);
  await sync(h);
  assert.equal(h.calls.ghCreate, 1);
  assert.equal(h.calls.linearCreate, 0);
});

test('new tasks on both services converge without creating a sync loop', async () => {
  const h = harness([ghTask()], [linearTask()]);
  assert.equal((await sync(h)).length, 2);
  await sync(h);
  assert.equal(h.gh.length, 2);
  assert.equal(h.tasks.length, 2);
  assert.equal(h.calls.ghCreate, 1);
  assert.equal(h.calls.linearCreate, 1);
});

test('a timeout after successful creation recovers from the target inventory in either direction', async () => {
  for (const direction of ['github', 'linear']) {
    const h = direction === 'github' ? harness([], [linearTask()]) : harness([ghTask()]);
    const target = direction === 'github' ? h.github.rest.issues : h.linear;
    const create = target.create;
    target.create = async input => { await create(input); throw new Error('network timeout after write'); };
    await assert.rejects(sync(h), /timeout/);
    target.create = create;
    const result = await sync(h);
    assert.equal(result.length, 1);
    assert.equal(h.calls.ghCreate + h.calls.linearCreate, 1);
  }
});

test('attachment failure recovers without recreating either task', async () => {
  const h = harness([ghTask()]);
  const attach = h.linear.attach;
  h.linear.attach = async () => { throw new Error('attachment failed'); };
  await assert.rejects(sync(h), /attachment failed/);
  h.linear.attach = attach;
  await sync(h);
  assert.equal(h.calls.linearCreate, 1);
  assert.equal(h.comments.get(10).length, 1);
});

test('ignores old GitHub issues and PRs and reuses migration markers even on closed Issues', async () => {
  const h = harness([
    ghTask({ number: 1, created_at: '2026-09-01T00:00:00Z' }),
    ghTask({ number: 2, pull_request: {} }),
    ghTask({ number: 3, state: 'closed', body: '<!-- migrated-from-linear: CCC-201 -->' }),
  ], [linearTask()]);
  const result = await sync(h);
  assert.deepEqual(result.map(item => item.number), [3]);
  assert.equal(h.calls.ghCreate + h.calls.linearCreate, 0);
});

test('failed inventory read cannot cause creation; archived tasks are not re-created', async () => {
  const h = harness([ghTask()]);
  h.linear.list = async () => { throw new Error('read failed'); };
  await assert.rejects(sync(h), /read failed/);
  assert.equal(h.calls.linearCreate, 0);
  const archived = harness([], [linearTask({ archivedAt: '2026-09-08T02:00:00Z' })]);
  assert.deepEqual(await sync(archived), []);
  assert.equal(archived.calls.ghCreate, 0);
});

test('missing or conflicting mappings fail closed instead of silently duplicating', async () => {
  const missing = harness([], [linearTask({ description: `Task sync source: ${base}/issues/10` })]);
  await assert.rejects(sync(missing), /Missing GitHub counterpart/);
  const conflict = harness([ghTask()], [
    linearTask({ description: `Task sync source: ${base}/issues/10` }),
    linearTask({ id: teamId, description: `Task sync source: ${base}/issues/10` }),
  ]);
  await assert.rejects(sync(conflict), /Conflicting/);
  const moved = harness([ghTask()]);
  moved.comments.set(10, [{ body: '<!-- task-sync:link:v1 -->', user: { login: 'github-actions[bot]' } }]);
  await assert.rejects(sync(moved), /outside the sync inventory/);
  assert.equal(moved.calls.linearCreate, 0);
});

test('configuration requires explicit scope and fixed start time', () => {
  assert.throws(() => config({}), /LINEAR_TEAM_ID/);
  assert.throws(() => config({ LINEAR_TEAM_ID: teamId }), /TASK_SYNC_SINCE/);
  assert.throws(() => config({ LINEAR_TEAM_ID: 'CCC', TASK_SYNC_SINCE: settings.since }), /UUID/);
  assert.throws(() => config({ LINEAR_TEAM_ID: teamId, TASK_SYNC_SINCE: 'yesterday' }), /timestamp/);
  assert.deepEqual(config({ LINEAR_TEAM_ID: teamId, TASK_SYNC_SINCE: settings.since }), { ...settings, projectId: undefined });
});

test('Linear client paginates, filters scope, and checks GraphQL/HTTP/mutation errors', async () => {
  const requests = [];
  const client = linearClient('fake-key', async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    assert.equal(url, 'https://api.linear.app/graphql');
    const first = !body.variables.after;
    return { ok: true, json: async () => ({ data: { issues: {
      nodes: [linearTask({ identifier: first ? 'CCC-201' : 'CCC-202' })],
      pageInfo: { hasNextPage: first, endCursor: first ? 'cursor-1' : null },
    } } }) };
  });
  const result = await client.list({ ...settings, projectId: taskId });
  assert.equal(result.length, 2);
  assert.equal(requests[1].variables.after, 'cursor-1');
  assert.deepEqual(requests[0].variables.filter.team, { id: { eq: teamId } });
  assert.deepEqual(requests[0].variables.filter.createdAt, { gte: settings.since });
  assert.deepEqual(requests[0].variables.filter.project, { id: { eq: taskId } });
  for (const response of [
    { ok: false, status: 429 },
    { ok: true, json: async () => ({ errors: [{ message: 'sensitive-detail' }] }) },
    { ok: true, json: async () => ({ data: { issueCreate: { success: false } } }) },
  ]) {
    let attempts = 0;
    const broken = linearClient('fake-key', async () => { attempts++; return response; });
    await assert.rejects(broken.create({ title: 'test' }), error => !error.message.includes('sensitive-detail'));
    assert.equal(attempts, 1);
  }
});
