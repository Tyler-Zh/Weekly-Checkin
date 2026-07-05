# Build guide — WGS APS DSR Weekly n8n Report

Follow these steps in order. Estimated time: **half day for v0** (manual data + n8n test email).

---

## Step 1 — n8n access (15 min)

1. [ServiceNow n8n request](https://wayfair.service-now.com/sp?id=sc_cat_item&sys_id=594b0b16dbff770441d3751c8c961923) → **n8n - Prod**
2. Log in via Okta (VPN on)
3. In n8n: **Credentials** → add **Google Sheets OAuth2** and **Gmail OAuth2**

---

## Step 2 — Create staging Google Sheet (20 min)

1. Go to [Google Sheets](https://sheets.google.com) → **Blank spreadsheet**
2. Rename: **`WGS DSR Weekly Staging`**
3. Create tabs:
   - `SuMkC_Weekly` (required for v0)
   - `Supplier_Weekly` (v1)
   - `Watchlist_Weekly` (v1)

4. Import CSV templates from this repo:

   | Tab | Import file |
   |-----|-------------|
   | SuMkC_Weekly | `templates/SuMkC_Weekly.csv` |
   | Supplier_Weekly | `templates/Supplier_Weekly.csv` |
   | Watchlist_Weekly | `templates/Watchlist_Weekly.csv` |

   **File → Import → Upload → Replace current sheet**

5. Copy the **Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

6. Share the sheet with your n8n Google service account (Editor), or create a Drive folder and share that folder.

---

## Step 3 — Weekly data (manual v0) (30 min / week)

**Do not use** the monthly [F&D GRS tracker](https://docs.google.com/spreadsheets/d/1jrzssDK4sdih3mjTh-DZOdv44Ro9vgQloXoHh5RlQJM/edit).

Each week, before Monday:

1. Open [Looker 18715 — Weekly Category/Class](https://wayfair.cloud.looker.com/dashboards/18715)
   - Filter: US, your APS SuMkCs, **Is WGS = Yes**
   - Export metrics → update **WGS_APS** rows in `SuMkC_Weekly`

2. Same dashboard with **vertical / total category** filters
   - Update **VERTICAL_STO** rows (Home Accents, Bedding, Rugs, etc.)

3. Set `reporting_week` to prior Sunday (`YYYY-MM-DD`)

4. You need **18 rows** minimum (9 WGS + 9 vertical) on `SuMkC_Weekly`

| `promo_depth_bps` | Promo depth vs benchmark | bps |
| `ads_pct_wsc` | Ads spend % of WSC | decimal |
| `visits_wow_pct` | Traffic WoW | decimal |

Percentages as **decimals**. Pen targets apply at **STO rollup**, not per SuMkC.

---

## Step 3b — Supplier & watchlist tabs (comprehensive email)

For sections 6–7 of the email, also update weekly:

| Tab | Template | Looker source |
|-----|----------|---------------|
| `Supplier_Weekly` | `templates/Supplier_Weekly.csv` | Looker 18715 — managed T1/T2 suppliers |
| `Watchlist_Weekly` | `templates/Watchlist_Weekly.csv` | Looker 13199 — PBSI, promo WSI, pen gaps |

**n8n:** add Google Sheets Read nodes for each tab → **Merge** → **Analyze Weekly** node (replaces Compare node).

Until then, SuMkC-only still works; supplier/watchlist sections show “no data.”

Regenerate preview after template changes:

```bash
node scripts/preview-email.mjs   # opens preview/email-preview.html
```

---

## Step 4 — Apps Script validation (optional, 15 min)

1. In the staging sheet: **Extensions → Apps Script**
2. Paste `apps-script/Code.gs`
3. Run **`runValidationNow`** — should log 9/9 WGS rows
4. Run **`setupWeeklyTrigger`** once — Sunday 6pm validation email

---

## Step 5 — Import n8n workflow (30 min)

Full flow diagram: [`n8n/README.md`](../n8n/README.md)

### Option A — Import ready workflow (recommended)

1. n8n → **Workflows** → **Import from File**
2. Select `n8n/workflow-import-ready.json`
3. On **all 3** Google Sheets nodes (`SuMkC_Weekly`, `Supplier_Weekly`, `Watchlist_Weekly`):
   - Credential → your Google Sheets account
   - Document ID → staging sheet ID
4. **Gmail Send** → credential + your email
5. **Execute workflow** (Manual Trigger)

### Option B — Import skeleton

1. n8n → **Workflows** → **Import from File**
2. Select `n8n/workflow-import.json`
3. Open each **Code** node and paste:
   - **Analyze Weekly** → `n8n/analyze-weekly.js` (or run `node scripts/sync-n8n-from-lib.mjs` after editing `lib/weekly-report.mjs`)
   - **Build HTML Email** → full contents of `n8n/build-html-email.js`
4. **Read SuMkC_Weekly** node → paste your Sheet ID, sheet name `SuMkC_Weekly`
5. **Gmail Send** → set `YOUR_EMAIL@wayfair.com`

### Option B — Build nodes manually

| Order | Node | Settings |
|-------|------|----------|
| 1 | Manual Trigger | for testing |
| 2 | Google Sheets Read | Your staging sheet, tab SuMkC_Weekly |
| 3 | Code | `compare-wgs-vertical.js` |
| 4 | Code | `build-html-email.js` |
| 5 | Gmail Send | HTML, subject `{{ $json.subject }}`, body `{{ $json.html }}` |

---

## Step 6 — Test (10 min)

1. Ensure `SuMkC_Weekly` has sample data (template CSV or real Looker export)
2. Local check (optional):

   ```bash
   node scripts/test-local.mjs
   ```

3. In n8n: **Execute workflow** (Manual Trigger)
4. Check inbox — verify Decor/Softhome/Rugs tables and WGS vs vertical gaps

If you see **"Incomplete WGS weekly data"**: missing SuMkC rows or wrong `entity_name` spelling.

---

## Step 7 — Go live (after 2 shadow weeks)

1. Get L3 sign-off (Tyler Zhu) — see `docs/WGS-APS-DSR-Weekly-Report-SPEC.md`
2. Update Gmail **To** → team distribution list
3. **Disable** Manual Trigger; **Enable** `Monday 8am ET` Schedule Trigger
4. Activate workflow

---

## Step 8 — v1 additions

- Paste supplier data into `Supplier_Weekly` from Looker 18715 (managed T1/T2)
- Add second Google Sheets Read node + merge for supplier section in email
- Add `Watchlist_Weekly` for PBSI / promo from [Looker 13199](https://wayfair.cloud.looker.com/dashboards/13199)

---

## Step 9 — v2 AI narrative

After numbers are trusted for 2+ weeks:

1. Add **AI Agent** node after Compare, before Build HTML
2. Pass `comparisons` JSON only; prompt: do not recalculate metrics
3. See [F&D Weekly Perf Spec](https://docs.google.com/document/d/1isSimnEcKA4Gk78cr-9BY_vbWGXTufNlmqzTXYkcrKY)

---

## Repo file map

| File | Purpose |
|------|---------|
| `templates/SuMkC_Weekly.csv` | Import into Google Sheet |
| `n8n/compare-wgs-vertical.js` | n8n Code node 1 |
| `n8n/build-html-email.js` | n8n Code node 2 |
| `n8n/workflow-import.json` | n8n import skeleton |
| `apps-script/Code.gs` | Sunday validation trigger |
| `scripts/test-local.mjs` | Local logic smoke test |
| `docs/WGS-APS-DSR-Weekly-Report-SPEC.md` | Full spec |

---

## Help

- **#n8n-forum** on Slack
- [n8n Quick Start (InfoHub)](https://infohub.corp.wayfair.com/display/PLAT/n8n)
