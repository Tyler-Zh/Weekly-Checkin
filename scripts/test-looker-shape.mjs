/**
 * Smoke test looker row shaping with sample API-shaped rows.
 * Run: node scripts/test-looker-shape.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { shapeLookerBatches } from '../lib/looker-shape.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const queries = JSON.parse(
  readFileSync(join(root, 'config/looker-queries.example.json'), 'utf8')
);

// Minimal fake Looker rows using placeholder field names from example config
const batches = [
  {
    queryKey: 'sumkc',
    rows: [
      {
        'PASTE_VIEW.supplier_marketing_category': 'APS Decor - Home Accents',
        'PASTE_VIEW.channel': 'WGS',
        'PASTE_VIEW.grs_week': 1000000,
        'PASTE_VIEW.grs_yoy_pct': 30,
      },
    ],
  },
];

const rows = shapeLookerBatches(batches, queries);
console.log('shaped rows:', rows.length);
console.log(rows[0]);
if (!rows[0].segment_type) throw new Error('missing segment_type');
console.log('OK');
