/**
 * Generate comprehensive HTML preview from all template CSVs
 * Run: node scripts/preview-email.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { analyzeWeeklyRows, buildHtmlEmail } from '../lib/weekly-report.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseCsv(path) {
  const text = readFileSync(path, 'utf8').trim();
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const vals = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = vals[i];
    });
    return row;
  });
}

const rows = [
  ...parseCsv(join(root, 'templates/SuMkC_Weekly.csv')),
  ...parseCsv(join(root, 'templates/Supplier_Weekly.csv')),
  ...parseCsv(join(root, 'templates/Watchlist_Weekly.csv')),
];

const data = analyzeWeeklyRows(rows);
const { subject, html } = buildHtmlEmail(data);

mkdirSync(join(root, 'preview'), { recursive: true });
writeFileSync(join(root, 'preview/email-preview.html'), html, 'utf8');
console.log('Wrote preview/email-preview.html');
console.log('Subject:', subject);
console.log('Offenders:', data.portfolio.offenders.map((o) => o.sumkc).join(', ') || 'none');
