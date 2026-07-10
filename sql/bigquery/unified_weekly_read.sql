-- =============================================================================
-- WGS APS DSR — BigQuery weekly read (unified staging output)
-- =============================================================================
-- Purpose: Single query for n8n BigQuery node → Shape (optional) → Analyze Weekly
-- Output:  Flat rows matching templates/SuMkC_Weekly.csv + Supplier + Watchlist schemas
--
-- BEFORE PROD:
--   1. Validate sumkc dimension (SecondLevelMap vs custom mapping) with analytics
--   2. Align Vertical / SoID filters with Looker dashboards 18715 + 13199
--   3. Wire WSC, visits, CVR, pen, driver metrics from validated side tables
--   4. Run with dry_run in BQ console, compare to manual Looker export for 1 week
--
-- Params (override in n8n or leave default = last complete Sun-start week):
--   reporting_week_start — DATE, week starting Sunday (wo)
-- =============================================================================

DECLARE reporting_week_start DATE DEFAULT (
  DATE_TRUNC(DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 7 DAY), WEEK(SUNDAY))
);

-- ─── 1. SuMkC weekly (WGS_APS + VERTICAL_STO) ───────────────────────────────
WITH dsr_mkc_mapping AS (
  SELECT * FROM UNNEST([
    STRUCT('Decorative Accent - Home Accents' AS mkc_name, 'APS Decor - Home Accents' AS wgs_entity_name, 'Home Accents' AS vertical_entity_name, 'Decor' AS sto),
    STRUCT('Decorative Accent - Wall Accents', 'APS Decor - Wall Accents', 'Wall Accents', 'Decor'),
    STRUCT('Wall Art', 'APS Decor - Wall Art', 'Wall Art', 'Decor'),
    STRUCT('Seasonal Decor', 'APS Decor - Seasonal Decor', 'Seasonal Decor', 'Decor'),
    STRUCT('Outdoor Decor', 'APS Decor - Outdoor Decor', 'Outdoor Decor', 'Decor'),
    STRUCT('Bedding', 'APS Softhome - Bedding', 'Bedding', 'Softhome'),
    STRUCT('Window', 'APS Softhome - Window', 'Window', 'Softhome'),
    STRUCT('Bath', 'APS Softhome - Bath', 'Bath', 'Softhome'),
    STRUCT('Rugs', 'APS Rugs', 'Rugs', 'Rugs')
  ])
),

params AS (
  SELECT
    reporting_week_start AS week_start,
    DATE_ADD(reporting_week_start, INTERVAL 6 DAY) AS week_end,
    DATE_SUB(reporting_week_start, INTERVAL 7 DAY) AS prior_week_start,
    DATE_SUB(reporting_week_start, INTERVAL 364 DAY) AS prior_year_week_start
),

fact AS (
  SELECT
    DATE_TRUNC(f.OrderDate_EST, WEEK(SUNDAY)) AS reporting_week,
    f.MkcName AS mkc_name,
    f.IsAPSSupplier AS is_aps,
    SUM(f.GRS) AS grs
  FROM `wf-gcp-us-ae-btde-prod.curated_core.tbl_daily_order_financials` AS f
  INNER JOIN dsr_mkc_mapping m ON f.MkcName = m.mkc_name
  CROSS JOIN params p
  WHERE f.OrderDate_EST BETWEEN DATE_SUB(p.prior_year_week_start, INTERVAL 7 DAY)
                          AND DATE_ADD(p.week_end, INTERVAL 7 DAY)
    AND f.IsCancelledFlag = 0
    AND f.IsFraudulentFlag = 0
    AND f.SoID = 49
    AND (f.IsAPSSupplier = 1 OR f.Vertical = 'Furniture & Decor')
  GROUP BY 1, 2, 3
),

wgs_weekly AS (
  SELECT
    f.reporting_week,
    m.wgs_entity_name AS entity_name,
    m.sto,
    'WGS_APS' AS channel,
    SUM(f.grs) AS grs_week
  FROM fact f
  INNER JOIN dsr_mkc_mapping m ON f.mkc_name = m.mkc_name
  WHERE f.is_aps = 1
  GROUP BY 1, 2, 3, 4
),

vertical_weekly AS (
  SELECT
    f.reporting_week,
    m.vertical_entity_name AS entity_name,
    m.sto,
    'VERTICAL_STO' AS channel,
    SUM(f.grs) AS grs_week
  FROM fact f
  INNER JOIN dsr_mkc_mapping m ON f.mkc_name = m.mkc_name
  WHERE f.is_aps = 0
  GROUP BY 1, 2, 3, 4
),

sumkc_combined AS (
  SELECT * FROM wgs_weekly
  UNION ALL
  SELECT * FROM vertical_weekly
),

sumkc_enriched AS (
  SELECT
    c.reporting_week,
    c.sto,
    'sumkc' AS segment_type,
    c.entity_name,
    c.channel,
    c.grs_week,
    SAFE_DIVIDE(c.grs_week - pw.grs_week, NULLIF(ABS(pw.grs_week), 0)) AS grs_wow_pct,
    SAFE_DIVIDE(c.grs_week - py.grs_week, NULLIF(ABS(py.grs_week), 0)) AS grs_yoy_pct
  FROM sumkc_combined c
  CROSS JOIN params p
  LEFT JOIN sumkc_combined pw
    ON pw.entity_name = c.entity_name
   AND pw.channel = c.channel
   AND pw.reporting_week = p.prior_week_start
  LEFT JOIN sumkc_combined py
    ON py.entity_name = c.entity_name
   AND py.channel = c.channel
   AND py.reporting_week = p.prior_year_week_start
  WHERE c.reporting_week = p.week_start
),

sumkc_out AS (
  SELECT
    FORMAT_DATE('%Y-%m-%d', reporting_week) AS reporting_week,
    sto,
    segment_type,
    entity_name,
    channel,
    grs_week,
    grs_wow_pct,
    grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS wsc_week,
    CAST(NULL AS FLOAT64) AS wsc_wow_pct,
    CAST(NULL AS FLOAT64) AS wsc_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_wow_pct,
    CAST(NULL AS FLOAT64) AS cvr_yoy_bps,
    CAST(NULL AS FLOAT64) AS wgs_pen_pct,
    CAST(NULL AS FLOAT64) AS wgs_pen_yoy_bps,
    CAST(NULL AS FLOAT64) AS availability_bps,
    CAST(NULL AS FLOAT64) AS branded_comp_bps,
    CAST(NULL AS FLOAT64) AS promo_depth_bps,
    CAST(NULL AS FLOAT64) AS ads_pct_wsc,
    CAST(NULL AS FLOAT64) AS cg_pen_pct,
    CAST(NULL AS STRING) AS supplier_id,
    CAST(NULL AS STRING) AS tier,
    CAST(NULL AS STRING) AS srm,
    CAST(NULL AS FLOAT64) AS vertical_grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS pbsi_pct_grs,
    CAST(NULL AS STRING) AS watch_type,
    CAST(NULL AS STRING) AS detail,
    CAST(NULL AS FLOAT64) AS l30d_grs_at_risk
  FROM sumkc_enriched
),

-- ─── 2. Supplier weekly (placeholder — wire tier + SRM dimension) ─────────
supplier_out AS (
  SELECT
    FORMAT_DATE('%Y-%m-%d', p.week_start) AS reporting_week,
    CAST(NULL AS STRING) AS sto,
    'supplier' AS segment_type,
    CAST(NULL AS STRING) AS entity_name,
    'WGS_APS' AS channel,
    CAST(NULL AS FLOAT64) AS grs_week,
    CAST(NULL AS FLOAT64) AS grs_wow_pct,
    CAST(NULL AS FLOAT64) AS grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS wsc_week,
    CAST(NULL AS FLOAT64) AS wsc_wow_pct,
    CAST(NULL AS FLOAT64) AS wsc_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_wow_pct,
    CAST(NULL AS FLOAT64) AS cvr_yoy_bps,
    CAST(NULL AS FLOAT64) AS wgs_pen_pct,
    CAST(NULL AS FLOAT64) AS wgs_pen_yoy_bps,
    CAST(NULL AS FLOAT64) AS availability_bps,
    CAST(NULL AS FLOAT64) AS branded_comp_bps,
    CAST(NULL AS FLOAT64) AS promo_depth_bps,
    CAST(NULL AS FLOAT64) AS ads_pct_wsc,
    CAST(NULL AS FLOAT64) AS cg_pen_pct,
    CAST(NULL AS STRING) AS supplier_id,
    CAST(NULL AS STRING) AS tier,
    CAST(NULL AS STRING) AS srm,
    CAST(NULL AS FLOAT64) AS vertical_grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS pbsi_pct_grs,
    CAST(NULL AS STRING) AS watch_type,
    CAST(NULL AS STRING) AS detail,
    CAST(NULL AS FLOAT64) AS l30d_grs_at_risk
  FROM params p
  WHERE FALSE  -- TODO: replace with supplier rollup from weekly_class_opportunity_report_metrics
),

-- ─── 3. Watchlist (PBSI / promo / pen — from Looker 13199 logic) ───────────
watchlist_out AS (
  SELECT
    FORMAT_DATE('%Y-%m-%d', p.week_start) AS reporting_week,
    CAST(NULL AS STRING) AS sto,
    'watchlist' AS segment_type,
    CAST(NULL AS STRING) AS entity_name,
    CAST(NULL AS STRING) AS channel,
    CAST(NULL AS FLOAT64) AS grs_week,
    CAST(NULL AS FLOAT64) AS grs_wow_pct,
    CAST(NULL AS FLOAT64) AS grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS wsc_week,
    CAST(NULL AS FLOAT64) AS wsc_wow_pct,
    CAST(NULL AS FLOAT64) AS wsc_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_yoy_pct,
    CAST(NULL AS FLOAT64) AS visits_wow_pct,
    CAST(NULL AS FLOAT64) AS cvr_yoy_bps,
    CAST(NULL AS FLOAT64) AS wgs_pen_pct,
    CAST(NULL AS FLOAT64) AS wgs_pen_yoy_bps,
    CAST(NULL AS FLOAT64) AS availability_bps,
    CAST(NULL AS FLOAT64) AS branded_comp_bps,
    CAST(NULL AS FLOAT64) AS promo_depth_bps,
    CAST(NULL AS FLOAT64) AS ads_pct_wsc,
    CAST(NULL AS FLOAT64) AS cg_pen_pct,
    CAST(NULL AS STRING) AS supplier_id,
    CAST(NULL AS STRING) AS tier,
    CAST(NULL AS STRING) AS srm,
    CAST(NULL AS FLOAT64) AS vertical_grs_yoy_pct,
    CAST(NULL AS FLOAT64) AS pbsi_pct_grs,
    CAST(NULL AS STRING) AS watch_type,
    CAST(NULL AS STRING) AS detail,
    CAST(NULL AS FLOAT64) AS l30d_grs_at_risk
  FROM params p
  WHERE FALSE  -- TODO: PBSI + promo WSI + pen-below-target rules
)

SELECT * FROM sumkc_out
UNION ALL
SELECT * FROM supplier_out
UNION ALL
SELECT * FROM watchlist_out
ORDER BY segment_type, entity_name, channel;
