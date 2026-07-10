# Looker v2 — automated data pull in n8n

Pull weekly metrics from Looker dashboards **18715** and **13199** via the Looker API, shape rows to the staging schema, then run the existing analyze + email pipeline. No manual paste.

## Architecture

```text
Manual / Monday 8am ET
  → Looker Login (HTTP POST /api/4.0/login)
  → Looker Query SuMkC      ──┐
  → Looker Query Supplier   ──┼── Merge → Shape Looker Rows → Analyze → Email
  → Looker Query Watchlist  ──┘
```

Workflow name on staging: **WGS APS DSR Weekly Check-in (Looker v2)**

The v1 sheet-based workflow (`T87yWewqECHE8UFT`) stays available as a fallback.

---

## Prerequisites

### 1. Looker API credentials

UI access to [wayfair.cloud.looker.com](https://wayfair.cloud.looker.com) is **not** enough.

1. Submit a [DPEDENS ticket](https://projecthub.service.csnzoo.com/proforma/projects/DPEDENS/create-issue?ac.form.id=13&ac.issuetype.id=10102) → product **BI Tooling**
2. Request a **service account** (recommended for automation)
3. You receive `client_id` and `client_secret`
4. Questions: **#plats-analytics-forum**

Reference: [Looker API Connection via Http Node](https://infohub.corp.wayfair.com/display/PLAT/Looker+API+Connection+via+Http+Node)

### 2. Explore names from your dashboards

For each tile you export today:

1. Open [Dashboard 18715](https://wayfair.cloud.looker.com/dashboards/18715) or [13199](https://wayfair.cloud.looker.com/dashboards/13199)
2. On the tile → **Explore from here**
3. Note **model** and **explore** (e.g. `exec_reporting` / `daily_order_financials_layer`)
4. In the explore, open the **Fields** picker and copy exact field names (format: `view_name.field_name`)

---

## Configure queries

1. Copy the example config:

   ```bash
   cp config/looker-queries.example.json config/looker-queries.json
   ```

2. Edit `config/looker-queries.json`:
   - Replace every `PASTE_MODEL`, `PASTE_EXPLORE`, `PASTE_VIEW.*` with real LookML names
   - Align `filters` with your dashboard (week, SuMkC list, T1/T2 suppliers, etc.)
   - Update `field_map` keys to match Looker API response keys

3. Regenerate n8n artifacts:

   ```bash
   node scripts/sync-n8n-from-lib.mjs
   node scripts/generate-n8n-sdk-workflow-v2.mjs
   ```

4. Deploy to staging (validate + `create_workflow_from_code` with `n8n/workflow-sdk-v2.mjs`)

---

## n8n setup after deploy

1. Open **Looker Login** node → set `client_id` and `client_secret` (or bind to a credential)
2. **Gmail Send** → your `@wayfair.com` address
3. **Test Looker Login** alone → expect `access_token` in output
4. **Test full workflow** with Manual Trigger

If a query fails, check:

- Field names match the explore exactly
- Filters use Looker filter syntax (`last week`, comma-separated lists, etc.)
- Service account has access to the same explores as your UI user

---

## Shape logic

`lib/looker-shape.mjs` maps Looker JSON → columns expected by `analyzeWeeklyRows()`:

| Query key | `segment_type` | Source dashboard |
|-----------|----------------|------------------|
| `sumkc` | `sumkc` | 18715 — 9 WGS + 9 vertical rows |
| `supplier` | `supplier` | 18715 — managed T1/T2 |
| `watchlist` | `watchlist` | 13199 — PBSI, promo, pen gaps |

Percent fields: if Looker returns values like `30` instead of `0.30`, the shaper divides by 100 when `|value| > 1`.

---

## Shadow mode (optional)

To compare Looker pull vs manual sheet during rollout:

1. Keep v1 workflow running from the staging sheet
2. Run v2 in parallel to yourself only (different Gmail To)
3. After 2 weeks match, switch Monday cron to v2 and archive v1

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `401` on login | Wrong client_id/secret; API not provisioned |
| `401` on query | Token expired — login runs each execution (60 min TTL) |
| `404` model/view | Typo in `looker-queries.json` |
| Empty query result | Filters too narrow; check week dimension |
| Analyze throws incomplete SuMkC | Query missing WGS or VERTICAL rows for all 9 SuMkCs |

---

## Files

| Path | Purpose |
|------|---------|
| `config/looker-queries.json` | Your Looker model/view/fields (gitignore if sensitive) |
| `config/looker-queries.example.json` | Template |
| `lib/looker-shape.mjs` | Row mapping source of truth |
| `n8n/looker-shape-rows.js` | Generated Code node |
| `n8n/workflow-sdk-v2.mjs` | Generated staging deploy |
| `scripts/generate-n8n-sdk-workflow-v2.mjs` | Regenerate workflow SDK |
