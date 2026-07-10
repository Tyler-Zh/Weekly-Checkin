/**
 * Generate n8n Workflow SDK for Looker v2 (API pull, no manual sheet paste).
 * Run: node scripts/generate-n8n-sdk-workflow-v2.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const analyzeJs = readFileSync(join(root, 'n8n/analyze-weekly.js'), 'utf8');
const emailJs = readFileSync(join(root, 'n8n/build-html-email.js'), 'utf8');
const shapeJs = readFileSync(join(root, 'n8n/looker-shape-rows.js'), 'utf8');

const queriesPath = join(root, 'config/looker-queries.json');
const queriesExample = join(root, 'config/looker-queries.example.json');
let queries;
try {
  queries = JSON.parse(readFileSync(queriesPath, 'utf8'));
} catch {
  queries = JSON.parse(readFileSync(queriesExample, 'utf8'));
}

function inlineBody(q) {
  return {
    model: q.model,
    view: q.view,
    fields: q.fields,
    filters: q.filters || {},
    limit: q.limit || '500',
    query_timezone: q.query_timezone || 'America/New_York',
  };
}

const sumkcBodyObj = inlineBody(queries.sumkc);
const supplierBodyObj = inlineBody(queries.supplier);
const watchlistBodyObj = inlineBody(queries.watchlist);

const code = `import { workflow, node, trigger, merge, sticky, expr } from '@n8n/workflow-sdk';

const ANALYZE_JS = ${JSON.stringify(analyzeJs)};
const EMAIL_JS = ${JSON.stringify(emailJs)};
const SHAPE_JS = ${JSON.stringify(shapeJs)};

const LOOKER_LOGIN_URL = 'https://wayfair.cloud.looker.com/api/4.0/login';
const LOOKER_QUERY_URL = 'https://wayfair.cloud.looker.com/api/4.0/queries/run/json';

const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger (testing)' },
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Monday 8am ET',
    disabled: true,
    parameters: {
      rule: {
        interval: [{ field: 'cronExpression', expression: '0 8 * * 1' }],
      },
    },
  },
});

const lookerLogin = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Looker Login',
    parameters: {
      method: 'POST',
      url: LOOKER_LOGIN_URL,
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Content-Type', value: 'application/x-www-form-urlencoded' },
          { name: 'Accept', value: 'application/json' },
        ],
      },
      sendBody: true,
      contentType: 'form-urlencoded',
      specifyBody: 'keypair',
      bodyParameters: {
        parameters: [
          { name: 'client_id', value: 'PASTE_LOOKER_CLIENT_ID' },
          { name: 'client_secret', value: 'PASTE_LOOKER_CLIENT_SECRET' },
        ],
      },
      options: { response: { response: { responseFormat: 'json' } } },
    },
  },
});

const LOOKER_QUERY_URL = 'https://wayfair.cloud.looker.com/api/4.0/queries/run/json';

const lookerQueryHeaders = {
  parameters: [
    {
      name: 'Authorization',
      value: "={{ 'token ' + $('Looker Login').first().json.access_token }}",
    },
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Accept', value: 'application/json' },
  ],
};

const SUMKC_QUERY = ${JSON.stringify(sumkcBodyObj)};
const SUPPLIER_QUERY = ${JSON.stringify(supplierBodyObj)};
const WATCHLIST_QUERY = ${JSON.stringify(watchlistBodyObj)};

const querySumkc = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Looker Query SuMkC',
    parameters: {
      method: 'POST',
      url: LOOKER_QUERY_URL,
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: lookerQueryHeaders,
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: SUMKC_QUERY,
      options: { response: { response: { responseFormat: 'json' } } },
    },
  },
});

const querySupplier = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Looker Query Supplier',
    parameters: {
      method: 'POST',
      url: LOOKER_QUERY_URL,
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: lookerQueryHeaders,
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: SUPPLIER_QUERY,
      options: { response: { response: { responseFormat: 'json' } } },
    },
  },
});

const queryWatchlist = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Looker Query Watchlist',
    parameters: {
      method: 'POST',
      url: LOOKER_QUERY_URL,
      authentication: 'none',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: lookerQueryHeaders,
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: WATCHLIST_QUERY,
      options: { response: { response: { responseFormat: 'json' } } },
    },
  },
});

const mergeLooker = merge({
  version: 3.2,
  config: {
    name: 'Merge Looker Results',
    parameters: { mode: 'append', numberInputs: 3 },
  },
});

const shapeRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Shape Looker Rows',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: SHAPE_JS },
  },
});

const analyzeWeekly = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Analyze Weekly',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: ANALYZE_JS },
  },
});

const buildHtml = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build HTML Email',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: EMAIL_JS },
  },
});

const gmailSend = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Gmail Send',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'YOUR_EMAIL@wayfair.com',
      subject: expr('{{ $json.subject }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: true },
    },
  },
});

const setupNote = sticky({
  config: {
    content:
      '## Looker v2 — WGS APS DSR Weekly\\n\\n1. DPEDENS ticket → Looker API client_id + secret on **Looker Login**\\n2. Fill config/looker-queries.json (model, view, fields from Explore-from-here)\\n3. Regenerate + redeploy workflow SDK\\n4. Set Gmail To → test Manual Trigger\\n\\nDocs: docs/LOOKER-V2.md',
    height: 220,
    width: 400,
  },
});

export default workflow('wgs-aps-dsr-weekly-looker-v2', 'WGS APS DSR Weekly Check-in (Looker v2)')
  .add(setupNote)
  .add(manualTrigger)
  .to(lookerLogin)
  .add(lookerLogin)
  .to(querySumkc.to(mergeLooker.input(0)))
  .add(lookerLogin)
  .to(querySupplier.to(mergeLooker.input(1)))
  .add(lookerLogin)
  .to(queryWatchlist.to(mergeLooker.input(2)))
  .add(scheduleTrigger)
  .to(lookerLogin)
  .add(mergeLooker)
  .to(shapeRows)
  .to(analyzeWeekly)
  .to(buildHtml)
  .to(gmailSend);
`;

writeFileSync(join(root, 'n8n/workflow-sdk-v2.mjs'), code, 'utf8');
console.log('Wrote n8n/workflow-sdk-v2.mjs');
