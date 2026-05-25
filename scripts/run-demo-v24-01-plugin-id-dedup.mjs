#!/usr/bin/env node
/**
 * Layer 2 demo runner: V24-01 plugin slug uniqueness gate.
 * Drives demos/v24-01-plugin-id-dedup/index.html in headless Chromium,
 * exercises happy path + each enforcement layer (register-time throw,
 * boot-time validator surface, validate_global non-fatal finding,
 * HARD_DEDUP migration flag), captures screenshots + log.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL  = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL  = BASE_URL + '/demos/v24-01-plugin-id-dedup/index.html';
const RUN_DATE  = new Date().toISOString().slice(0, 10);
const EVID_DIR  = path.join(REPO_ROOT, 'evidence', 'v24-01-plugin-id-dedup', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });

const log_lines = [];
function log(...a){ const l = a.map(x => typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(name, ok, detail){ if(ok)log('PASS',name); else{failures++;log('FAIL',name,detail!=null?JSON.stringify(detail):'');} }

async function main() {
  log('V24-01 Layer 2 demo runner');
  log('  base url   ', BASE_URL);
  log('  evidence   ', EVID_DIR);

  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) { log('CRITICAL: chromium failed:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));

  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) { log('CRITICAL: status', r ? r.status() : 'no resp'); await browser.close(); process.exit(2); }
  } catch (e) {
    log('CRITICAL: failed to load demo:', e.message);
    log('  hint: run `python -m http.server 8855` from', REPO_ROOT);
    await browser.close(); process.exit(2);
  }

  await page.waitForFunction(() => window.__v24_01Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  /* ---- scenario 1: happy path register + validate ---- */
  log(''); log('--- scenario 1: happy path register + validate ---');
  await page.click('[data-action="register-cart"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="validate-global"]');
  await page.waitForTimeout(150);
  const happy = await page.evaluate(() => ({
    reg: window.__v24_01Demo.register_results,
    val: window.__v24_01Demo.validate_results,
  }));
  const happyReg = happy.reg.find(r => r.phase === 'happy-path');
  assert('happy-path register OK',                happyReg && happyReg.ok === true, happyReg);
  const happyVal = happy.val.find(v => v.phase === 'happy-path');
  assert('happy-path validate finds 0 dupes',     happyVal && happyVal.dupes_count === 0, happyVal);
  await page.screenshot({ path: path.join(EVID_DIR, '01-happy-path.png'), fullPage: true });

  /* ---- scenario 2: inject violation + register throws ---- */
  log(''); log('--- scenario 2: inject 2 violating cart roots, register() throws ---');
  await page.click('[data-action="inject-violation"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="try-register-after-violation"]');
  await page.waitForTimeout(150);
  const afterReg = await page.evaluate(() => window.__v24_01Demo.register_results.find(r => r.phase === 'after-violation'));
  assert('register after violation THREW',                       afterReg && afterReg.ok === false, afterReg);
  assert('error code is duplicate_plugin_no_instance_id',        afterReg && afterReg.code === 'duplicate_plugin_no_instance_id', afterReg);
  await page.screenshot({ path: path.join(EVID_DIR, '02-violation-register-throws.png'), fullPage: true });

  /* ---- scenario 3: validate_global reports non-fatal finding ---- */
  log(''); log('--- scenario 3: validate_global surfaces non-fatal finding ---');
  await page.click('[data-action="validate-after-violation"]');
  await page.waitForTimeout(150);
  const afterVal = await page.evaluate(() => window.__v24_01Demo.validate_results.find(v => v.phase === 'after-violation'));
  assert('validate after violation reports dupes',               afterVal && afterVal.dupes_count >= 1, afterVal);
  await page.screenshot({ path: path.join(EVID_DIR, '03-validate-finding.png'), fullPage: true });

  /* ---- scenario 4: HARD_DEDUP=true keeps the throw active ---- */
  log(''); log('--- scenario 4: HARD_DEDUP=true (strict mode) ---');
  await page.click('[data-action="trigger-boot-revalidate"]');
  await page.waitForTimeout(150);
  const flagStrict = await page.evaluate(() => window.__v24_01Demo.HARD_DEDUP_state);
  assert('HARD_DEDUP flipped to true',                            flagStrict === true, { flag: flagStrict });
  const strictReg = await page.evaluate(() => window.__v24_01Demo.register_results.find(r => r.phase === 'boot-revalidate-strict (register surface of same gate)'));
  assert('register under HARD_DEDUP=true still throws',           strictReg && strictReg.ok === false && strictReg.code === 'duplicate_plugin_no_instance_id', strictReg);
  await page.screenshot({ path: path.join(EVID_DIR, '04-hard-dedup-strict.png'), fullPage: true });

  /* ---- scenario 5: HARD_DEDUP=false migration mode ---- */
  log(''); log('--- scenario 5: HARD_DEDUP=false (migration mode) ---');
  await page.click('[data-action="toggle-hard-dedup-off"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="trigger-boot-revalidate-off"]');
  await page.waitForTimeout(150);
  const flagMig = await page.evaluate(() => window.__v24_01Demo.HARD_DEDUP_state);
  assert('HARD_DEDUP flipped to false',                            flagMig === false, { flag: flagMig });
  /* register surface still throws (the runtime gate is the register-time
     check, not the boot-time one; HARD_DEDUP only silences the boot
     fatal banner). validate_global still reports the finding for CI. */
  const migVal = await page.evaluate(() => window.__v24_01Demo.validate_results.find(v => v.phase === 'boot-revalidate-migration'));
  assert('validate under HARD_DEDUP=false still reports dupes',   migVal && migVal.dupes_count >= 1, migVal);
  await page.screenshot({ path: path.join(EVID_DIR, '05-hard-dedup-migration.png'), fullPage: true });

  /* ---- scenario 6: cleanup restores happy path ---- */
  log(''); log('--- scenario 6: cleanup restores happy path ---');
  await page.click('[data-action="cleanup"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="validate-global"]');
  await page.waitForTimeout(150);
  const finalVals = await page.evaluate(() => window.__v24_01Demo.validate_results);
  const lastVal = finalVals[finalVals.length - 1];
  assert('after cleanup, dupes_count back to 0',                  lastVal && lastVal.dupes_count === 0, lastVal);
  await page.screenshot({ path: path.join(EVID_DIR, '06-final-cleanup.png'), fullPage: true });

  const finalState = await page.evaluate(() => window.__v24_01Demo);
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url: BASE_URL, demo_url: DEMO_URL, run_date: RUN_DATE,
    failures: failures, final_state: finalState,
  }, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
