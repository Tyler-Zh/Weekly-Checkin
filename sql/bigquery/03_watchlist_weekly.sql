-- =============================================================================
-- 03_watchlist_weekly.sql — PBSI / promo / pen-below-target flags
-- PBSI stub: high PBSI GRS share from order financials (refine with Looker 13199 logic)
-- =============================================================================

DECLARE reporting_week_start DATE DEFAULT (
  DATE_TRUNC(DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 7 DAY), WEEK(SUNDAY))
);

WITH params AS (
  SELECT
    reporting_week_start AS week_start,
    DATE_ADD(reporting_week_start, INTERVAL 6 DAY) AS week_end,
    DATE_SUB(reporting_week_start, INTERVAL 29 DAY) AS l30d_start
),

managed_suppliers AS (
  SELECT * FROM UNNEST([
    STRUCT(22077 AS suid, 'Glitz Home' AS supplier_name, 'Decor' AS sto, 'Zoey Li' AS srm),
    STRUCT(99001, 'Wall Accents Offender Co', 'Decor', 'Ivy Mao'),
    STRUCT(99002, 'Bath Underperformer Ltd', 'Softhome', 'Tiffany Xu'),
    STRUCT(99003, 'Rug Value Supplier', 'Rugs', 'Rainbow Wu')
  ])
),

pbsi_l30d AS (
  SELECT
    f.SuID AS suid,
    f.SuName AS supplier_name,
    SUM(CASE WHEN f.IsPBSISKU = 1 THEN f.GRS ELSE 0 END) AS pbsi_grs,
    SUM(f.GRS) AS total_grs
  FROM `wf-gcp-us-ae-btde-prod.curated_core.tbl_daily_order_financials` AS f
  INNER JOIN managed_suppliers ms ON f.SuID = ms.suid
  CROSS JOIN params p
  WHERE f.OrderDate_EST BETWEEN p.l30d_start AND p.week_end
    AND f.IsCancelledFlag = 0
    AND f.IsFraudulentFlag = 0
    AND f.IsAPSSupplier = 1
    AND f.SoID = 49
  GROUP BY 1, 2
  HAVING SAFE_DIVIDE(pbsi_grs, NULLIF(total_grs, 0)) >= 0.15  -- TODO: tune threshold
)

SELECT
  FORMAT_DATE('%Y-%m-%d', p.week_start) AS reporting_week,
  ms.sto,
  'pbsi_violation' AS watch_type,
  pbsi.supplier_name AS entity_name,
  CAST(pbsi.suid AS STRING) AS supplier_id,
  ms.srm,
  CONCAT(
    'PBSI SKUs ~',
    CAST(ROUND(100 * SAFE_DIVIDE(pbsi.pbsi_grs, NULLIF(pbsi.total_grs, 0)), 0) AS STRING),
    '% of supplier GRS (L30D) — validate vs Looker 13199'
  ) AS detail,
  pbsi.pbsi_grs AS l30d_grs_at_risk
FROM pbsi_l30d pbsi
INNER JOIN managed_suppliers ms ON pbsi.suid = ms.suid
CROSS JOIN params p;

-- TODO: UNION ALL promo_wsi_gap rows (swap/promo table)
-- TODO: UNION ALL pen_below_target STO rollups from sumkc pen vs OKR targets
