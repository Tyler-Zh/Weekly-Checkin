# n8n workflow — WGS APS DSR Weekly Check-in

Import **`workflow-import-ready.json`** (code pre-filled) or **`workflow-import.json`** (skeleton).

## Flow

```text
Manual Trigger / Monday 8am ET
        │
        ├── Read SuMkC_Weekly      ──┐
        ├── Read Supplier_Weekly  ──┼── Merge All Tabs → Analyze Weekly → Build HTML Email → Gmail Send
        └── Read Watchlist_Weekly ──┘
```

## Import (5 min)

1. n8n → **Workflows** → **Import from File**
2. Choose `workflow-import-ready.json`
3. On **each** of the 3 Google Sheets nodes:
   - Credential → your **Google Sheets account**
   - Document ID → your staging sheet ID
4. **Gmail Send** → credential + your email in **To**
5. **Save** → **Execute workflow** (Manual Trigger)

## After testing

1. Disable **Manual Trigger** (optional)
2. Enable **Monday 8am ET**
3. Activate workflow

## Regenerate after code changes

```bash
node scripts/sync-n8n-from-lib.mjs   # lib → n8n/*.js
node scripts/bundle-workflow.mjs     # n8n/*.js → workflow-import-ready.json
```

Re-import or paste updated Code node bodies in n8n.

## Troubleshooting

| Error | Fix |
|-------|-----|
| No credentials set | Select Google Sheets / Gmail credential on each node |
| Incomplete WGS weekly data | SuMkC_Weekly needs 18 rows (9 WGS + 9 vertical) |
| Empty supplier section | Add Supplier_Weekly tab + rows |
| Permission denied | Share sheet with OAuth Google account |
