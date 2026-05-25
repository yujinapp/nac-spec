#!/usr/bin/env node
/* Layer 2: V24-02 syncPlugin idempotent registration. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-02-sync-plugin/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-02-sync-plugin', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

async function main() {
  log('V24-02 Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);

  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch(e){ log('CRITICAL chromium:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));

  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) { log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch (e) {
    log('CRITICAL load:', e.message); await browser.close(); process.exit(2);
  }
  await page.waitForFunction(() => window.__v24_02Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  /* 1: initial register v1 (1 verb) */
  log(''); log('--- scenario 1: register(v1) -- 1 verb ---');
  await page.click('[data-action="register-v1"]');
  await page.waitForTimeout(150);
  let snap = await page.evaluate(() => window.__v24_02Demo.registry_snapshots);
  const afterV1 = snap.find(s => s.label === 'after-register-v1');
  assert('after register v1, verb_count === 1', afterV1 && afterV1.verb_count === 1, afterV1);
  await page.screenshot({ path: path.join(EVID_DIR, '01-register-v1.png'), fullPage: true });

  /* 2: legacy register v2 on existing slug -- behaviour observed (warn or throw) */
  log(''); log('--- scenario 2: register(v2) on existing slug -- contrast behaviour ---');
  await page.click('[data-action="register-v2-appends"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="show-registry"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(EVID_DIR, '02-register-v2-contrast.png'), fullPage: true });

  /* 3: syncPlugin v3 -- replaces */
  log(''); log('--- scenario 3: syncPlugin(v3) replaces manifest ---');
  await page.click('[data-action="sync-v3"]');
  await page.waitForTimeout(150);
  let syncs = await page.evaluate(() => window.__v24_02Demo.sync_results);
  const v3 = syncs.find(s => s.label === 'v3');
  assert('syncPlugin(v3) replaced=true (manifest was present)', v3 && v3.replaced === true, v3);
  assert('syncPlugin(v3) returned a plugin_version', v3 && typeof v3.version !== 'undefined', v3);
  snap = await page.evaluate(() => window.__v24_02Demo.registry_snapshots);
  const afterV3 = snap.find(s => s.label === 'after-sync-v3');
  assert('after sync v3, verb_count === 2 (renamed verbs)', afterV3 && afterV3.verb_count === 2, afterV3);
  await page.screenshot({ path: path.join(EVID_DIR, '03-sync-v3-replaced.png'), fullPage: true });

  /* 4: syncPlugin v3 again -- still replaces but with identical payload */
  log(''); log('--- scenario 4: syncPlugin(v3) idempotent -- replace bumps version ---');
  const pvBefore = await page.evaluate(() => window.__v24_02Demo.last_pv);
  await page.click('[data-action="sync-v3-again"]');
  await page.waitForTimeout(150);
  syncs = await page.evaluate(() => window.__v24_02Demo.sync_results);
  const v3again = syncs.find(s => s.label === 'v3-again');
  assert('syncPlugin(v3 again) replaced=true', v3again && v3again.replaced === true, v3again);
  /* tree_version monotonically increases on each replace (V24-04
     syncPlugin -> _bumpPluginVersion -> _bumpTreeVersion). Parse the
     'v_N' tag and compare numerically. */
  const pvAfter = await page.evaluate(() => window.__v24_02Demo.last_pv);
  function parseVer(s) { return parseInt(String(s).replace(/^v_/, ''), 10); }
  assert('tree_version monotonic across idempotent sync (v2.5 / V24-02 contract)',
    parseVer(pvAfter) > parseVer(pvBefore),
    { pvBefore: pvBefore, pvAfter: pvAfter });
  await page.screenshot({ path: path.join(EVID_DIR, '04-sync-v3-idempotent.png'), fullPage: true });

  /* 5: subscribe to invalidated + sync v4 (real swap) */
  log(''); log('--- scenario 5: subscribe invalidated + syncPlugin(v4) ---');
  await page.click('[data-action="subscribe-invalidated"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="sync-v4"]');
  await page.waitForTimeout(150);
  const inv = await page.evaluate(() => window.__v24_02Demo.invalidated_count);
  assert('nac:plugin:invalidated fired at least once', inv >= 1, { invalidated_count: inv });
  syncs = await page.evaluate(() => window.__v24_02Demo.sync_results);
  const v4 = syncs.find(s => s.label === 'v4');
  assert('syncPlugin(v4) replaced=true', v4 && v4.replaced === true, v4);
  snap = await page.evaluate(() => window.__v24_02Demo.registry_snapshots);
  const afterV4 = snap.find(s => s.label === 'after-sync-v4');
  assert('after sync v4, verb_count === 3', afterV4 && afterV4.verb_count === 3, afterV4);
  await page.screenshot({ path: path.join(EVID_DIR, '05-sync-v4-invalidated.png'), fullPage: true });

  const finalState = await page.evaluate(() => window.__v24_02Demo);
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url: BASE_URL, demo_url: DEMO_URL, run_date: RUN_DATE, failures: failures, final_state: finalState,
  }, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
