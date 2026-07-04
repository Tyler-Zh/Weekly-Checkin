# WGS APS DSR Weekly Performance Report — n8n Spec

**Portfolio:** Decor · Softhome · Rugs (WGS/APS)  
**Core lens:** WGS/APS vs Vertical STO (F&D) benchmark  
**Status:** Draft v0 — data sources corrected (weekly vs monthly)

---

## Workflow name

`WGS APS DSR Weekly Performance Report (WGS vs Vertical Benchmark)`

---

## Description

Every Monday, the workflow reads **weekly** performance data for APS Decor, Softhome, and Rugs, compares **WGS/APS** to **Vertical STO (F&D)** benchmarks, surfaces top/bottom performers and penetration gaps, and delivers a standup-ready email before the [WGS CM Weekly Meeting](https://docs.google.com/document/d/1Q_VDsyiiu-zolnVxT9csF2w52DQZEL3ztkwQsPdiXE4).

---

## Important: weekly vs monthly data

| Source | Cadence | Role in this workflow |
|--------|---------|------------------------|
| [F&D NA Category & Supplier GRS tracker](https://docs.google.com/spreadsheets/d/1jrzssDK4sdih3mjTh-DZOdv44Ro9vgQloXoHh5RlQJM/edit) | **Monthly** | OKR progress, MBR, offender callouts — **not** n8n weekly trigger input |
| [RF Connected Sheet Report](https://docs.google.com/spreadsheets/d/1_kFyDbYZIUrU1BG2oKaix23OE9PiwVZPoLpatx-hDI0/edit) → [RF CS: F&D Only](https://docs.google.com/spreadsheets/d/14iOYHlU6JSrU1PVtVjJr7bWmn1mLvMI4GbXrDyVsw-M/edit) | **Weekly** | Pattern used by published F&D Weekly Perf n8n workflow |
| [Weekly Looker Report](https://wayfair.cloud.looker.com/dashboards/13199) | **Weekly** | Category traffic, CVR, PBSI, promo WSI (standup spec pattern) |
| [Weekly Category/Class Performance Looker](https://wayfair.cloud.looker.com/dashboards/18715) | **Weekly** | Category + benchmark filters (Rugs team pilot) |
| [2026 WGS Decor/Softhome/Rug OKR](https://docs.google.com/spreadsheets/d/1T1raAGWVpw_lpPOY1MWECm4k3MF3M18Lm9LhDGcZQAo) | Cycle | WGS Pen **targets** only (not time-series) |

**Do not** wire the monthly GRS tracker to a Monday cron — it will be stale or empty for WoW/YoY weekly reads.

---

## WGS vs Vertical STO (benchmark spine)

Every metric row should exist in **two channels**:

1. **WGS_APS** — filter `Is WGS = Yes` or APS SuMkCs / APS STO
2. **VERTICAL_STO** — F&D marketing category benchmark (total category, or non-WGS per [Weekly Recap](https://docs.google.com/document/d/1XmSK7YvyUUWRkVpsd_HWP5m54sODHIfozgPx5qysnCM) guidance)

Display order (from N8N weekly standup spec): **Your APS segment → F&D vertical → WFUS** (optional).

### SuMkC scope (9 categories)

**Decor STO**
- APS Decor - Home Accents
- APS Decor - Wall Accents
- APS Decor - Wall Art
- APS Decor - Seasonal Decor
- APS Decor - Outdoor Decor

**Softhome STO**
- APS Softhome - Bedding
- APS Softhome - Window
- APS Softhome - Bath

**Rugs STO**
- APS Rugs

### Vertical mapping

| APS SuMkC | Vertical benchmark (F&D) |
|-----------|--------------------------|
| APS Decor - * | Decor (Home Accents, Wall Accents, Wall Art, Seasonal, Outdoor Decor) |
| APS Softhome - Bedding | Bedding |
| APS Softhome - Window | Window |
| APS Softhome - Bath | Bath |
| APS Rugs | Rugs |

### WGS Pen OKR targets (from OKR sheet — static reference)

| STO | WI26 pen target |
|-----|-----------------|
| Decor | 34.5% |
| Soft Home | 24.5% |
| Rugs | 9.3% |

---

## Recommended weekly data pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│ UPSTREAM (weekly refresh)                                    │
├─────────────────────────────────────────────────────────────┤
│ Looker 13199  → weekly category / PBSI / promo export       │
│ Looker 18715  → category + supplier weekly (filter APS SuMkC)│
│ GBQ (optional)→ WGS vs non-WGS weekly rollups if no sheet yet │
└──────────────────────────┬──────────────────────────────────┘
                           │ Apps Script or scheduled Looker export
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGING SHEET — "WGS DSR Weekly Staging" (your copy)        │
│ Tab1: Portfolio    Tab2: STO Rollup    Tab3: SuMkC Weekly   │
│ Tab4: Supplier     Tab5: Watchlist (PBSI/Promo/Pen)          │
│ Each row: channel = WGS_APS | VERTICAL_STO | WFUS           │
└──────────────────────────┬──────────────────────────────────┘
                           │ n8n Monday 8:00 AM ET
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ n8n: Code node → rank, WGS-vs-vertical gap, top/bottom      │
│ n8n: AI node (v2) → narrative on structured JSON only        │
│ n8n: Gmail → HTML email                                      │
└─────────────────────────────────────────────────────────────┘
```

### Option A — Fastest v0 (recommended)

Mirror [F&D Weekly Perf](https://docs.google.com/document/d/1isSimnEcKA4Gk78cr-9BY_vbWGXTufNlmqzTXYkcrKY):

1. Create **WGS DSR Weekly Staging** Google Sheet with weekly tabs.
2. Apps Script pulls from Looker 18715 + 13199 (or GBQ) filtered to your 9 SuMkCs **and** matching vertical rows.
3. n8n reads staging sheet only (same as RF CS: F&D Only pattern).

### Option B — Looker → Connected Sheet

If your team gets a Connected Sheet slice (like RF Connected Sheet Report), point Apps Script at that SoT and derive weekly tabs — same architecture as F&D.

### Option C — GBQ direct in n8n

Heavier lift; use if analytics can expose a weekly table with `supplier_marketing_category`, `is_wgs`, `grs_week`, `grs_yoy_pct`, etc.

---

## Staging sheet schema

| Column | Description |
|--------|-------------|
| `reporting_week` | Week ending date (e.g. prior Sun) |
| `sto` | Decor \| Softhome \| Rugs |
| `segment_type` | portfolio \| sto \| sumkc \| supplier |
| `entity_name` | SuMkC or supplier name |
| `channel` | WGS_APS \| VERTICAL_STO \| WFUS |
| `grs_week` | Last complete week GRS |
| `grs_wow_pct` | Week-over-week % |
| `grs_yoy_pct` | Year-over-year % |
| `wsc_week` | WSC same week |
| `wsc_wow_pct`, `wsc_yoy_pct` | |
| `visits_yoy_pct` | |
| `cvr_yoy_bps` | |
| `wgs_pen_pct` | WGS share of category GRS (WGS rows) |
| `wgs_pen_yoy_bps` | |
| `availability_bps` | vs ref optional |
| `branded_comp_bps` | |
| `cg_pen_pct` | |
| `pbsi_violation_count` | supplier watchlist |
| `promo_wsi_gap_bps` | |

Computed in n8n Code node (not in sheet):

- `yoy_gap_vs_vertical` = `wgs.grs_yoy_pct - vertical.grs_yoy_pct`
- `pen_gap_vs_target` = `wgs_pen_pct - OKR_TARGET[sto]`
- `is_top_performer` / `is_area_of_concern`

---

## Email sections (6)

1. **Portfolio headline** — Decor + Softhome + Rugs combined; WGS vs Vertical vs WFUS
2. **STO rollup** — three blocks with pen gap vs OKR target
3. **SuMkC performance** — top 3 / bottom 3 per STO vs vertical
4. **Supplier performance** — managed T1/T2 (see [Tiering Memo](https://docs.google.com/document/d/1Op3Y6aFr7ANIi050t7JhUsx2qww5kKYzUekdSq4Ljv4))
5. **Vertical alignment watchlist** — PBSI, promo WSI, pen below target
6. **AI narrative** (v2) — pre-computed JSON only; no recalculation

---

## n8n workflow nodes

| # | Node | Config |
|---|------|--------|
| 1 | Schedule Trigger | Cron: `0 8 * * 1` (Monday 8:00 AM ET) |
| 2 | Google Sheets × 5 | Read staging tabs |
| 3 | Code | Filter 9 SuMkCs; join WGS + VERTICAL rows; compute gaps |
| 4 | Code | Rank top/bottom; validate row counts before send |
| 5 | AI Agent (v2) | LLM Gateway; structured prompt with gap rules |
| 6 | Gmail | HTML to distribution list |

### Pre-send validation (failure mode guard)

```javascript
// Fail workflow (do not send) if:
const expectedSumkcs = 9;
const wgsRows = rows.filter(r => r.channel === 'WGS_APS' && r.segment_type === 'sumkc');
const verticalRows = rows.filter(r => r.channel === 'VERTICAL_STO' && r.segment_type === 'sumkc');
if (wgsRows.length < expectedSumkcs || verticalRows.length < expectedSumkcs) {
  throw new Error('Incomplete weekly data — vertical benchmark rows missing');
}
```

---

## Governance

| Field | Value |
|-------|-------|
| Builder | _(you)_ |
| Business POC | Tyler Zhu |
| L3+ approval | Required before prod cron |
| OKR (90-day) | ≥80% weekly standups use this report; ≥1 action/week from WGS-vs-vertical gap |
| Support | `#n8n-forum`, [n8n Quick Start](https://infohub.corp.wayfair.com/display/PLAT/n8n) |

---

## Build phases

| Phase | Deliverable |
|-------|-------------|
| v0 | Staging sheet + Apps Script weekly export from Looker; Sections 1–2; email to self only |
| v1 | Supplier + watchlist; team review 2 weeks (F&D rollout pattern) |
| v2 | AI narrative |
| v3 | Per-SRM slice for T1/T2 |

---

## Reference templates

| Doc | Borrow |
|-----|--------|
| [F&D Weekly Perf Spec](https://docs.google.com/document/d/1isSimnEcKA4Gk78cr-9BY_vbWGXTufNlmqzTXYkcrKY) | Weekly sheet tabs, AI guardrails, Gmail HTML |
| [N8N weekly standup spec](https://docs.google.com/document/d/1c6Y7guihLTOhYfY01KcrUB0FyEFSfU92FZcIs9M4coY) | Looker 13199, category → F&D → WFUS tables |
| [GSO Automation tracker #43](https://docs.google.com/spreadsheets/d/1pzG5HBpc6rfBAxHJu5K9enbClFYATTqqQtdIJiD15K4) | Looker 18715 supplier ranking |
| [Weekly Recap requirements](https://docs.google.com/document/d/1XmSK7YvyUUWRkVpsd_HWP5m54sODHIfozgPx5qysnCM) | F&D WGS metric list, benchmark definitions |

---

## Open items

- [ ] Confirm Looker 18715 export access for all 9 SuMkCs + vertical benchmark filters
- [ ] Create staging Google Sheet + share folder with n8n service account
- [ ] Define Gmail distribution list
- [ ] Request n8n Prod access (ServiceNow) if not already granted
