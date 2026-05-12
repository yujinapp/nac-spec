#!/usr/bin/env node
// NAC CLI v2.2.1
// Usage:
//   nac validate <url-or-dir> [--severity=error|warn|info]
//   nac --version
//
// Modes:
//   - URL: spawn headless Chromium, load URL, run NAC.validate_global(),
//     report findings.
//   - Directory: static lint of HTML/PHP files for data-nac-id /
//     data-nac-role coherence.

import fs from 'node:fs';
import path from 'node:path';
import { staticLint } from './cli-lint.mjs';

const args = process.argv.slice(2);
const cmd = args[0];

function showHelp() {
  console.log('NAC CLI v2.2.1');
  console.log('');
  console.log('Usage:');
  console.log('  nac validate <url-or-dir> [--severity=error|warn|info]');
  console.log('  nac --version');
  console.log('  nac --help');
}

function showVersion() {
  console.log('@nac3/runtime CLI 2.2.1 (Native Agent Contract v2.2)');
}

if (!cmd || cmd === '--help' || cmd === '-h') { showHelp(); process.exit(0); }
if (cmd === '--version' || cmd === '-v')      { showVersion(); process.exit(0); }

if (cmd === 'validate') {
  const target = args[1];
  if (!target) {
    console.error('error: validate requires a URL or directory argument');
    process.exit(2);
  }
  const sevArg = args.find(a => a.startsWith('--severity='));
  const minSev = sevArg ? sevArg.split('=')[1] : 'error';

  const isUrl = /^https?:\/\//.test(target);
  if (isUrl) {
    console.error('error: URL validation requires Playwright. Run:');
    console.error('  npm install --save-dev @playwright/test');
    console.error('  npx playwright install chromium');
    console.error('then re-run. Static lint of a directory works without Playwright.');
    process.exit(2);
  }

  const dir = path.resolve(target);
  if (!fs.existsSync(dir)) { console.error('error: not found:', dir); process.exit(2); }
  const findings = staticLint(dir);
  const sevRank = { info: 0, warn: 1, error: 2 };
  const min = sevRank[minSev] ?? 2;
  const failing = findings.filter(f => (sevRank[f.severity] ?? 2) >= min);
  for (const f of findings) {
    const tag = '[' + f.severity.toUpperCase() + ']';
    console.log(tag, f.code, '--', f.message, f.file ? '(' + f.file + ')' : '');
  }
  console.log('');
  console.log('Total findings:', findings.length, '|', 'Failing at severity >=', minSev + ':', failing.length);
  process.exit(failing.length > 0 ? 1 : 0);
}

console.error('error: unknown command:', cmd);
showHelp();
process.exit(2);
