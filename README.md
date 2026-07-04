# WGS APS DSR Weekly Check-in (n8n)

Automation spec and scripts for a **weekly** performance report covering WGS/APS **Decor**, **Softhome**, and **Rugs**, with **WGS vs Vertical STO (F&D)** benchmarking.

## Key correction

The [F&D NA Category & Supplier GRS tracker](https://docs.google.com/spreadsheets/d/1jrzssDK4sdih3mjTh-DZOdv44Ro9vgQloXoHh5RlQJM/edit) is **monthly** — use it for MBR/offender reviews, **not** as the n8n weekly data source.

## Weekly data sources (use these)

| Source | Link | Use |
|--------|------|-----|
| Weekly Looker (category/PBSI/promo) | [Dashboard 13199](https://wayfair.cloud.looker.com/dashboards/13199) | Standup tables |
| Weekly Category/Class Looker | [Dashboard 18715](https://wayfair.cloud.looker.com/dashboards/18715) | SuMkC + supplier weekly |
| F&D weekly pattern (reference) | [RF Connected Sheet](https://docs.google.com/spreadsheets/d/1_kFyDbYZIUrU1BG2oKaix23OE9PiwVZPoLpatx-hDI0/edit) → [RF CS: F&D Only](https://docs.google.com/spreadsheets/d/14iOYHlU6JSrU1PVtVjJr7bWmn1mLvMI4GbXrDyVsw-M/edit) | Apps Script + weekly tabs |
| OKR pen targets | [2026 WGS OKR](https://docs.google.com/spreadsheets/d/1T1raAGWVpw_lpPOY1MWECm4k3MF3M18Lm9LhDGcZQAo) | Static targets only |

## Repo contents

| Path | Purpose |
|------|---------|
| `docs/BUILD.md` | Step-by-step build guide |
| `docs/WGS-APS-DSR-Weekly-Report-SPEC.md` | Full workflow spec |
| `templates/*.csv` | Google Sheet import templates |
| `n8n/compare-wgs-vertical.js` | WGS vs vertical logic |
| `n8n/build-html-email.js` | HTML email builder |
| `n8n/workflow-import-ready.json` | n8n import (Code nodes pre-filled) |
| `n8n/workflow-import.json` | n8n skeleton (paste JS manually) |
| `apps-script/Code.gs` | Sunday validation trigger |
| `preview/email-preview.html` | Sample email (run `preview-email.mjs` to refresh) |
| `scripts/test-local.mjs` | Local smoke test |
| `scripts/preview-email.mjs` | Generate email HTML preview |
| `scripts/bundle-workflow.mjs` | Rebuild `workflow-import-ready.json` |

## Quick start

**Full instructions:** [`docs/BUILD.md`](docs/BUILD.md)

1. Import `templates/SuMkC_Weekly.csv` into a new Google Sheet **WGS DSR Weekly Staging**
2. Each week: paste **weekly** data from [Looker 18715](https://wayfair.cloud.looker.com/dashboards/18715) (9 WGS + 9 vertical rows) — **not** the monthly F&D GRS tracker
3. Test locally: `node scripts/test-local.mjs` and `node scripts/preview-email.mjs`
4. Import `n8n/workflow-import-ready.json` into n8n → set Sheet ID + your email → Execute workflow
