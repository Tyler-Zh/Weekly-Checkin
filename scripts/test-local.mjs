#!/usr/bin/env node
/**
 * Local smoke test — uses lib/weekly-report.mjs
 * Usage: node scripts/test-local.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyzeWeeklyRows } from '../lib/weekly-report.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(path) {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i]; });
    return row;
  });
}

const rows = parseCsv(join(root, 'templates/SuMkC_Weekly.csv'));
const data = analyzeWeeklyRows(rows);

console.log('Loaded SuMkC rows:', rows.length);
console.log('Comparisons:', data.comparisons.length);
console.log('\n--- STO rollup ---');
for (const s of data.sto_rollups) {
  console.log(
    `${s.sto}: WGS YoY ${((s.wgs_grs_yoy_pct || 0) * 100).toFixed(1)}% | ` +
    `gap ${((s.yoy_gap_vs_vertical || 0) * 100).toFixed(1)}pp | pen ${((s.wgs_pen_pct || 0) * 100).toFixed(1)}%`
  );
}
console.log('\n--- Top performers ---');
data.portfolio.top_performers.forEach((c) => {
  console.log(`  ★ ${c.sumkc}: ${((c.yoy_gap_vs_vertical || 0) * 100).toFixed(1)}pp`);
});
console.log('\n--- Offenders ---');
data.portfolio.offenders.forEach((c) => {
  console.log(`  ⚠ ${c.sumkc}: ${c.driver_summary}`);
});
console.log('\nOK — run node scripts/preview-email.mjs for full HTML');
