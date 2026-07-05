/**
 * Embeds n8n/*.js into workflow-import.json → workflow-import-ready.json
 * Run: node scripts/bundle-workflow.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = JSON.parse(
  readFileSync(join(root, 'n8n/workflow-import.json'), 'utf8')
);
const analyzeJs = readFileSync(join(root, 'n8n/analyze-weekly.js'), 'utf8');
const emailJs = readFileSync(join(root, 'n8n/build-html-email.js'), 'utf8');

for (const node of workflow.nodes) {
  if (node.id === 'analyze-weekly') {
    node.parameters.jsCode = analyzeJs;
  }
  if (node.id === 'build-html') {
    node.parameters.jsCode = emailJs;
  }
}

writeFileSync(
  join(root, 'n8n/workflow-import-ready.json'),
  JSON.stringify(workflow, null, 2),
  'utf8'
);
console.log('Wrote n8n/workflow-import-ready.json');
