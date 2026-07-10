/**
 * Map Looker API JSON rows → staging sheet schema for analyzeWeeklyRows().
 * Config: config/looker-queries.json (copy from looker-queries.example.json)
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
export function reportingWeekSunday(d = new Date()) {
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
export function shapeLookerBatches(batches, queriesConfig) {
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
export function buildInlineQueryBody(queryConfig) {
  return {
    model: queryConfig.model,
    view: queryConfig.view,
    fields: queryConfig.fields,
    filters: queryConfig.filters || {},
    limit: queryConfig.limit || '500',
    query_timezone: queryConfig.query_timezone || 'America/New_York',
  };
}
