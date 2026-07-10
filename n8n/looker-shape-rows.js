/**
 * AUTO-GENERATED from lib/looker-shape.mjs
 */


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

/** Last complete week starting Sunday (US Eastern wo convention). */
function reportingWeekSunday(d = new Date()) {
  const et = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const diffToLastSunday = day === 0 ? 7 : day;
  et.setDate(et.getDate() - diffToLastSunday);
  return et.toISOString().slice(0, 10);
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickField(row, lookerField, fieldMap) {
  if (row[lookerField] !== undefined) return row[lookerField];
  const mapped = fieldMap[lookerField];
  if (mapped && row[mapped] !== undefined) return row[mapped];
  const short = lookerField.split('.').pop();
  if (short && row[short] !== undefined) return row[short];
  return undefined;
}

function mapRow(row, queryConfig, defaults = {}) {
  const { field_map: fieldMap = {}, segment_type, default_channel, channel_values } = queryConfig;
  const out = { segment_type, ...defaults };

  for (const [lookerField, stagingCol] of Object.entries(fieldMap)) {
    const raw = pickField(row, lookerField, fieldMap);
    if (raw !== undefined && raw !== null && raw !== '') {
      out[stagingCol] = raw;
    }
  }

  if (default_channel && !out.channel) out.channel = default_channel;

  if (channel_values && out.channel && channel_values[out.channel]) {
    out.channel = channel_values[out.channel];
  }

  if (segment_type === 'sumkc' && out.entity_name && !out.sto) {
    out.sto = STO_BY_SUMKC[out.entity_name] || null;
  }

  const pctCols = [
    'grs_wow_pct',
    'grs_yoy_pct',
    'wsc_wow_pct',
    'wsc_yoy_pct',
    'visits_yoy_pct',
    'visits_wow_pct',
    'wgs_pen_pct',
    'cg_pen_pct',
    'ads_pct_wsc',
    'pbsi_pct_grs',
    'vertical_grs_yoy_pct',
  ];
  for (const col of pctCols) {
    if (out[col] !== undefined && out[col] !== null) {
      const n = num(out[col]);
      if (n !== null && Math.abs(n) > 1) out[col] = n / 100;
    }
  }

  return out;
}

/**
 * @param {Array<{ queryKey: string, rows: object[] }>} batches
 * @param {object} queriesConfig - full looker-queries.json
 */
function shapeLookerBatches(batches, queriesConfig) {
  const weekDefault = reportingWeekSunday();
  const allRows = [];

  for (const batch of batches) {
    const queryConfig = queriesConfig[batch.queryKey];
    if (!queryConfig) {
      throw new Error(`Unknown Looker query key: ${batch.queryKey}`);
    }

    const rows = Array.isArray(batch.rows) ? batch.rows : [];
    for (const row of rows) {
      const shaped = mapRow(row, queryConfig, {});
      if (!shaped.reporting_week) shaped.reporting_week = weekDefault;
      if (queryConfig.segment_type === 'watchlist') {
        shaped.segment_type = 'watchlist';
      }
      allRows.push(shaped);
    }
  }

  return allRows;
}

/** Build inline query body for POST /queries/run/json */
function buildInlineQueryBody(queryConfig) {
  return {
    model: queryConfig.model,
    view: queryConfig.view,
    fields: queryConfig.fields,
    filters: queryConfig.filters || {},
    limit: queryConfig.limit || '500',
    query_timezone: queryConfig.query_timezone || 'America/New_York',
  };
}


const LOOKER_QUERIES = {
  "_comment": "Copy to looker-queries.json and fill after Explore-from-here on dashboards 18715 + 13199. See docs/LOOKER-V2.md.",
  "looker_base_url": "https://wayfair.cloud.looker.com/api/4.0",
  "sumkc": {
    "dashboard_id": 18715,
    "model": "PASTE_MODEL",
    "view": "PASTE_EXPLORE",
    "fields": [
      "PASTE_VIEW.reporting_week",
      "PASTE_VIEW.supplier_marketing_category",
      "PASTE_VIEW.channel",
      "PASTE_VIEW.grs_week",
      "PASTE_VIEW.grs_wow_pct",
      "PASTE_VIEW.grs_yoy_pct",
      "PASTE_VIEW.wsc_week",
      "PASTE_VIEW.wsc_wow_pct",
      "PASTE_VIEW.wsc_yoy_pct",
      "PASTE_VIEW.visits_yoy_pct",
      "PASTE_VIEW.visits_wow_pct",
      "PASTE_VIEW.cvr_yoy_bps",
      "PASTE_VIEW.wgs_pen_pct",
      "PASTE_VIEW.wgs_pen_yoy_bps",
      "PASTE_VIEW.availability_bps",
      "PASTE_VIEW.branded_comp_bps",
      "PASTE_VIEW.promo_depth_bps",
      "PASTE_VIEW.ads_pct_wsc",
      "PASTE_VIEW.cg_pen_pct"
    ],
    "filters": {
      "PASTE_VIEW.reporting_week": "last week"
    },
    "limit": "500",
    "query_timezone": "America/New_York",
    "field_map": {
      "PASTE_VIEW.supplier_marketing_category": "entity_name",
      "PASTE_VIEW.channel": "channel",
      "PASTE_VIEW.grs_week": "grs_week",
      "PASTE_VIEW.grs_wow_pct": "grs_wow_pct",
      "PASTE_VIEW.grs_yoy_pct": "grs_yoy_pct",
      "PASTE_VIEW.wsc_week": "wsc_week",
      "PASTE_VIEW.wsc_wow_pct": "wsc_wow_pct",
      "PASTE_VIEW.wsc_yoy_pct": "wsc_yoy_pct",
      "PASTE_VIEW.visits_yoy_pct": "visits_yoy_pct",
      "PASTE_VIEW.visits_wow_pct": "visits_wow_pct",
      "PASTE_VIEW.cvr_yoy_bps": "cvr_yoy_bps",
      "PASTE_VIEW.wgs_pen_pct": "wgs_pen_pct",
      "PASTE_VIEW.wgs_pen_yoy_bps": "wgs_pen_yoy_bps",
      "PASTE_VIEW.availability_bps": "availability_bps",
      "PASTE_VIEW.branded_comp_bps": "branded_comp_bps",
      "PASTE_VIEW.promo_depth_bps": "promo_depth_bps",
      "PASTE_VIEW.ads_pct_wsc": "ads_pct_wsc",
      "PASTE_VIEW.cg_pen_pct": "cg_pen_pct",
      "PASTE_VIEW.reporting_week": "reporting_week"
    },
    "segment_type": "sumkc",
    "channel_values": {
      "WGS": "WGS_APS",
      "Vertical STO": "VERTICAL_STO"
    }
  },
  "supplier": {
    "dashboard_id": 18715,
    "model": "PASTE_MODEL",
    "view": "PASTE_EXPLORE",
    "fields": [
      "PASTE_VIEW.supplier_name",
      "PASTE_VIEW.sto",
      "PASTE_VIEW.supplier_id",
      "PASTE_VIEW.tier",
      "PASTE_VIEW.srm",
      "PASTE_VIEW.grs_week",
      "PASTE_VIEW.grs_wow_pct",
      "PASTE_VIEW.grs_yoy_pct",
      "PASTE_VIEW.vertical_grs_yoy_pct",
      "PASTE_VIEW.visits_yoy_pct",
      "PASTE_VIEW.cvr_yoy_bps",
      "PASTE_VIEW.cg_pen_pct",
      "PASTE_VIEW.availability_bps",
      "PASTE_VIEW.branded_comp_bps",
      "PASTE_VIEW.promo_depth_bps",
      "PASTE_VIEW.ads_pct_wsc",
      "PASTE_VIEW.pbsi_pct_grs"
    ],
    "filters": {
      "PASTE_VIEW.reporting_week": "last week",
      "PASTE_VIEW.tier": "T1,T2"
    },
    "limit": "200",
    "query_timezone": "America/New_York",
    "field_map": {
      "PASTE_VIEW.supplier_name": "entity_name",
      "PASTE_VIEW.sto": "sto",
      "PASTE_VIEW.supplier_id": "supplier_id",
      "PASTE_VIEW.tier": "tier",
      "PASTE_VIEW.srm": "srm",
      "PASTE_VIEW.grs_week": "grs_week",
      "PASTE_VIEW.grs_wow_pct": "grs_wow_pct",
      "PASTE_VIEW.grs_yoy_pct": "grs_yoy_pct",
      "PASTE_VIEW.wsc_week": "wsc_week",
      "PASTE_VIEW.wsc_wow_pct": "wsc_wow_pct",
      "PASTE_VIEW.wsc_yoy_pct": "wsc_yoy_pct",
      "PASTE_VIEW.vertical_grs_yoy_pct": "vertical_grs_yoy_pct",
      "PASTE_VIEW.visits_yoy_pct": "visits_yoy_pct",
      "PASTE_VIEW.cvr_yoy_bps": "cvr_yoy_bps",
      "PASTE_VIEW.cg_pen_pct": "cg_pen_pct",
      "PASTE_VIEW.availability_bps": "availability_bps",
      "PASTE_VIEW.branded_comp_bps": "branded_comp_bps",
      "PASTE_VIEW.promo_depth_bps": "promo_depth_bps",
      "PASTE_VIEW.ads_pct_wsc": "ads_pct_wsc",
      "PASTE_VIEW.pbsi_pct_grs": "pbsi_pct_grs"
    },
    "segment_type": "supplier",
    "default_channel": "WGS_APS"
  },
  "watchlist": {
    "dashboard_id": 13199,
    "model": "PASTE_MODEL",
    "view": "PASTE_EXPLORE",
    "fields": [
      "PASTE_VIEW.sto",
      "PASTE_VIEW.watch_type",
      "PASTE_VIEW.entity_name",
      "PASTE_VIEW.supplier_id",
      "PASTE_VIEW.srm",
      "PASTE_VIEW.detail",
      "PASTE_VIEW.l30d_grs_at_risk"
    ],
    "filters": {
      "PASTE_VIEW.reporting_week": "last week"
    },
    "limit": "100",
    "query_timezone": "America/New_York",
    "field_map": {
      "PASTE_VIEW.sto": "sto",
      "PASTE_VIEW.watch_type": "watch_type",
      "PASTE_VIEW.entity_name": "entity_name",
      "PASTE_VIEW.supplier_id": "supplier_id",
      "PASTE_VIEW.srm": "srm",
      "PASTE_VIEW.detail": "detail",
      "PASTE_VIEW.l30d_grs_at_risk": "l30d_grs_at_risk"
    },
    "segment_type": "watchlist"
  }
}
;

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
