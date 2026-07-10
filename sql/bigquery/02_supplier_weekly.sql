-- =============================================================================
-- 02_supplier_weekly.sql — T1/T2 managed suppliers (WGS APS)
-- Source: weekly_class_opportunity_report_metrics + tier/SRM mapping (TODO)
-- =============================================================================

DECLARE reporting_week_start DATE DEFAULT (
  DATE_TRUNC(DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 7 DAY), WEEK(SUNDAY))
);

WITH params AS (
  SELECT
    reporting_week_start AS week_start,
    DATE_SUB(reporting_week_start, INTERVAL 7 DAY) AS prior_week_start,
    DATE_SUB(reporting_week_start, INTERVAL 364 DAY) AS prior_year_week_start
),

-- TODO: replace with your managed-supplier roster (SuID, tier, SRM, STO)
managed_suppliers AS (
  SELECT * FROM UNNEST([
    STRUCT(22077 AS suid, 'Glitz Home' AS supplier_name, 'T1' AS tier, 'Zoey Li' AS srm, 'Decor' AS sto),
    STRUCT(64210, 'Shenzhenshi Youlihai Keji', 'T2', 'Zoey Li', 'Decor'),
    STRUCT(93029, 'Bedsure International', 'T1', 'Tiffany Xu', 'Softhome'),
    STRUCT(83624, 'Lahome', 'T2', 'Rainbow Wu', 'Rugs')
  ])
),

weekly AS (
  SELECT
    DATE_TRUNC(m.week, WEEK(SUNDAY)) AS reporting_week,
    m.suid,
    m.supplier,
    SUM(m.GRS) AS grs_week,
    SUM(m.WSC) AS wsc_week
  FROM `wf-gcp-us-ae-ad-analytics-prod.business_analytics.weekly_class_opportunity_report_metrics` AS m
  INNER JOIN managed_suppliers ms ON m.suid = ms.suid
  CROSS JOIN params p
  WHERE m.week BETWEEN DATE_SUB(p.prior_year_week_start, INTERVAL 7 DAY)
                   AND DATE_ADD(p.week_start, INTERVAL 6 DAY)
  GROUP BY 1, 2, 3
)

SELECT
  FORMAT_DATE('%Y-%m-%d', w.reporting_week) AS reporting_week,
  ms.sto,
  'supplier' AS segment_type,
  w.supplier AS entity_name,
  'WGS_APS' AS channel,
  CAST(w.suid AS STRING) AS supplier_id,
  ms.tier,
  ms.srm,
  w.grs_week,
  SAFE_DIVIDE(w.grs_week - pw.grs_week, NULLIF(ABS(pw.grs_week), 0)) AS grs_wow_pct,
  SAFE_DIVIDE(w.grs_week - py.grs_week, NULLIF(ABS(py.grs_week), 0)) AS grs_yoy_pct,
  w.wsc_week,
  SAFE_DIVIDE(w.wsc_week - pw.wsc_week, NULLIF(ABS(pw.wsc_week), 0)) AS wsc_wow_pct,
  SAFE_DIVIDE(w.wsc_week - py.wsc_week, NULLIF(ABS(py.wsc_week), 0)) AS wsc_yoy_pct,
  CAST(NULL AS FLOAT64) AS vertical_grs_yoy_pct,
  CAST(NULL AS FLOAT64) AS visits_yoy_pct,
  CAST(NULL AS FLOAT64) AS cvr_yoy_bps,
  CAST(NULL AS FLOAT64) AS cg_pen_pct,
  CAST(NULL AS FLOAT64) AS availability_bps,
  CAST(NULL AS FLOAT64) AS branded_comp_bps,
  CAST(NULL AS FLOAT64) AS promo_depth_bps,
  CAST(NULL AS FLOAT64) AS ads_pct_wsc,
  CAST(NULL AS FLOAT64) AS pbsi_pct_grs
FROM weekly w
INNER JOIN managed_suppliers ms ON w.suid = ms.suid
CROSS JOIN params p
LEFT JOIN weekly pw ON pw.suid = w.suid AND pw.reporting_week = p.prior_week_start
LEFT JOIN weekly py ON py.suid = w.suid AND py.reporting_week = p.prior_year_week_start
WHERE w.reporting_week = p.week_start
ORDER BY ms.sto, ms.tier, w.grs_week DESC;
