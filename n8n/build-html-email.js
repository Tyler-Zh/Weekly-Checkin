/**
 * n8n Code node — Build HTML email from compare-wgs-vertical output
 * Input: single item from previous Code node
 * Output: { subject, html } for Gmail node
 */

const PEN_TARGETS = { Decor: 0.345, Softhome: 0.245, Rugs: 0.093 };

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPp(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}pp`;
}

const data = $input.first().json;
const { portfolio, comparisons, sto_rollups: stoRollups } = data;
const week = portfolio.reporting_week ?? 'Latest week';

let html = `
<div style="font-family: Arial, sans-serif; max-width: 720px; color: #222;">
  <h2 style="border-bottom: 2px solid #7B2D8E; padding-bottom: 8px;">
    WGS APS DSR Weekly Performance
  </h2>
  <p style="color: #555;">Reporting week ending: <strong>${week}</strong><br>
  Lens: <strong>WGS/APS vs Vertical STO (F&amp;D)</strong></p>
`;

// Portfolio headline
html += `<h3>Portfolio headline</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px;">
<tr style="background: #f3f3f3;"><th>STO</th><th>WGS GRS (week)</th><th>WGS YoY</th><th>Vertical YoY</th><th>Gap vs vertical</th><th>WGS Pen</th><th>Pen target</th></tr>`;

for (const s of stoRollups) {
  const penGap = s.wgs_pen_pct != null ? s.wgs_pen_pct - s.pen_target : null;
  const gapColor = (s.yoy_gap_vs_vertical ?? 0) >= 0 ? '#0a7' : '#c33';
  html += `<tr>
    <td><strong>${s.sto}</strong></td>
    <td>${fmtMoney(s.wgs_grs_week_total)}</td>
    <td>${fmtPct(s.wgs_grs_yoy_pct)}</td>
    <td>${fmtPct(s.vertical_grs_yoy_pct)}</td>
    <td style="color:${gapColor}"><strong>${fmtPp(s.yoy_gap_vs_vertical)}</strong></td>
    <td>${fmtPct(s.wgs_pen_pct)}</td>
    <td>${fmtPct(s.pen_target)} ${penGap !== null && penGap < -0.02 ? '⚠' : ''}</td>
  </tr>`;
}
html += `</table>`;

// SuMkC detail
html += `<h3>SuMkC performance (WGS vs vertical)</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 12px;">
<tr style="background: #f3f3f3;"><th>STO</th><th>APS SuMkC</th><th>Vertical</th><th>WGS GRS</th><th>WGS YoY</th><th>Vert YoY</th><th>Gap</th></tr>`;

for (const c of comparisons) {
  const gapColor = (c.yoy_gap_vs_vertical ?? 0) >= 0 ? '#0a7' : '#c33';
  const flag = c.is_top_performer ? ' ★' : c.is_area_of_concern ? ' ⚠' : '';
  html += `<tr>
    <td>${c.sto}</td>
    <td>${c.sumkc}${flag}</td>
    <td>${c.vertical_benchmark}</td>
    <td>${fmtMoney(c.wgs_grs_week)}</td>
    <td>${fmtPct(c.wgs_grs_yoy_pct)}</td>
    <td>${fmtPct(c.vertical_grs_yoy_pct)}</td>
    <td style="color:${gapColor}">${fmtPp(c.yoy_gap_vs_vertical)}</td>
  </tr>`;
}
html += `</table>`;

// Top / concern bullets
html += `<h3>Top performers (WGS beating vertical by &gt;5pp YoY)</h3><ul>`;
if (portfolio.top_performers.length === 0) {
  html += `<li><em>None this week</em></li>`;
} else {
  for (const c of portfolio.top_performers) {
    html += `<li><strong>${c.sumkc}</strong>: WGS ${fmtPct(c.wgs_grs_yoy_pct)} vs vertical ${fmtPct(c.vertical_grs_yoy_pct)} (${fmtPp(c.yoy_gap_vs_vertical)})</li>`;
  }
}
html += `</ul>`;

html += `<h3>Areas of concern</h3><ul>`;
if (portfolio.areas_of_concern.length === 0) {
  html += `<li><em>None flagged</em></li>`;
} else {
  for (const c of portfolio.areas_of_concern) {
    const penNote =
      c.pen_gap_vs_target != null && c.pen_gap_vs_target < -0.02
        ? `; pen ${fmtPp(c.pen_gap_vs_target)} below OKR`
        : '';
    html += `<li><strong>${c.sumkc}</strong>: ${fmtPp(c.yoy_gap_vs_vertical)} vs vertical${penNote}</li>`;
  }
}
html += `</ul>`;

html += `<p style="font-size: 11px; color: #888; margin-top: 24px;">
  This email was sent automatically with n8n · WGS APS Decor · Softhome · Rugs<br>
  Data source: weekly staging sheet (not monthly F&amp;D GRS tracker)
</p></div>`;

const subject = `WGS APS DSR Weekly | ${week} | Decor/Softhome/Rugs`;

return [{ json: { subject, html, portfolio, comparisons } }];
