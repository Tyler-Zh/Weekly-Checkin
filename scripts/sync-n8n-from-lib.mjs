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

// --- looker-shape-rows.js ---
let lookerLib = readFileSync(join(root, 'lib/looker-shape.mjs'), 'utf8');
lookerLib = lookerLib
  .replace(/^\/\*\*[\s\S]*?\*\/\n/, '/**\n * AUTO-GENERATED from lib/looker-shape.mjs\n */\n\n')
  .replace(/^export /gm, '');

const queriesPath = join(root, 'config/looker-queries.json');
const queriesExample = join(root, 'config/looker-queries.example.json');
let queriesRaw;
try {
  queriesRaw = readFileSync(queriesPath, 'utf8');
} catch {
  queriesRaw = readFileSync(queriesExample, 'utf8');
}

const lookerNode = `${lookerLib}

const LOOKER_QUERIES = ${queriesRaw};

const QUERY_KEYS = ['sumkc', 'supplier', 'watchlist'];

// --- n8n entry: Shape Looker Rows ---
// Input: 3 items from Merge (append) — SuMkC, Supplier, Watchlist query results
const batches = $input.all().map((item, i) => {
  const body = item.json;
  const rows = Array.isArray(body) ? body : body && body.data ? body.data : body ? [body] : [];
  return { queryKey: QUERY_KEYS[i] || 'sumkc', rows };
});

const shaped = shapeLookerBatches(batches, LOOKER_QUERIES);
return shaped.map((row) => ({ json: row }));
`;

writeFileSync(join(root, 'n8n/looker-shape-rows.js'), lookerNode, 'utf8');

// --- bigquery-shape-rows.js ---
let bqLib = readFileSync(join(root, 'lib/bigquery-shape.mjs'), 'utf8');
bqLib = bqLib
  .replace(/^\/\*\*[\s\S]*?\*\/\n/, '/**\n * AUTO-GENERATED from lib/bigquery-shape.mjs\n */\n\n')
  .replace(/^import \{ STO_BY_SUMKC \} from '\.\/weekly-report\.mjs';\n\n/, '');

// Inline STO_BY_SUMKC for n8n (no ES modules)
const stoBlock = `const STO_BY_SUMKC = ${JSON.stringify(
  {
    'APS Decor - Home Accents': 'Decor',
    'APS Decor - Wall Accents': 'Decor',
    'APS Decor - Wall Art': 'Decor',
    'APS Decor - Seasonal Decor': 'Decor',
    'APS Decor - Outdoor Decor': 'Decor',
    'APS Softhome - Bedding': 'Softhome',
    'APS Softhome - Window': 'Softhome',
    'APS Softhome - Bath': 'Softhome',
    'APS Rugs': 'Rugs',
  },
  null,
  2
)};\n\n`;

bqLib = bqLib.replace(/^export /gm, '');
const bqNode = `${stoBlock}${bqLib}

// --- n8n entry: Shape BigQuery Rows ---
const rows = $input.all().map((item) => item.json);
const shaped = shapeBigQueryRows(rows);
return shaped.map((row) => ({ json: row }));
`;

writeFileSync(join(root, 'n8n/bigquery-shape-rows.js'), bqNode, 'utf8');

console.log(
  'Synced n8n/analyze-weekly.js, build-html-email.js, compare-wgs-vertical.js, looker-shape-rows.js, bigquery-shape-rows.js'
);
