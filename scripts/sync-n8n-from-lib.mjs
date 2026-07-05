/**
 * Sync lib/weekly-report.mjs → n8n Code node files
 * Run: node scripts/sync-n8n-from-lib.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let lib = readFileSync(join(root, 'lib/weekly-report.mjs'), 'utf8');

lib = lib
  .replace(/^\/\*\*[\s\S]*?\*\/\n/, '/**\n * AUTO-GENERATED from lib/weekly-report.mjs — run: node scripts/sync-n8n-from-lib.mjs\n */\n\n')
  .replace(/^export /gm, '');

const analyzeNode = `${lib}

// --- n8n entry: Analyze Weekly ---
const rows = $input.all().map((item) => item.json);
const result = analyzeWeeklyRows(rows);
return [{ json: result }];
`;

const emailNode = `${lib}

// --- n8n entry: Build HTML Email ---
const data = $input.first().json;
const { subject, html } = buildHtmlEmail(data);
return [{ json: Object.assign({ subject, html }, data) }];
`;

writeFileSync(join(root, 'n8n/analyze-weekly.js'), analyzeNode, 'utf8');
writeFileSync(join(root, 'n8n/build-html-email.js'), emailNode, 'utf8');

// Backward-compatible alias
writeFileSync(
  join(root, 'n8n/compare-wgs-vertical.js'),
  `/**\n * Deprecated — use analyze-weekly.js. Kept for backward compatibility.\n */\n${analyzeNode}`,
  'utf8'
);

console.log('Synced n8n/analyze-weekly.js, build-html-email.js, compare-wgs-vertical.js');
