#!/usr/bin/env node
/* Layer 2: V24-04 snapshot versioning + OCC. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-04-snapshot-versioning/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-04-snapshot-versioning', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

async function main() {
  log('V24-04 Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);
  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch(e){ log('CRITICAL chromium:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) { log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch (e) { log('CRITICAL load:', e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(() => window.__v24_04Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  /* 1: register + markHydrationComplete + initial snapshot */
  log(''); log('--- scenario 1: register + markHydrationComplete + snapshot ---');
  await page.click('[data-action="register-counter"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="markhydration"]');
  await page.waitForTimeout(150);
  let d = await page.evaluate(() => window.NAC.describe());
  const cp = d.plugins.find(p => p.plugin === 'counter');
  assert('describe() exposes counter plugin',         !!cp, d.plugins.map(p => p.plugin));
  assert('plugin_version present and v_-prefixed',     cp && /^v_\d+$/.test(String(cp.plugin_version)), cp && cp.plugin_version);
  assert('tree_version present and v_-prefixed',       /^v_\d+$/.test(String(d.tree_version)), d.tree_version);
  const addEl = cp && cp.elements.find(e => e.nac_id === 'counter.add');
  assert('element_state_hash present on counter.add', addEl && typeof addEl.element_state_hash === 'string' && addEl.element_state_hash.length > 0, addEl);
  await page.screenshot({ path: path.join(EVID_DIR, '01-snapshot.png'), fullPage: true });

  /* 2: invoke with FRESH expected_plugin_version -> OK */
  log(''); log('--- scenario 2: click() with fresh expected_plugin_version ---');
  await page.click('[data-action="invoke-fresh"]');
  await page.waitForTimeout(300);
  let inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const fresh = inv.find(i => i.label === 'fresh-pv');
  assert('click with fresh expected_plugin_version OK', fresh && fresh.ok === true, fresh);
  await page.screenshot({ path: path.join(EVID_DIR, '02-fresh-pv.png'), fullPage: true });

  /* 3: invoke with STALE expected_plugin_version -> snapshot_stale */
  log(''); log('--- scenario 3: click() with stale expected_plugin_version ---');
  await page.click('[data-action="invoke-stale"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const stale = inv.find(i => i.label === 'stale-pv');
  assert('click with stale expected_plugin_version REJECTED',  stale && stale.ok === false, stale);
  assert('error code === snapshot_stale',                       stale && stale.code === 'snapshot_stale', stale);
  await page.screenshot({ path: path.join(EVID_DIR, '03-stale-pv.png'), fullPage: true });

  /* 4: STRICT_VERSIONING=true + no expected_* -> version_required */
  log(''); log('--- scenario 4: STRICT=true + missing expected_* -> version_required ---');
  await page.click('[data-action="invoke-no-expected-strict"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const noExpStrict = inv.find(i => i.label === 'no-exp-strict');
  assert('click without expected_* under STRICT rejects',       noExpStrict && noExpStrict.ok === false, noExpStrict);
  assert('error code === version_required',                     noExpStrict && noExpStrict.code === 'version_required', noExpStrict);
  await page.screenshot({ path: path.join(EVID_DIR, '04-strict-version-required.png'), fullPage: true });

  /* 5: STRICT_VERSIONING=false + no expected_* -> OK */
  log(''); log('--- scenario 5: STRICT=false + missing expected_* -> OK ---');
  await page.click('[data-action="invoke-no-expected-relaxed"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const relaxed = inv.find(i => i.label === 'no-exp-relaxed');
  assert('click without expected_* under STRICT=false OK',      relaxed && relaxed.ok === true, relaxed);
  await page.screenshot({ path: path.join(EVID_DIR, '05-relaxed.png'), fullPage: true });

  /* 6: tree_version OCC -- fresh OK */
  log(''); log('--- scenario 6: tree_version OCC ---');
  await page.click('[data-action="invoke-fresh-tree"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const freshTv = inv.find(i => i.label === 'fresh-tv');
  assert('click with fresh expected_tree_version OK',           freshTv && freshTv.ok === true, freshTv);
  await page.click('[data-action="invoke-stale-tree"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const staleTv = inv.find(i => i.label === 'stale-tv');
  assert('click with stale expected_tree_version REJECTED',     staleTv && staleTv.ok === false && staleTv.code === 'snapshot_stale', staleTv);
  await page.screenshot({ path: path.join(EVID_DIR, '06-tree-version.png'), fullPage: true });

  /* 7: element_state_hash OCC -- fresh OK, mutate-then-stale REJECTED */
  log(''); log('--- scenario 7: element_state_hash OCC ---');
  await page.click('[data-action="invoke-fresh-hash"]');
  await page.waitForTimeout(300);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const freshHash = inv.find(i => i.label === 'fresh-hash');
  assert('click with fresh expected_element_state_hash OK',     freshHash && freshHash.ok === true, freshHash);
  await page.click('[data-action="mutate-then-invoke-fresh-hash"]');
  await page.waitForTimeout(500);
  inv = await page.evaluate(() => window.__v24_04Demo.invokes);
  const staleHash = inv.find(i => i.label === 'stale-hash');
  assert('mutated then click with old hash REJECTED snapshot_stale', staleHash && staleHash.ok === false && staleHash.code === 'snapshot_stale', staleHash);
  await page.screenshot({ path: path.join(EVID_DIR, '07-element-hash.png'), fullPage: true });

  /* 8: versionHistory + conformance_tier */
  log(''); log('--- scenario 8: versionHistory + conformance_tier ---');
  await page.click('[data-action="version-history"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="conformance-tier"]');
  await page.waitForTimeout(150);
  const st = await page.evaluate(() => window.__v24_04Demo);
  assert('versionHistory() returned entries',                   Array.isArray(st.history) && st.history.length > 0, st.history && st.history.length);
  assert('every history entry has tree_version + trigger',      Array.isArray(st.history) && st.history.every(e => e.tree_version && e.trigger), st.history);
  assert('conformance_tier exposed',                            typeof st.conformance === 'string' && st.conformance.length > 0, st.conformance);
  await page.click('[data-action="reset-strict"]');
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(EVID_DIR, '08-history-tier.png'), fullPage: true });

  const finalState = await page.evaluate(() => window.__v24_04Demo);
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url: BASE_URL, demo_url: DEMO_URL, run_date: RUN_DATE, failures: failures, final_state: finalState,
  }, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
