# BigQuery weekly read (v3)

Direct **BigQuery → n8n → Analyze → Email** path. Replaces manual Sheet paste and avoids Looker API credentials.

## Architecture

```mermaid
flowchart LR
  BQ[BigQuery unified_weekly_read.sql]
  Shape[Code: bigquery-shape-rows]
  Analyze[Code: analyze-weekly]
  Email[Code: build-html-email]
  Gmail[Gmail Send]
  BQ --> Shape --> Analyze --> Email --> Gmail
```

## File map

| Path | Purpose |
|------|---------|
| `config/bigquery-sources.example.json` | Table refs, SuMkC lists, STO mapping — copy to `bigquery-sources.json` |
| `sql/bigquery/01_sumkc_weekly.sql` | Validate 18 SuMkC rows (GRS only) |
| `sql/bigquery/02_supplier_weekly.sql` | Managed supplier rollup (WSC + GRS) |
| `sql/bigquery/03_watchlist_weekly.sql` | PBSI / promo / pen flags |
| `sql/bigquery/unified_weekly_read.sql` | **Single query for n8n** — UNION ALL staging schema |
| `lib/bigquery-shape.mjs` | Type normalization → `analyzeWeeklyRows()` |

## Staging contract

Every row must align with `templates/*.csv` so `lib/weekly-report.mjs` works unchanged.

| `segment_type` | Required fields | Row count (target) |
|----------------|-----------------|-------------------|
| `sumkc` | `entity_name`, `channel` (`WGS_APS` / `VERTICAL_STO`), GRS + WoW/YoY | 18 |
| `supplier` | `entity_name`, `supplier_id`, `tier`, `srm`, GRS/WSC metrics | T1/T2 roster |
| `watchlist` | `watch_type`, `detail`, optional `l30d_grs_at_risk` | 0–N |

Percent columns are **decimals** in staging (e.g. `0.30` = +30% YoY). BQ SQL returns ratios; `bigquery-shape.mjs` converts if values look like whole percents.

## Primary tables (validated via BQ MCP)

| Table | Use |
|-------|-----|
| `wf-gcp-us-ae-btde-prod.curated_core.tbl_daily_order_financials` | GRS by `SecondLevelMap` (WGS), `MkcName` (vertical), `IsAPSSupplier`, `IsPBSISKU` |
| `wf-gcp-us-ae-ad-analytics-prod.business_analytics.weekly_class_opportunity_report_metrics` | Supplier/class weekly GRS + WSC |

**Validate with analytics before prod:**

1. ~~`SecondLevelMap` values match Looker 18715 APS SuMkC names exactly~~ **Done:** use `MkcName` + `dsr_mkc_mapping` (see `00_dsr_mkc_mapping.sql`)
2. Vertical filter: `Vertical = 'Furniture & Decor'` for non-APS rows
3. `SoID = 49` matches WFUS scope
4. WSC, visits, CVR, pen, driver bps — add joins once source tables are confirmed

## Step-by-step setup

### 1. Dry-run SQL in BigQuery

```bash
# In BQ console or via MCP execute_sql with dry_run: true
```

Start with `sql/bigquery/01_sumkc_weekly.sql`. Expect **18 rows** for the reporting week. Compare GRS totals to a manual export from [Looker 18715](https://wayfair.cloud.looker.com/dashboards/18715).

### 2. Fill managed supplier roster

Edit `managed_suppliers` CTE in `02_supplier_weekly.sql` with your real T1/T2 SuIDs, SRM names, and STO assignment.

### 3. Copy config

```bash
cp config/bigquery-sources.example.json config/bigquery-sources.json
```

### 4. Sync n8n Code nodes

```bash
node scripts/sync-n8n-from-lib.mjs
```

### 5. n8n workflow (manual or generator)

**Nodes:**

1. **Schedule** — Monday 8:00 AM `America/New_York` (or Manual Trigger for testing)
2. **BigQuery** — Operation: Execute Query; paste `sql/bigquery/unified_weekly_read.sql`
3. **Code** — `n8n/bigquery-shape-rows.js` (maps each BQ row)
4. **Code** — `n8n/analyze-weekly.js`
5. **Code** — `n8n/build-html-email.js`
6. **Gmail** — HTML body from `$json.html`, subject from `$json.subject`

**Credentials:** Google BigQuery OAuth/service account with read on the two projects above.

### 6. Shadow mode

Run manually for 2 weeks; compare email output to your current Looker/Sheet process before enabling cron.

## Optional: override reporting week

In n8n, prepend to the SQL:

```sql
DECLARE reporting_week_start DATE DEFAULT DATE '2026-06-29';
```

Or parameterize via n8n expression if your BigQuery node supports query parameters.

## What is still stubbed

| Metric | Status |
|--------|--------|
| GRS WoW/YoY (SuMkC) | Implemented in `01_sumkc_weekly.sql` |
| WSC, visits, CVR, pen, driver bps (SuMkC) | `NULL` placeholders — need validated side tables |
| Supplier vertical YoY, visits, drivers | `NULL` in `02_supplier_weekly.sql` |
| Promo WSI / pen-below-target watchlist | TODO in `03_watchlist_weekly.sql` |
| PBSI watchlist | Stub using `IsPBSISKU` L30D share — tune vs Looker 13199 |

## Related docs

- Sheet path (v1): [`docs/BUILD.md`](BUILD.md)
- Looker API path (v2): [`docs/LOOKER-V2.md`](LOOKER-V2.md)
- Full spec: [`docs/WGS-APS-DSR-Weekly-Report-SPEC.md`](WGS-APS-DSR-Weekly-Report-SPEC.md)
