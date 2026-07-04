/**
 * Generate a local HTML email preview from templates/SuMkC_Weekly.csv
 * Run: node scripts/preview-email.mjs
 * Open: preview/email-preview.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Reuse compare logic via dynamic eval of compare script body (strip n8n $input)
const csv = readFileSync(join(root, 'templates/SuMkC_Weekly.csv'), 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map((line) => {
  const vals = line.split(',');
  const row = {};
  headers.forEach((h, i) => { row[h] = vals[i]; });
  return row;
});

// Minimal inline compare (matches n8n output shape)
const DSR_SUMKCS = [
  'APS Decor - Home Accents', 'APS Decor - Wall Accents', 'APS Decor - Wall Art',
  'APS Decor - Seasonal Decor', 'APS Decor - Outdoor Decor',
  'APS Softhome - Bedding', 'APS Softhome - Window', 'APS Softhome - Bath', 'APS Rugs',
];
const STO_BY_SUMKC = {
  'APS Decor - Home Accents': 'Decor', 'APS Decor - Wall Accents': 'Decor',
  'APS Decor - Wall Art': 'Decor', 'APS Decor - Seasonal Decor': 'Decor',
  'APS Decor - Outdoor Decor': 'Decor', 'APS Softhome - Bedding': 'Softhome',
  'APS Softhome - Window': 'Softhome', 'APS Softhome - Bath': 'Softhome', 'APS Rugs': 'Rugs',
};
const PEN_TARGETS = { Decor: 0.345, Softhome: 0.245, Rugs: 0.093 };
const VERTICAL_BENCHMARK = {
  'APS Decor - Home Accents': 'Home Accents', 'APS Decor - Wall Accents': 'Wall Accents',
  'APS Decor - Wall Art': 'Wall Art', 'APS Decor - Seasonal Decor': 'Seasonal Decor',
  'APS Decor - Outdoor Decor': 'Outdoor Decor', 'APS Softhome - Bedding': 'Bedding',
  'APS Softhome - Window': 'Window', 'APS Softhome - Bath': 'Bath', 'APS Rugs': 'Rugs',
};
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

const sumkcRows = rows.filter((r) => r.segment_type === 'sumkc');
const wgsRows = sumkcRows.filter((r) => r.channel === 'WGS_APS' && DSR_SUMKCS.includes(r.entity_name));
const verticalRows = sumkcRows.filter((r) => r.channel === 'VERTICAL_STO');

const comparisons = [];
for (const sumkc of DSR_SUMKCS) {
  const wgs = wgsRows.find((r) => r.entity_name === sumkc);
  const verticalName = VERTICAL_BENCHMARK[sumkc];
  const vertical = verticalRows.find((r) => r.entity_name === verticalName);
  const sto = STO_BY_SUMKC[sumkc];
  const wgsYoy = num(wgs && wgs.grs_yoy_pct);
  const vertYoy = num(vertical && vertical.grs_yoy_pct);
  const yoyGap = wgsYoy !== null && vertYoy !== null ? wgsYoy - vertYoy : null;
  const wgsPen = num(wgs && wgs.wgs_pen_pct);
  const penTarget = PEN_TARGETS[sto];
  const penGap = wgsPen !== null ? wgsPen - penTarget : null;
  comparisons.push({
    sumkc, sto, vertical_benchmark: verticalName,
    wgs_grs_week: wgs && wgs.grs_week, wgs_grs_yoy_pct: wgsYoy, vertical_grs_yoy_pct: vertYoy,
    yoy_gap_vs_vertical: yoyGap, wgs_pen_pct: wgsPen, pen_target: penTarget,
    pen_gap_vs_target: penGap,
    is_top_performer: yoyGap !== null && yoyGap > 0.05,
    is_area_of_concern: (yoyGap !== null && yoyGap < -0.05) || (penGap !== null && penGap < -0.02),
  });
}

function rollupSto(stoName) {
  const subset = comparisons.filter((c) => c.sto === stoName);
  const avg = (key) => {
    const vals = subset.map((c) => c[key]).filter((v) => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  return {
    sto: stoName, wgs_grs_week_total: subset.reduce((s, c) => s + (num(c.wgs_grs_week) || 0), 0),
    wgs_grs_yoy_pct: avg('wgs_grs_yoy_pct'), vertical_grs_yoy_pct: avg('vertical_grs_yoy_pct'),
    yoy_gap_vs_vertical: avg('yoy_gap_vs_vertical'), wgs_pen_pct: avg('wgs_pen_pct'),
    pen_target: PEN_TARGETS[stoName],
  };
}
const stoRollups = ['Decor', 'Softhome', 'Rugs'].map(rollupSto);
const portfolio = {
  reporting_week: rows[0] && rows[0].reporting_week,
  top_performers: comparisons.filter((c) => c.is_top_performer).slice(0, 5),
  areas_of_concern: comparisons.filter((c) => c.is_area_of_concern).slice(0, 5),
};

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
}
function fmtMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtPp(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}pp`;
}

const week = portfolio.reporting_week || 'Latest week';
let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WGS APS DSR Weekly Preview</title></head><body>`;
html += `<div style="font-family:Arial,sans-serif;max-width:720px;margin:24px auto;color:#222;">`;
html += `<h2 style="border-bottom:2px solid #7B2D8E;">WGS APS DSR Weekly Performance (PREVIEW)</h2>`;
html += `<p>Week ending: <strong>${week}</strong> · WGS/APS vs Vertical STO</p>`;
html += `<h3>Portfolio headline</h3><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">`;
html += `<tr style="background:#f3f3f3;"><th>STO</th><th>WGS GRS</th><th>WGS YoY</th><th>Vertical YoY</th><th>Gap</th><th>WGS Pen</th><th>Target</th></tr>`;
for (const s of stoRollups) {
  const gapColor = (s.yoy_gap_vs_vertical || 0) >= 0 ? '#0a7' : '#c33';
  html += `<tr><td><b>${s.sto}</b></td><td>${fmtMoney(s.wgs_grs_week_total)}</td><td>${fmtPct(s.wgs_grs_yoy_pct)}</td><td>${fmtPct(s.vertical_grs_yoy_pct)}</td><td style="color:${gapColor}"><b>${fmtPp(s.yoy_gap_vs_vertical)}</b></td><td>${fmtPct(s.wgs_pen_pct)}</td><td>${fmtPct(s.pen_target)}</td></tr>`;
}
html += `</table><h3>SuMkC detail</h3><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:12px;">`;
html += `<tr style="background:#f3f3f3;"><th>STO</th><th>SuMkC</th><th>Vertical</th><th>Gap</th></tr>`;
for (const c of comparisons) {
  const gapColor = (c.yoy_gap_vs_vertical || 0) >= 0 ? '#0a7' : '#c33';
  const flag = c.is_top_performer ? ' ★' : c.is_area_of_concern ? ' ⚠' : '';
  html += `<tr><td>${c.sto}</td><td>${c.sumkc}${flag}</td><td>${c.vertical_benchmark}</td><td style="color:${gapColor}">${fmtPp(c.yoy_gap_vs_vertical)}</td></tr>`;
}
html += `</table></div></body></html>`;

mkdirSync(join(root, 'preview'), { recursive: true });
writeFileSync(join(root, 'preview/email-preview.html'), html, 'utf8');
console.log('Wrote preview/email-preview.html — open in browser to see sample email');
