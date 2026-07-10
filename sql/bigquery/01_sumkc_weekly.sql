-- =============================================================================
-- 01_sumkc_weekly.sql — 18 rows (9 WGS_APS + 9 VERTICAL_STO)
-- Dimension: MkcName via dsr_mkc_mapping (NOT SecondLevelMap)
-- =============================================================================

DECLARE reporting_week_start DATE DEFAULT (
  DATE_TRUNC(DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 7 DAY), WEEK(SUNDAY))
);

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

combined AS (
  SELECT * FROM wgs_weekly
  UNION ALL
  SELECT * FROM vertical_weekly
)

SELECT
  FORMAT_DATE('%Y-%m-%d', c.reporting_week) AS reporting_week,
  c.sto,
  'sumkc' AS segment_type,
  c.entity_name,
  c.channel,
  c.grs_week,
  SAFE_DIVIDE(c.grs_week - pw.grs_week, NULLIF(ABS(pw.grs_week), 0)) AS grs_wow_pct,
  SAFE_DIVIDE(c.grs_week - py.grs_week, NULLIF(ABS(py.grs_week), 0)) AS grs_yoy_pct
FROM combined c
CROSS JOIN params p
LEFT JOIN combined pw
  ON pw.entity_name = c.entity_name AND pw.channel = c.channel
 AND pw.reporting_week = p.prior_week_start
LEFT JOIN combined py
  ON py.entity_name = c.entity_name AND py.channel = c.channel
 AND py.reporting_week = p.prior_year_week_start
WHERE c.reporting_week = p.week_start
ORDER BY c.sto, c.entity_name, c.channel;
