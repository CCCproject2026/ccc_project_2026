const fs = require('node:fs');
const path = require('node:path');
const { sync, config } = require('./sync.cjs');
const { linearClient } = require('./linear.cjs');
const { prepare } = require('../task-prep/prepare.cjs');
const comment = require('../task-prep/comment.cjs');

module.exports.generate = async ({ github, context, core }) => {
  const settings = config(process.env);
  const pending = await sync({ github, context, settings, linear: linearClient(process.env.LINEAR_API_KEY) });
  const output = path.join(process.env.RUNNER_TEMP, 'task-sync-designs');
  for (const issue of pending) prepare({ issue, id: issue.number, output });
  fs.writeFileSync(path.join(process.env.RUNNER_TEMP, 'task-sync-pending.json'), JSON.stringify(pending.map(issue => issue.number)));
  core.setOutput('count', String(pending.length));
  core.info(`Task sync completed; ${pending.length} task packs prepared`);
};

module.exports.publish = async ({ github, context }) => {
  const pending = JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP, 'task-sync-pending.json'), 'utf8'));
  for (const number of pending) {
    await comment({ github, context: {
      repo: context.repo, issue: { number }, serverUrl: context.serverUrl,
      runId: context.runId, payload: context.payload,
    } });
  }
};
