/**
 * AUTO-GENERATED from lib/weekly-report.mjs — run: node scripts/sync-n8n-from-lib.mjs
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

const PEN_TARGETS = { Decor: 0.345, Softhome: 0.245, Rugs: 0.093 };

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

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}%`;
}

function fmtMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPp(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(1)}pp`;
}

function fmtBps(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Math.round(n)} bps`;
}

/** Flag driver metrics that explain underperformance vs vertical / benchmark */
function diagnoseDrivers(row, opts = {}) {
  const drivers = [];
  const brandedComp = num(row.branded_comp_bps);
  const availability = num(row.availability_bps);
  const promoDepth = num(row.promo_depth_bps);
  const promoWsiGap = num(row.promo_wsi_gap_bps);
  const adsPct = num(row.ads_pct_wsc);
  const visitsYoy = num(row.visits_yoy_pct);
  const cvrBps = num(row.cvr_yoy_bps);
  const cgPen = num(row.cg_pen_pct);
  const pbsiPct = num(row.pbsi_pct_grs);

  if (brandedComp !== null && brandedComp < -50) {
    drivers.push({
      area: 'Pricing / competitiveness',
      signal: fmtBps(brandedComp),
      detail: 'Branded competitiveness below vertical benchmark — price index drag on conversion',
      severity: brandedComp < -150 ? 'high' : 'medium',
    });
  }
  if (availability !== null && availability < -80) {
    drivers.push({
      area: 'Availability',
      signal: fmtBps(availability),
      detail: 'Availability gap vs category — likely stock-out or lead-time pressure',
      severity: availability < -150 ? 'high' : 'medium',
    });
  }
  if ((promoDepth !== null && promoDepth < -80) || (promoWsiGap !== null && promoWsiGap < -100)) {
    drivers.push({
      area: 'Promotion depth',
      signal: promoWsiGap !== null ? fmtBps(promoWsiGap) : fmtBps(promoDepth),
      detail: 'Shallow promo / WSI gap vs target — less competitive offer depth',
      severity: 'medium',
    });
  }
  if (adsPct !== null && adsPct < (opts.ads_benchmark || 0.08)) {
    drivers.push({
      area: 'Ads investment',
      signal: fmtPct(adsPct) + ' of WSC',
      detail: 'Ads % WSC below portfolio norm — visibility may be limiting traffic',
      severity: 'medium',
    });
  }
  if (visitsYoy !== null && visitsYoy < 0 && (num(row.grs_yoy_pct) || 0) < (opts.vertical_yoy || 0)) {
    drivers.push({
      area: 'Traffic',
      signal: fmtPct(visitsYoy) + ' visits YoY',
      detail: 'Traffic decline vs vertical growth — assortment or discoverability issue',
      severity: 'high',
    });
  }
  if (cvrBps !== null && cvrBps < -20) {
    drivers.push({
      area: 'Conversion',
      signal: fmtBps(cvrBps),
      detail: 'CVR erosion YoY — check pricing, availability, and PDP competitiveness',
      severity: cvrBps < -40 ? 'high' : 'medium',
    });
  }
  if (pbsiPct !== null && pbsiPct > 0.15) {
    drivers.push({
      area: 'PBSI / policy',
      signal: fmtPct(pbsiPct) + ' of GRS',
      detail: 'Elevated PBSI exposure — policy violations may suppress distribution',
      severity: 'high',
    });
  }
  if (cgPen !== null && cgPen > 0.5 && cvrBps !== null && cvrBps < 0) {
    drivers.push({
      area: 'Penetration quality',
      signal: fmtPct(cgPen) + ' CG pen',
      detail: 'High CG penetration but falling CVR — growth may be promo-driven, not sustainable',
      severity: 'medium',
    });
  }

  return drivers.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1));
}

/** Narrative for WoW / YoY change */
function explainChange(entity, label) {
  const grsWow = num(entity.grs_wow_pct);
  const grsYoy = num(entity.grs_yoy_pct);
  const visits = num(entity.visits_yoy_pct);
  const cvr = num(entity.cvr_yoy_bps);
  const parts = [];

  if (grsWow !== null) parts.push(`GRS WoW ${fmtPct(grsWow)}`);
  if (grsYoy !== null) parts.push(`YoY ${fmtPct(grsYoy)}`);

  const drivers = diagnoseDrivers(entity);
  if (drivers.length > 0) {
    const top = drivers.slice(0, 2).map((d) => d.area.toLowerCase()).join(', ');
    parts.push(`likely drivers: ${top}`);
  } else if (visits !== null && visits > 0.1) {
    parts.push(`traffic-led (+${fmtPct(visits)} visits YoY)`);
  } else if (cvr !== null && cvr > 10) {
    parts.push(`conversion-led (${fmtBps(cvr)} CVR YoY)`);
  }

  return `${label}: ${parts.join(' · ')}`;
}

function weightedAvg(subset, key, weightKey = 'wgs_grs_week') {
  let wSum = 0;
  let vSum = 0;
  for (const c of subset) {
    const w = num(c[weightKey]) || num(c.grs_week) || 0;
    const v = c[key];
    if (v !== null && v !== undefined && w > 0) {
      vSum += v * w;
      wSum += w;
    }
  }
  return wSum > 0 ? vSum / wSum : null;
}

function buildSumkcComparisons(sumkcRows) {
  const wgsRows = sumkcRows.filter(
    (r) => r.channel === 'WGS_APS' && DSR_SUMKCS.includes(r.entity_name)
  );
  const verticalRows = sumkcRows.filter((r) => r.channel === 'VERTICAL_STO');

  if (wgsRows.length < DSR_SUMKCS.length) {
    throw new Error(
      `Incomplete WGS weekly data: expected ${DSR_SUMKCS.length} SuMkCs, got ${wgsRows.length}.`
    );
  }

  const comparisons = [];

  for (const sumkc of DSR_SUMKCS) {
    const wgs = wgsRows.find((r) => r.entity_name === sumkc);
    const verticalName = VERTICAL_BENCHMARK[sumkc];
    const vertical = verticalRows.find(
      (r) =>
        r.entity_name === verticalName ||
        r.entity_name === sumkc.replace(/^APS (Decor|Softhome) - /, '').replace(/^APS /, '')
    );

    const sto = STO_BY_SUMKC[sumkc];
    const wgsYoy = num(wgs && wgs.grs_yoy_pct);
    const wgsWow = num(wgs && wgs.grs_wow_pct);
    const vertYoy = num(vertical && vertical.grs_yoy_pct);
    const vertWow = num(vertical && vertical.grs_wow_pct);
    const yoyGap = wgsYoy !== null && vertYoy !== null ? wgsYoy - vertYoy : null;
    const wowGap = wgsWow !== null && vertWow !== null ? wgsWow - vertWow : null;

    const wgsPen = num(wgs && wgs.wgs_pen_pct);
    const penYoyBps = num(wgs && wgs.wgs_pen_yoy_bps);
    const penTarget = PEN_TARGETS[sto];
    const penGap = wgsPen !== null ? wgsPen - penTarget : null;

    const driverRow = Object.assign({}, wgs, {
      grs_yoy_pct: wgsYoy,
      vertical_yoy: vertYoy,
    });
    const drivers = diagnoseDrivers(driverRow, { vertical_yoy: vertYoy });

    const isTopPerformer = yoyGap !== null && yoyGap > 0.05;
    const isOffender =
      (yoyGap !== null && yoyGap < -0.05) ||
      (wgsYoy !== null && wgsYoy < 0) ||
      drivers.some((d) => d.severity === 'high');

    comparisons.push({
      sumkc,
      sto,
      vertical_benchmark: verticalName,
      wgs_grs_week: wgs && wgs.grs_week,
      wgs_grs_wow_pct: wgsWow,
      wgs_grs_yoy_pct: wgsYoy,
      wgs_wsc_week: wgs && wgs.wsc_week,
      wgs_wsc_wow_pct: num(wgs && wgs.wsc_wow_pct),
      wgs_wsc_yoy_pct: num(wgs && wgs.wsc_yoy_pct),
      vertical_grs_wow_pct: vertWow,
      vertical_grs_yoy_pct: vertYoy,
      wow_gap_vs_vertical: wowGap,
      yoy_gap_vs_vertical: yoyGap,
      wgs_pen_pct: wgsPen,
      wgs_pen_yoy_bps: penYoyBps,
      pen_target: penTarget,
      pen_gap_vs_target: penGap,
      visits_yoy_pct: num(wgs && wgs.visits_yoy_pct),
      visits_wow_pct: num(wgs && wgs.visits_wow_pct),
      cvr_yoy_bps: num(wgs && wgs.cvr_yoy_bps),
      availability_bps: num(wgs && wgs.availability_bps),
      branded_comp_bps: num(wgs && wgs.branded_comp_bps),
      promo_depth_bps: num(wgs && wgs.promo_depth_bps),
      ads_pct_wsc: num(wgs && wgs.ads_pct_wsc),
      cg_pen_pct: num(wgs && wgs.cg_pen_pct),
      drivers,
      driver_summary: drivers.map((d) => d.area).join('; ') || '—',
      is_top_performer: isTopPerformer,
      is_offender: isOffender,
      change_narrative: explainChange(wgs || {}, sumkc),
    });
  }

  return comparisons;
}

function buildStoRollups(comparisons) {
  return ['Decor', 'Softhome', 'Rugs'].map((stoName) => {
    const subset = comparisons.filter((c) => c.sto === stoName);
    const totalGrs = subset.reduce((s, c) => s + (num(c.wgs_grs_week) || 0), 0);

    return {
      sto: stoName,
      wgs_grs_week_total: totalGrs,
      wgs_grs_wow_pct: weightedAvg(subset, 'wgs_grs_wow_pct'),
      wgs_grs_yoy_pct: weightedAvg(subset, 'wgs_grs_yoy_pct'),
      vertical_grs_wow_pct: weightedAvg(subset, 'vertical_grs_wow_pct'),
      vertical_grs_yoy_pct: weightedAvg(subset, 'vertical_grs_yoy_pct'),
      wow_gap_vs_vertical: weightedAvg(subset, 'wow_gap_vs_vertical'),
      yoy_gap_vs_vertical: weightedAvg(subset, 'yoy_gap_vs_vertical'),
      wgs_pen_pct: weightedAvg(subset, 'wgs_pen_pct'),
      wgs_pen_yoy_bps: weightedAvg(subset, 'wgs_pen_yoy_bps'),
      pen_target: PEN_TARGETS[stoName],
      pen_gap_vs_target:
        weightedAvg(subset, 'wgs_pen_pct') !== null
          ? weightedAvg(subset, 'wgs_pen_pct') - PEN_TARGETS[stoName]
          : null,
      is_pen_below_target:
        weightedAvg(subset, 'wgs_pen_pct') !== null &&
        weightedAvg(subset, 'wgs_pen_pct') - PEN_TARGETS[stoName] < -0.02,
      top_performers: subset.filter((c) => c.is_top_performer).map((c) => c.sumkc),
      offenders: subset.filter((c) => c.is_offender).map((c) => c.sumkc),
    };
  });
}

function buildSupplierAnalysis(supplierRows) {
  const suppliers = supplierRows
    .filter((r) => r.segment_type === 'supplier' && r.channel === 'WGS_APS')
    .map((r) => {
      const grsYoy = num(r.grs_yoy_pct);
      const grsWow = num(r.grs_wow_pct);
      const vertYoy = num(r.vertical_grs_yoy_pct);
      const yoyGap = grsYoy !== null && vertYoy !== null ? grsYoy - vertYoy : null;
      const drivers = diagnoseDrivers(r, { vertical_yoy: vertYoy });

      return {
        name: r.entity_name,
        sto: r.sto,
        tier: r.tier,
        srm: r.srm,
        supplier_id: r.supplier_id,
        grs_week: r.grs_week,
        grs_wow_pct: grsWow,
        grs_yoy_pct: grsYoy,
        wsc_week: r.wsc_week,
        wsc_wow_pct: num(r.wsc_wow_pct),
        wsc_yoy_pct: num(r.wsc_yoy_pct),
        vertical_grs_yoy_pct: vertYoy,
        yoy_gap_vs_vertical: yoyGap,
        visits_yoy_pct: num(r.visits_yoy_pct),
        cvr_yoy_bps: num(r.cvr_yoy_bps),
        cg_pen_pct: num(r.cg_pen_pct),
        availability_bps: num(r.availability_bps),
        branded_comp_bps: num(r.branded_comp_bps),
        promo_depth_bps: num(r.promo_depth_bps),
        ads_pct_wsc: num(r.ads_pct_wsc),
        pbsi_pct_grs: num(r.pbsi_pct_grs),
        drivers,
        change_narrative: explainChange(r, r.entity_name),
        is_top: yoyGap !== null && yoyGap > 0.1,
        is_offender: (yoyGap !== null && yoyGap < -0.05) || (grsYoy !== null && grsYoy < 0),
      };
    });

  const topSuppliers = suppliers
    .filter((s) => s.is_top)
    .sort((a, b) => (b.yoy_gap_vs_vertical || 0) - (a.yoy_gap_vs_vertical || 0))
    .slice(0, 5);

  const offenderSuppliers = suppliers
    .filter((s) => s.is_offender)
    .sort((a, b) => (a.yoy_gap_vs_vertical || 0) - (b.yoy_gap_vs_vertical || 0))
    .slice(0, 5);

  return { suppliers, top_suppliers: topSuppliers, offender_suppliers: offenderSuppliers };
}

function buildWatchlist(watchlistRows) {
  return watchlistRows.map((r) => ({
    sto: r.sto,
    watch_type: r.watch_type,
    entity_name: r.entity_name,
    supplier_id: r.supplier_id,
    srm: r.srm,
    detail: r.detail,
    l30d_grs_at_risk: num(r.l30d_grs_at_risk),
    category:
      r.watch_type === 'pbsi_violation'
        ? 'PBSI / policy'
        : r.watch_type === 'promo_wsi_gap'
          ? 'Promotion depth'
          : r.watch_type === 'pen_below_target'
            ? 'Penetration'
            : 'Other',
  }));
}

function analyzeWeeklyRows(rows) {
  const sumkcRows = rows.filter((r) => r.segment_type === 'sumkc');
  const supplierRows = rows.filter((r) => r.segment_type === 'supplier');
  const watchlistRows = rows.filter((r) => r.watch_type || r.segment_type === 'watchlist');

  const comparisons = buildSumkcComparisons(sumkcRows);
  const sto_rollups = buildStoRollups(comparisons);
  const supplier_analysis = buildSupplierAnalysis(supplierRows);
  const watchlist = buildWatchlist(watchlistRows);

  const portfolio = {
    reporting_week: rows[0] && rows[0].reporting_week,
    wgs_grs_week_total: sto_rollups.reduce((s, r) => s + (r.wgs_grs_week_total || 0), 0),
    wgs_grs_wow_pct: weightedAvg(
      comparisons.map((c) => Object.assign({}, c, { grs_week: c.wgs_grs_week })),
      'wgs_grs_wow_pct'
    ),
    wgs_grs_yoy_pct: weightedAvg(
      comparisons.map((c) => Object.assign({}, c, { grs_week: c.wgs_grs_week })),
      'wgs_grs_yoy_pct'
    ),
    yoy_gap_vs_vertical: weightedAvg(comparisons, 'yoy_gap_vs_vertical'),
    top_performers: comparisons.filter((c) => c.is_top_performer).slice(0, 5),
    offenders: comparisons.filter((c) => c.is_offender).slice(0, 5),
    sto_rollups,
  };

  return {
    portfolio,
    comparisons,
    sto_rollups,
    supplier_analysis,
    watchlist,
    meta: { validated_sumkc_count: comparisons.length },
  };
}

function gapColor(n) {
  return (n || 0) >= 0 ? '#0a7' : '#c33';
}

function sectionTitle(text) {
  return `<h3 style="margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px;color:#7B2D8E;">${text}</h3>`;
}

function tableStart(headers) {
  let h = `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:12px;">`;
  h += `<tr style="background:#f3f3f3;">${headers.map((x) => `<th>${x}</th>`).join('')}</tr>`;
  return h;
}

function buildHtmlEmail(data) {
  const { portfolio, comparisons, sto_rollups: stoRollups, supplier_analysis, watchlist } = data;
  const week = (portfolio && portfolio.reporting_week) || 'Latest week';

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>WGS APS DSR Weekly</title></head><body>`;
  html += `<div style="font-family:Arial,sans-serif;max-width:900px;margin:24px auto;color:#222;line-height:1.45;">`;
  html += `<h2 style="border-bottom:3px solid #7B2D8E;padding-bottom:8px;">WGS APS DSR Weekly Performance</h2>`;
  html += `<p style="color:#555;">Week starting <strong>${week}</strong> (wo) · Lens: <strong>WGS/APS vs Vertical STO (F&amp;D)</strong></p>`;

  // Executive summary
  html += sectionTitle('1. Executive summary — Portfolio');
  html += `<p>Portfolio GRS <strong>${fmtMoney(portfolio.wgs_grs_week_total)}</strong> · `;
  html += `WGS WoW <strong>${fmtPct(portfolio.wgs_grs_wow_pct)}</strong> · `;
  html += `WGS YoY <strong>${fmtPct(portfolio.wgs_grs_yoy_pct)}</strong> · `;
  html += `Avg gap vs vertical <strong style="color:${gapColor(portfolio.yoy_gap_vs_vertical)}">${fmtPp(portfolio.yoy_gap_vs_vertical)}</strong></p>`;

  // STO growth + penetration
  html += sectionTitle('2. STO rollup — WGS vs Vertical growth &amp; penetration');
  html += tableStart([
    'STO',
    'WGS GRS',
    'WGS WoW',
    'WGS YoY',
    'Vert WoW',
    'Vert YoY',
    'YoY gap',
    'WGS Pen',
    'Pen YoY',
    'Pen target',
    'Pen gap',
  ]);
  for (const s of stoRollups) {
    html += `<tr>
      <td><strong>${s.sto}</strong></td>
      <td>${fmtMoney(s.wgs_grs_week_total)}</td>
      <td>${fmtPct(s.wgs_grs_wow_pct)}</td>
      <td>${fmtPct(s.wgs_grs_yoy_pct)}</td>
      <td>${fmtPct(s.vertical_grs_wow_pct)}</td>
      <td>${fmtPct(s.vertical_grs_yoy_pct)}</td>
      <td style="color:${gapColor(s.yoy_gap_vs_vertical)}"><strong>${fmtPp(s.yoy_gap_vs_vertical)}</strong></td>
      <td>${fmtPct(s.wgs_pen_pct)}</td>
      <td>${fmtBps(s.wgs_pen_yoy_bps)}</td>
      <td>${fmtPct(s.pen_target)}</td>
      <td style="color:${gapColor(s.pen_gap_vs_target)}">${fmtPp(s.pen_gap_vs_target)}</td>
    </tr>`;
  }
  html += `</table>`;

  // SuMkC comprehensive
  html += sectionTitle('3. SuMkC — growth, penetration &amp; key metrics');
  html += tableStart([
    'STO',
    'SuMkC',
    'GRS WoW',
    'GRS YoY',
    'Vert YoY',
    'Gap',
    'Visits YoY',
    'CVR bps',
    'Pen %',
    'Pen Δ bps',
    'Pricing',
    'Avail',
    'Promo',
    'Ads',
  ]);
  for (const c of comparisons) {
    const flag = c.is_top_performer ? ' ★' : c.is_offender ? ' ⚠' : '';
    html += `<tr>
      <td>${c.sto}</td>
      <td>${c.sumkc}${flag}</td>
      <td>${fmtPct(c.wgs_grs_wow_pct)}</td>
      <td>${fmtPct(c.wgs_grs_yoy_pct)}</td>
      <td>${fmtPct(c.vertical_grs_yoy_pct)}</td>
      <td style="color:${gapColor(c.yoy_gap_vs_vertical)}">${fmtPp(c.yoy_gap_vs_vertical)}</td>
      <td>${fmtPct(c.visits_yoy_pct)}</td>
      <td>${fmtBps(c.cvr_yoy_bps)}</td>
      <td>${fmtPct(c.wgs_pen_pct)}</td>
      <td>${fmtBps(c.wgs_pen_yoy_bps)}</td>
      <td>${fmtBps(c.branded_comp_bps)}</td>
      <td>${fmtBps(c.availability_bps)}</td>
      <td>${fmtBps(c.promo_depth_bps)}</td>
      <td>${c.ads_pct_wsc != null ? fmtPct(c.ads_pct_wsc) : '—'}</td>
    </tr>`;
  }
  html += `</table>`;

  // Top performers with drivers
  html += sectionTitle('4. Top performers — vs vertical &amp; drivers');
  if (portfolio.top_performers.length === 0) {
    html += `<p><em>None flagged this week.</em></p>`;
  } else {
    html += `<ul>`;
    for (const c of portfolio.top_performers) {
      html += `<li><strong>${c.sumkc}</strong> — GRS YoY ${fmtPct(c.wgs_grs_yoy_pct)} vs vertical ${fmtPct(c.vertical_grs_yoy_pct)} (${fmtPp(c.yoy_gap_vs_vertical)}); `;
      html += `WoW ${fmtPct(c.wgs_grs_wow_pct)}; pen ${fmtPct(c.wgs_pen_pct)} (${fmtBps(c.wgs_pen_yoy_bps)} YoY). `;
      html += c.drivers.length
        ? `Drivers: ${c.drivers.map((d) => `${d.area} (${d.signal})`).join('; ')}.`
        : `Traffic ${fmtPct(c.visits_yoy_pct)}, CVR ${fmtBps(c.cvr_yoy_bps)}.`;
      html += `</li>`;
    }
    html += `</ul>`;
  }

  // Offenders with diagnosis
  html += sectionTitle('5. Top offenders — underperformance &amp; root-cause metrics');
  if (portfolio.offenders.length === 0) {
    html += `<p><em>None flagged this week.</em></p>`;
  } else {
    html += `<ul>`;
    for (const c of portfolio.offenders) {
      html += `<li><strong>${c.sumkc}</strong> — gap ${fmtPp(c.yoy_gap_vs_vertical)} vs vertical; GRS YoY ${fmtPct(c.wgs_grs_yoy_pct)}, WoW ${fmtPct(c.wgs_grs_wow_pct)}.`;
      if (c.drivers.length) {
        html += `<ul>`;
        for (const d of c.drivers) {
          html += `<li><strong>${d.area}</strong> [${d.severity}]: ${d.detail} (${d.signal})</li>`;
        }
        html += `</ul>`;
      } else {
        html += ` No single driver flagged — review traffic ${fmtPct(c.visits_yoy_pct)} and CVR ${fmtBps(c.cvr_yoy_bps)}.`;
      }
      html += `</li>`;
    }
    html += `</ul>`;
  }

  // Suppliers
  html += sectionTitle('6. Key suppliers — WoW / YoY &amp; change drivers');
  const { top_suppliers, offender_suppliers } = supplier_analysis;
  if (!supplier_analysis.suppliers.length) {
    html += `<p><em>No supplier data in staging sheet (add Supplier_Weekly tab).</em></p>`;
  } else {
    html += `<p><strong>Top contributors</strong></p>`;
    html += tableStart(['Supplier', 'STO', 'Tier', 'SRM', 'GRS WoW', 'GRS YoY', 'vs Vert', 'Change narrative']);
    for (const s of top_suppliers) {
      html += `<tr>
        <td>${s.name}</td><td>${s.sto}</td><td>${s.tier || '—'}</td><td>${s.srm || '—'}</td>
        <td>${fmtPct(s.grs_wow_pct)}</td><td>${fmtPct(s.grs_yoy_pct)}</td>
        <td style="color:${gapColor(s.yoy_gap_vs_vertical)}">${fmtPp(s.yoy_gap_vs_vertical)}</td>
        <td style="font-size:11px;">${s.change_narrative}</td>
      </tr>`;
    }
    html += `</table>`;

    html += `<p><strong>Supplier offenders</strong></p>`;
    html += tableStart([
      'Supplier',
      'STO',
      'GRS YoY',
      'WoW',
      'Pricing',
      'Avail',
      'Promo',
      'Ads',
      'PBSI',
      'Diagnosis',
    ]);
    for (const s of offender_suppliers) {
      html += `<tr>
        <td>${s.name}</td><td>${s.sto}</td>
        <td>${fmtPct(s.grs_yoy_pct)}</td><td>${fmtPct(s.grs_wow_pct)}</td>
        <td>${fmtBps(s.branded_comp_bps)}</td><td>${fmtBps(s.availability_bps)}</td>
        <td>${fmtBps(s.promo_depth_bps)}</td><td>${s.ads_pct_wsc != null ? fmtPct(s.ads_pct_wsc) : '—'}</td>
        <td>${s.pbsi_pct_grs != null ? fmtPct(s.pbsi_pct_grs) : '—'}</td>
        <td style="font-size:11px;">${s.drivers.map((d) => d.area).join(', ') || '—'}</td>
      </tr>`;
    }
    html += `</table>`;
  }

  // Watchlist
  html += sectionTitle('7. Watchlist — policy, promo &amp; pen gaps');
  if (!watchlist.length) {
    html += `<p><em>No watchlist items (add Watchlist_Weekly tab).</em></p>`;
  } else {
    html += tableStart(['STO', 'Category', 'Entity', 'SRM', 'Detail', 'GRS at risk']);
    for (const w of watchlist) {
      html += `<tr>
        <td>${w.sto}</td><td>${w.category}</td><td>${w.entity_name}</td>
        <td>${w.srm || '—'}</td><td>${w.detail}</td>
        <td>${w.l30d_grs_at_risk ? fmtMoney(w.l30d_grs_at_risk) : '—'}</td>
      </tr>`;
    }
    html += `</table>`;
  }

  html += `<p style="font-size:11px;color:#888;margin-top:32px;border-top:1px solid #eee;padding-top:12px;">
    Sent via n8n · WGS APS Decor · Softhome · Rugs · Weekly staging sheet (not monthly GRS tracker)<br>
    Driver thresholds: pricing &lt;−50 bps · availability &lt;−80 bps · promo/WSI gap · ads &lt;8% WSC · PBSI &gt;15% GRS
  </p></div></body></html>`;

  const subject = `WGS APS DSR Weekly | ${week} | WGS YoY ${fmtPct(portfolio.wgs_grs_yoy_pct)} vs vertical ${fmtPp(portfolio.yoy_gap_vs_vertical)}`;

  return { subject, html };
}


// --- n8n entry: Build HTML Email ---
const data = $input.first().json;
const { subject, html } = buildHtmlEmail(data);
return [{ json: Object.assign({ subject, html }, data) }];
