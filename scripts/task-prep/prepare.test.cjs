const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectArea, prepare, TYPES } = require('./prepare.cjs');
const comment = require('./comment.cjs');

test('explicit area overrides keywords; labels and conservative fallback work', () => {
  for (const [label, area] of Object.entries({ Web: 'web', 'AI Server': 'ai-server', IoT: 'iot', Other: 'common' })) {
    assert.equal(detectArea({ body: `### Development area\r\n\r\n${label}\r\n\r\n### Notes\nFastAPI` }).area, area);
  }
  assert.equal(detectArea({ title: 'Next.jsでSSEを受信' }).area, 'web');
  assert.equal(detectArea({ title: 'GET /api/devices' }).area, 'web');
  assert.equal(detectArea({ title: '推論とESP32' }).area, 'common');
  assert.equal(detectArea({ title: '調査' }).area, 'common');
  assert.equal(detectArea({ labels: [{ name: 'area:iot' }] }).area, 'iot');
  assert.equal(detectArea({ labels: ['area:iot', 'area:web'] }).area, 'common');
  assert.throws(() => detectArea({}, '../bad'));
});

test('all areas generate complete blank packs and preserve user edits on rerun', t => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'task-prep-test-'));
  t.after(() => fs.rmSync(output, { recursive: true, force: true }));
  for (const [index, area] of ['web', 'ai-server', 'iot', 'common'].entries()) {
    const id = String(index + 1);
    const result = prepare({ issue: { title: 'UNTRUSTED_MARKER $(touch /tmp/never)' }, id, area, output });
    assert.equal(result.files.length, 5);
    for (const type of TYPES) {
      const content = fs.readFileSync(path.join(result.destination, `${type}.md`), 'utf8');
      assert.ok(content.startsWith('# '));
      assert.ok(!content.includes('UNTRUSTED_MARKER'));
      assert.equal(content.includes('固有項目'), area !== 'common' && type !== 'test-plan');
    }
    const file = path.join(result.destination, 'basic-design.md');
    fs.writeFileSync(file, '担当者の記入済み設計');
    assert.throws(() => prepare({ issue: {}, id, area, output }), /EEXIST/);
    assert.equal(fs.readFileSync(file, 'utf8'), '担当者の記入済み設計');
  }
  assert.ok(prepare({ issue: {}, id: 'CCC-112', output }).destination.endsWith('CCC-112'));
  for (const id of ['../escape', '0', '1/2', 'undefined', '$(whoami)']) {
    assert.throws(() => prepare({ issue: {}, id, output }), /ID must/);
  }
});

test('comment creation and repeat updates only target the automation bot', async () => {
  const calls = [];
  const context = {
    repo: { owner: 'owner', repo: 'repo' }, issue: { number: 12 },
    serverUrl: 'https://github.com', runId: 10,
    payload: { repository: { default_branch: 'main' } },
  };
  let comments = [{ id: 1, user: { login: 'someone' }, body: '<!-- task-preparation:v1 -->' }];
  const github = {
    rest: { issues: {
      get: async () => ({ data: { title: 'Clerk' } }),
      listComments: () => {},
      createComment: async data => calls.push(['create', data]),
      updateComment: async data => calls.push(['update', data]),
    } },
    paginate: async () => comments,
  };
  await comment({ github, context });
  assert.equal(calls[0][0], 'create');
  assert.ok(calls[0][1].body.includes('--id 12 --area web'));
  comments.push({ id: 2, user: { login: 'github-actions[bot]' }, body: calls[0][1].body });
  await comment({ github, context });
  assert.equal(calls[1][0], 'update');
  assert.equal(calls[1][1].comment_id, 2);
});
