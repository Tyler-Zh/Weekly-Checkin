/**
 * Map BigQuery node JSON rows → staging schema for analyzeWeeklyRows().
 * BQ returns flat column names; this normalizes types and segment-specific fields.
 */

import { STO_BY_SUMKC } from './weekly-report.mjs';

const PCT_COLS = [
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

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** If BQ returns 30 for 30%, convert to 0.30 */
function normalizePct(n) {
  if (n === null) return null;
  return Math.abs(n) > 1 ? n / 100 : n;
}

/**
 * @param {object} row — one BQ result row (unified_weekly_read or merged queries)
 * @returns {object} row ready for analyzeWeeklyRows
 */
export function shapeBigQueryRow(row) {
  const out = { ...row };

  if (!out.segment_type && out.watch_type) {
    out.segment_type = 'watchlist';
  }

  for (const col of PCT_COLS) {
    if (out[col] !== undefined && out[col] !== null) {
      out[col] = normalizePct(num(out[col]));
    }
  }

  const intCols = ['cvr_yoy_bps', 'wgs_pen_yoy_bps', 'availability_bps', 'branded_comp_bps', 'promo_depth_bps'];
  for (const col of intCols) {
    if (out[col] !== undefined && out[col] !== null) {
      out[col] = num(out[col]);
    }
  }

  const moneyCols = ['grs_week', 'wsc_week', 'l30d_grs_at_risk'];
  for (const col of moneyCols) {
    if (out[col] !== undefined && out[col] !== null) {
      out[col] = num(out[col]);
    }
  }

  if (out.segment_type === 'sumkc' && out.entity_name && !out.sto) {
    out.sto = STO_BY_SUMKC[out.entity_name] || out.sto || null;
  }

  if (out.reporting_week && typeof out.reporting_week === 'object' && out.reporting_week.value) {
    out.reporting_week = out.reporting_week.value;
  }

  return out;
}

/** @param {object[]} rows */
export function shapeBigQueryRows(rows) {
  return rows.map(shapeBigQueryRow);
}
