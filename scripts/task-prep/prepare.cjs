const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = ['basic-design', 'detailed-design', 'implementation-plan', 'test-plan'];
const AREAS = { Web: 'web', 'AI Server': 'ai-server', IoT: 'iot', Other: 'common' };

function detectArea(issue, override) {
  if (override) {
    if (!Object.values(AREAS).includes(override)) throw new Error('Invalid area');
    return { area: override, reason: 'CLIで指定' };
  }
  const body = issue.body || '';
  const field = body.match(/^### Development area\s*\n+([^\n]+)/m);
  if (field && AREAS[field[1].trim()]) {
    return { area: AREAS[field[1].trim()], reason: 'Development areaで指定' };
  }
  const labels = (issue.labels || []).map(label => typeof label === 'string' ? label : label.name);
  const explicit = Object.values(AREAS).filter(area => labels.includes(`area:${area}`));
  if (explicit.length === 1) return { area: explicit[0], reason: 'areaラベルで指定' };
  if (explicit.length > 1) return { area: 'common', reason: '複数の領域ラベル：担当者が確認' };
  const content = `${issue.title || ''}\n${body}`;
  const rules = {
    web: /main\/web|next\.?js|react|prisma|clerk|dashboard|ダッシュボード|画面|\/api\/(?:staff|residents|devices)\b/i,
    'ai-server': /main\/ai|fastapi|pytorch|cnn|推論|前処理|scaler|モデル/i,
    iot: /main\/iot|esp32|raspberry|mpu6050|firmware|ファームウェア|sampling|サンプリング/i,
  };
  const hits = Object.keys(rules).filter(area => rules[area].test(content));
  return hits.length === 1
    ? { area: hits[0], reason: '本文・タイトルから推定：担当者が確認' }
    : { area: 'common', reason: '判定不能または複数領域：担当者が確認' };
}

function prepare({ issue, id, area, output, root = ROOT }) {
  if (!/^(?:[1-9][0-9]*|[A-Z][A-Z0-9]*-[1-9][0-9]*)$/.test(String(id))) {
    throw new Error('ID must be a positive GitHub issue number or Linear identifier (CCC-123)');
  }
  const result = detectArea(issue, area);
  const files = {};
  for (const type of TYPES) {
    let text = fs.readFileSync(path.join(root, 'docs/templates/common', `${type}.md`), 'utf8');
    if (result.area !== 'common' && type !== 'test-plan') {
      text += '\n' + fs.readFileSync(path.join(root, 'docs/templates', result.area, `${type}.md`), 'utf8');
    }
    files[`${type}.md`] = text;
  }
  // Issue text is never executable code, a path, or generated design content.
  files['README.md'] = `# Task ${id}\n\n領域: ${result.area}\n\n判定根拠: ${result.reason}\n\n` +
    TYPES.map(type => `- [${type}](${type}.md)`).join('\n') +
    '\n\nTask情報は担当者が記入してください。複数領域の場合は領域別の追加項目を合成してください。\n';
  const destination = path.resolve(output || path.join(root, 'docs/tasks'), String(id));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  // Exclusive directory creation protects filled-in documents and concurrent runs.
  fs.mkdirSync(destination);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(destination, name), text, { flag: 'wx' });
  return { ...result, destination, files: Object.keys(files) };
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: {
      event: { type: 'string' }, id: { type: 'string' }, area: { type: 'string' },
      output: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' },
    } });
    const event = values.event ? JSON.parse(fs.readFileSync(values.event, 'utf8')) : {};
    const issue = event.issue || { title: values.title || '', body: values.body || '' };
    console.log(JSON.stringify(prepare({ issue, id: values.id || issue.number, area: values.area, output: values.output })));
  } catch (error) {
    console.error(`Task preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { detectArea, prepare, TYPES };
