#!/usr/bin/env node
/**
 * Local smoke test for WGS vs vertical comparison logic (no n8n required).
 * Usage: node scripts/test-local.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '../templates/SuMkC_Weekly.csv');

const DSR_SUMKCS = [
  'APS Decor - Home Accents',
  'APS Decor - Wall Accents',
  'APS Decor - Wall Art',
  'APS Decor - Seasonal Decor',
  'APS Decor - Outdoor Decor',
  'APS Softhome - Bedding',
  'APS Softhome - Window',
  'APS Softhome - Bath',
  'APS Rugs',
];

const STO_BY_SUMKC = {
  'APS Decor - Home Accents': 'Decor',
  'APS Decor - Wall Accents': 'Decor',
  'APS Decor - Wall Art': 'Decor',
  'APS Decor - Seasonal Decor': 'Decor',
  'APS Decor - Outdoor Decor': 'Decor',
  'APS Softhome - Bedding': 'Softhome',
  'APS Softhome - Window': 'Softhome',
  'APS Softhome - Bath': 'Softhome',
  'APS Rugs': 'Rugs',
};

const VERTICAL_BENCHMARK = {
  'APS Decor - Home Accents': 'Home Accents',
  'APS Decor - Wall Accents': 'Wall Accents',
  'APS Decor - Wall Art': 'Wall Art',
  'APS Decor - Seasonal Decor': 'Seasonal Decor',
  'APS Decor - Outdoor Decor': 'Outdoor Decor',
  'APS Softhome - Bedding': 'Bedding',
  'APS Softhome - Window': 'Window',
  'APS Softhome - Bath': 'Bath',
  'APS Rugs': 'Rugs',
};

const PEN_TARGETS = { Decor: 0.345, Softhome: 0.245, Rugs: 0.093 };

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      const v = values[i];
      row[h] = v === '' ? null : isNaN(Number(v)) ? v : Number(v);
    });
    return row;
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const sumkcRows = rows.filter((r) => r.segment_type === 'sumkc');
const wgsRows = sumkcRows.filter((r) => r.channel === 'WGS_APS');
const verticalRows = sumkcRows.filter((r) => r.channel === 'VERTICAL_STO');

console.log('Loaded rows:', rows.length);
console.log('WGS SuMkC rows:', wgsRows.length, '/ expected', DSR_SUMKCS.length);
console.log('Vertical rows:', verticalRows.length);

if (wgsRows.length < DSR_SUMKCS.length) {
  console.error('FAIL: incomplete WGS data');
  process.exit(1);
}

const comparisons = [];
for (const sumkc of DSR_SUMKCS) {
  const wgs = wgsRows.find((r) => r.entity_name === sumkc);
  const verticalName = VERTICAL_BENCHMARK[sumkc];
  const vertical = verticalRows.find((r) => r.entity_name === verticalName);
  const wgsYoy = num(wgs && wgs.grs_yoy_pct);
  const vertYoy = num(vertical && vertical.grs_yoy_pct);
  const yoyGap = wgsYoy !== null && vertYoy !== null ? wgsYoy - vertYoy : null;
  comparisons.push({
    sumkc,
    sto: STO_BY_SUMKC[sumkc],
    wgsYoy,
    vertYoy,
    yoyGap,
    top: yoyGap !== null && yoyGap > 0.05,
    concern: yoyGap !== null && yoyGap < -0.05,
  });
}

console.log('\n--- STO rollup (sample) ---');
for (const sto of ['Decor', 'Softhome', 'Rugs']) {
  const subset = comparisons.filter((c) => c.sto === sto);
  const avgGap =
    subset.reduce((s, c) => s + (c.yoyGap != null ? c.yoyGap : 0), 0) / subset.filter((c) => c.yoyGap != null).length;
  console.log(`${sto}: avg YoY gap vs vertical ${(avgGap * 100).toFixed(1)}pp | pen target ${(PEN_TARGETS[sto] * 100).toFixed(1)}%`);
}

console.log('\n--- Top performers ---');
comparisons.filter((c) => c.top).forEach((c) => {
  console.log(`  ★ ${c.sumkc}: +${((c.yoyGap != null ? c.yoyGap : 0) * 100).toFixed(1)}pp`);
});

console.log('\n--- Concerns ---');
comparisons.filter((c) => c.concern).forEach((c) => {
  console.log(`  ⚠ ${c.sumkc}: ${((c.yoyGap != null ? c.yoyGap : 0) * 100).toFixed(1)}pp`);
});

console.log('\nOK — logic ready for n8n Code node');
