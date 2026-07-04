/**
 * n8n Code node — WGS APS vs Vertical STO comparison
 * Input: items from Google Sheets (flat rows with channel column)
 * Output: enriched rows + portfolio/sto summaries for email builder
 */

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

const PEN_TARGETS = {
  Decor: 0.345,
  Softhome: 0.245,
  Rugs: 0.093,
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

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pct(n) {
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function bps(n) {
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(0)} bps`;
}

// n8n passes sheet rows as items[].json
const rows = $input.all().map((item) => item.json);

const sumkcRows = rows.filter((r) => r.segment_type === 'sumkc');

const wgsRows = sumkcRows.filter(
  (r) => r.channel === 'WGS_APS' && DSR_SUMKCS.includes(r.entity_name)
);
const verticalRows = sumkcRows.filter((r) => r.channel === 'VERTICAL_STO');

if (wgsRows.length < DSR_SUMKCS.length) {
  throw new Error(
    `Incomplete WGS weekly data: expected ${DSR_SUMKCS.length} SuMkCs, got ${wgsRows.length}. ` +
      'Check Looker weekly export — do not use monthly GRS tracker.'
  );
}

const verticalMatches = DSR_SUMKCS.filter((sumkc) => {
  const verticalName = VERTICAL_BENCHMARK[sumkc];
  return verticalRows.some(
    (r) => r.entity_name === verticalName || r.entity_name === sumkc.replace(/^APS /, '')
  );
});

if (verticalMatches.length < DSR_SUMKCS.length) {
  throw new Error(
    `Incomplete vertical benchmark data: matched ${verticalMatches.length}/${DSR_SUMKCS.length}. ` +
      'Each APS SuMkC needs a VERTICAL_STO row (e.g. Bedding, Rugs, Seasonal Decor).'
  );
}

const comparisons = [];

for (const sumkc of DSR_SUMKCS) {
  const wgs = wgsRows.find((r) => r.entity_name === sumkc);
  const verticalName = VERTICAL_BENCHMARK[sumkc];
  const vertical = verticalRows.find(
    (r) =>
      r.entity_name === verticalName ||
      r.vertical_benchmark === verticalName ||
      r.entity_name === sumkc.replace(/^APS /, '')
  );

  const sto = STO_BY_SUMKC[sumkc];
  const wgsYoy = num(wgs?.grs_yoy_pct);
  const vertYoy = num(vertical?.grs_yoy_pct);
  const yoyGap = wgsYoy !== null && vertYoy !== null ? wgsYoy - vertYoy : null;

  const wgsPen = num(wgs?.wgs_pen_pct);
  const penTarget = PEN_TARGETS[sto];
  const penGap = wgsPen !== null ? wgsPen - penTarget : null;

  const isTopPerformer = yoyGap !== null && yoyGap > 0.05;
  const isConcern =
    (yoyGap !== null && yoyGap < -0.05) ||
    (penGap !== null && penGap < -0.02);

  comparisons.push({
    sumkc,
    sto,
    vertical_benchmark: verticalName,
    wgs_grs_week: wgs?.grs_week,
    wgs_grs_yoy_pct: wgsYoy,
    wgs_grs_wow_pct: num(wgs?.grs_wow_pct),
    vertical_grs_yoy_pct: vertYoy,
    yoy_gap_vs_vertical: yoyGap,
    yoy_gap_label: yoyGap !== null ? pct(yoyGap) + ' vs vertical' : '—',
    wgs_pen_pct: wgsPen,
    pen_target: penTarget,
    pen_gap_vs_target: penGap,
    visits_yoy_pct: num(wgs?.visits_yoy_pct),
    cvr_yoy_bps: num(wgs?.cvr_yoy_bps),
    is_top_performer: isTopPerformer,
    is_area_of_concern: isConcern,
  });
}

// STO rollups (weighted by grs_week when available)
function rollupSto(stoName) {
  const subset = comparisons.filter((c) => c.sto === stoName);
  const totalGrs = subset.reduce((s, c) => s + (num(c.wgs_grs_week) || 0), 0);

  function weightedAvg(key) {
    let wSum = 0;
    let vSum = 0;
    for (const c of subset) {
      const w = num(c.wgs_grs_week) || 0;
      const v = c[key];
      if (v !== null && w > 0) {
        vSum += v * w;
        wSum += w;
      }
    }
    return wSum > 0 ? vSum / wSum : null;
  }

  return {
    sto: stoName,
    sumkc_count: subset.length,
    wgs_grs_week_total: totalGrs,
    wgs_grs_yoy_pct: weightedAvg('wgs_grs_yoy_pct'),
    vertical_grs_yoy_pct: weightedAvg('vertical_grs_yoy_pct'),
    yoy_gap_vs_vertical: weightedAvg('yoy_gap_vs_vertical'),
    wgs_pen_pct: weightedAvg('wgs_pen_pct'),
    pen_target: PEN_TARGETS[stoName],
    top_performers: subset.filter((c) => c.is_top_performer).map((c) => c.sumkc),
    concerns: subset.filter((c) => c.is_area_of_concern).map((c) => c.sumkc),
  };
}

const stoRollups = ['Decor', 'Softhome', 'Rugs'].map(rollupSto);

const portfolio = {
  segment_type: 'portfolio',
  wgs_grs_week_total: stoRollups.reduce((s, r) => s + (r.wgs_grs_week_total || 0), 0),
  sto_rollups: stoRollups,
  top_performers: comparisons.filter((c) => c.is_top_performer).slice(0, 5),
  areas_of_concern: comparisons.filter((c) => c.is_area_of_concern).slice(0, 5),
  reporting_week: rows[0]?.reporting_week ?? null,
};

return [
  {
    json: {
      portfolio,
      comparisons,
      sto_rollups: stoRollups,
      meta: {
        source: 'weekly_staging_sheet',
        not_monthly_tracker: true,
        validated_sumkc_count: wgsRows.length,
      },
    },
  },
];
