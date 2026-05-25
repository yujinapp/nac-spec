#!/usr/bin/env node
/**
 * Layer 2 demo runner: V25-01 canvas+API plugin extension contract.
 *
 * Drives demos/v25-canvas-api/index.html in headless Chromium,
 * exercises every backend type, captures screenshots into
 * evidence/v25-canvas-api/<YYYY-MM-DD>/, dumps the provenance trace
 * + state assertions into run-log.json + run-log.txt.
 *
 * Assumes a static HTTP server is serving the repo root at
 * BASE_URL (default http://localhost:8855). Spin one up with:
 *   python -m http.server 8855
 * from c:/yujin-nac-spec/.
 *
 * Exit codes:
 *   0 -- all scenarios passed
 *   1 -- one or more assertions failed
 *   2 -- harness error (server unreachable, runtime not loaded, etc)
 *
 * Layered note: this is the visual / E2E gate for promoting alpha
 * to latest npm. See PROJECT.md sec 3.1.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const BASE_URL  = process.env.BASE_URL  || 'http://localhost:8855';
const DEMO_URL  = BASE_URL + '/demos/v25-canvas-api/index.html';
const RUN_DATE  = new Date().toISOString().slice(0, 10);
const EVID_DIR  = path.join(REPO_ROOT, 'evidence', 'v25-canvas-api', RUN_DATE);

fs.mkdirSync(EVID_DIR, { recursive: true });

const log_lines = [];
function log(...args) {
  const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  console.log(line);
  log_lines.push(new Date().toISOString().slice(11, 23) + ' ' + line);
}

let failures = 0;
function assert(name, ok, detail) {
  if (ok) log('PASS', name);
  else { failures++; log('FAIL', name, detail != null ? JSON.stringify(detail) : ''); }
}

/* ---------- harness ---------- */

async function main() {
  log('V25-01 Layer 2 demo runner');
  log('  base url   ', BASE_URL);
  log('  evidence   ', EVID_DIR);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    log('CRITICAL: failed to launch chromium:', e.message);
    log('  hint: npx playwright install chromium');
    process.exit(2);
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  /* Surface page console + page errors. */
  page.on('console', msg => {
    if (msg.type() === 'error') log('  page-console-error:', msg.text());
  });
  page.on('pageerror', err => log('  page-error:', err.message));

  /* Try the URL; abort cleanly if the server is down. */
  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) {
      log('CRITICAL: demo page returned status', r ? r.status() : 'no response');
      log('  url:', DEMO_URL);
      log('  hint: run `python -m http.server 8855` from', REPO_ROOT);
      await browser.close();
      process.exit(2);
    }
  } catch (e) {
    log('CRITICAL: failed to load demo:', e.message);
    log('  url:', DEMO_URL);
    log('  hint: run `python -m http.server 8855` from', REPO_ROOT);
    await browser.close();
    process.exit(2);
  }

  /* Wait for iframe + plugin registration to complete. */
  await page.waitForFunction(
    () => window.__v25Demo && window.__v25Demo.iframe_ready === true,
    { timeout: 5000 }
  ).catch(async () => {
    log('CRITICAL: iframe never reported ready');
    await page.screenshot({ path: path.join(EVID_DIR, '00-FATAL-noready.png'), fullPage: true });
    await browser.close();
    process.exit(2);
  });
  /* registerPlugin runs synchronously after CounterReady -- give one tick. */
  await page.waitForTimeout(200);

  /* ===== SCENARIO 1: initial state ===== */
  log('');
  log('--- scenario 1: initial state ---');
  await page.screenshot({ path: path.join(EVID_DIR, '01-initial.png'), fullPage: true });
  const initial = await page.evaluate(() => window.__v25Demo);
  assert('plugin registered', initial.plugin_slug === 'counter-canvas');
  assert('iframe ready',      initial.iframe_ready === true);
  assert('no errors yet',     initial.errors_seen.length === 0);

  /* Helper -- wait until counter.value reflects the expected number.
     postMessage round-trip is async; we poll via NAC.read to honour
     the same contract any agent would use. Use explicit polling --
     Playwright's waitForFunction can mishandle async lambdas that
     return primitive comparisons. */
  async function waitForValue(expected, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 2000);
    while (Date.now() < deadline) {
      const v = await page.evaluate(() => window.NAC.read('counter-canvas', 'counter.value'));
      if (v === expected) return;
      await page.waitForTimeout(50);
    }
    throw new Error('waitForValue timeout: expected ' + expected);
  }

  /* ===== SCENARIO 2: postmessage verb (increment by 1) ===== */
  log('');
  log('--- scenario 2: postmessage verb counter.increment {by:1} ---');
  await page.click('[data-action="pm-inc-1"]');
  try { await waitForValue(1, 2000); } catch (_) {}
  const v1 = await page.evaluate(() => window.NAC.read('counter-canvas', 'counter.value'));
  assert('counter.increment +1 reflected via same-origin-window', v1 === 1, { read: v1 });
  await page.screenshot({ path: path.join(EVID_DIR, '02-postmessage-increment.png'), fullPage: true });

  /* ===== SCENARIO 3: postmessage verb (increment by 5) ===== */
  log('');
  log('--- scenario 3: postmessage verb counter.increment {by:5} ---');
  await page.click('[data-action="pm-inc-5"]');
  try { await waitForValue(6, 2000); } catch (_) {}
  const v2 = await page.evaluate(() => window.NAC.read('counter-canvas', 'counter.value'));
  assert('counter.increment +5 cumulative -> 6', v2 === 6, { read: v2 });

  /* ===== SCENARIO 4: sdk-call verb (reset) ===== */
  log('');
  log('--- scenario 4: sdk-call verb counter.reset ---');
  await page.click('[data-action="sdk-reset"]');
  /* sdk-call is synchronous in the host SDK shim, but the iframe's
     _emitUp upward postMessage is async; reading via same-origin-window
     directly hits app.state which is mutated synchronously inside the
     iframe SDK call. Still wait briefly to defang any scheduling jitter. */
  try { await waitForValue(0, 1000); } catch (_) {}
  const v3 = await page.evaluate(() => window.NAC.read('counter-canvas', 'counter.value'));
  assert('counter.reset -> 0', v3 === 0, { read: v3 });
  await page.screenshot({ path: path.join(EVID_DIR, '03-sdk-reset.png'), fullPage: true });

  /* ===== SCENARIO 5: sdk-call with positional arg (sdk-add) ===== */
  log('');
  log('--- scenario 5: sdk-call verb counter.sdk-add 3 (positional) ---');
  await page.click('[data-action="sdk-inc-3"]');
  try { await waitForValue(3, 1000); } catch (_) {}
  const v4 = await page.evaluate(() => window.NAC.read('counter-canvas', 'counter.value'));
  assert('counter.sdk-add +3 -> 3', v4 === 3, { read: v4 });

  /* ===== SCENARIO 6: script-bridge (RPC with response) ===== */
  log('');
  log('--- scenario 6: script-bridge verb counter.fetch-state ---');
  await page.click('[data-action="bridge-getstate"]');
  await page.waitForTimeout(400);
  const lastCall = await page.evaluate(() => window.__v25Demo.last_call);
  assert('fetch-state call completed',  lastCall && lastCall.ok === true, lastCall);
  await page.screenshot({ path: path.join(EVID_DIR, '04-script-bridge.png'), fullPage: true });

  /* ===== SCENARIO 7: postmessage highlight + dom-mirror highlight read ===== */
  log('');
  log('--- scenario 7: highlight on + read via same-origin-window ---');
  await page.click('[data-action="pm-hl-on"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="sow-highlighted"]');
  await page.waitForTimeout(200);
  const hi = await page.evaluate(() => window.__v25Demo.last_read['counter.highlighted']);
  assert('counter.highlighted === true after highlight on', hi === true, { read: hi });
  await page.screenshot({ path: path.join(EVID_DIR, '05-highlight-on.png'), fullPage: true });

  /* ===== SCENARIO 7b: fallback chain (1st binding misses, 2nd wins) ===== */
  log('');
  log('--- scenario 7b: fallback chain for counter.value-fallback ---');
  await page.click('[data-action="fallback-read"]');
  await page.waitForTimeout(200);
  const fb = await page.evaluate(() => window.__v25Demo.last_read['counter.value-fallback']);
  assert('fallback chain resolved (1st miss, 2nd succeeds)', typeof fb === 'number', { read: fb });
  /* Verify provenance recorded the WINNING backend, not the failing one. */
  const lastFallbackRead = await page.evaluate(() => {
    const arr = window.__v25Demo.provenance.filter(p => p.path === 'counter.value-fallback' && p.kind === 'read' && p.ok);
    return arr[arr.length - 1];
  });
  assert('fallback provenance reports same-origin-window as the resolver',
    lastFallbackRead && lastFallbackRead.backend === 'same-origin-window', lastFallbackRead);
  await page.screenshot({ path: path.join(EVID_DIR, '05b-fallback.png'), fullPage: true });

  /* ===== SCENARIO 8: subscriptions (postmessage-listen) ===== */
  log('');
  log('--- scenario 8: subscribe to counter.changed (postmessage-listen) ---');
  await page.click('[data-action="sub-changed"]');
  await page.waitForTimeout(100);
  /* Now mutate the counter and wait for the subscription to deliver. */
  await page.click('[data-action="pm-inc-1"]');
  await page.waitForFunction(() => {
    const e = window.__v25Demo.last_event['counter.changed'];
    return e && typeof e === 'object' && e.MessageId === 'CounterChanged';
  }, { timeout: 2000 }).catch(() => null);
  const ev = await page.evaluate(() => window.__v25Demo.last_event['counter.changed']);
  assert('postmessage-listen delivered counter.changed', ev && ev.MessageId === 'CounterChanged', ev);
  await page.screenshot({ path: path.join(EVID_DIR, '06-subscription-changed.png'), fullPage: true });

  /* ===== SCENARIO 9: synthetic-poll subscription ===== */
  log('');
  log('--- scenario 9: subscribe to counter.derived (synthetic-poll) ---');
  await page.click('[data-action="sub-derived"]');
  await page.waitForTimeout(500); /* let it prime cache */
  await page.click('[data-action="pm-inc-1"]');
  await page.waitForFunction(() => {
    const e = window.__v25Demo.last_event['counter.derived'];
    return e && typeof e === 'object';
  }, { timeout: 3000 }).catch(() => null);
  const derived = await page.evaluate(() => window.__v25Demo.last_event['counter.derived']);
  assert('synthetic-poll delivered counter.derived snapshot', derived !== undefined, derived);
  await page.click('[data-action="unsub-all"]');
  await page.waitForTimeout(100);

  /* ===== SCENARIO 10: high-complexity cross-backend transaction ===== */
  log('');
  log('--- scenario 10: cross-backend transaction (5 verbs / 3 backends / 3 reads) ---');
  await page.click('[data-action="scenario-cross"]');
  await page.waitForFunction(() => {
    const e = window.__v25Demo.last_call;
    return e && e.verb === 'cross-backend-transaction' && e.ok === true;
  }, { timeout: 6000 });
  const cross = await page.evaluate(() => window.__v25Demo.last_call);
  assert('cross-backend tx ok',                                cross && cross.ok === true);
  assert('cross-backend read_value == 3 (reset+2+1)',          cross.result && cross.result.read_value === 3, cross.result);
  assert('cross-backend read_highlighted == true',             cross.result && cross.result.read_highlighted === true);
  /* script-bridge response is the raw message envelope -- the runtime
     does NOT apply extract on verbs (only on reads per SPEC sec 15.6).
     The Values payload is where the canvas state ground truth lives. */
  const bridge = cross.result && cross.result.bridge_reply;
  assert('cross-backend bridge_reply.Values.value == 3',       bridge && bridge.Values && bridge.Values.value === 3,       bridge);
  assert('cross-backend bridge_reply.Values.highlighted == true', bridge && bridge.Values && bridge.Values.highlighted === true, bridge);
  await page.screenshot({ path: path.join(EVID_DIR, '07-cross-backend.png'), fullPage: true });

  /* ===== SCENARIO 11: error contract (3 distinct codes) ===== */
  log('');
  log('--- scenario 11: error contract (plugin_not_registered + verb_not_declared + state_unreadable) ---');
  await page.click('[data-action="scenario-error"]');
  await page.waitForTimeout(400);
  const errs = await page.evaluate(() => window.__v25Demo.errors_seen);
  const codes = new Set(errs.map(e => e.code));
  assert('plugin_not_registered observed', codes.has('plugin_not_registered'), [...codes]);
  assert('verb_not_declared observed',     codes.has('verb_not_declared'),     [...codes]);
  assert('state_unreadable observed',      codes.has('state_unreadable'),      [...codes]);
  await page.screenshot({ path: path.join(EVID_DIR, '08-error-contract.png'), fullPage: true });

  /* ===== SCENARIO 12: provenance event family check ===== */
  log('');
  log('--- scenario 12: provenance kind coverage ---');
  const prov = await page.evaluate(() => window.__v25Demo.provenance);
  const kinds = new Set(prov.map(p => p.kind));
  assert('nac:plugin:invoked emitted', kinds.has('invoked'));
  assert('nac:plugin:read emitted',    kinds.has('read'));
  assert('nac:plugin:event emitted',   kinds.has('event'));
  const backends_used = new Set(prov.map(p => p.backend).filter(Boolean));
  log('  backends exercised: ', [...backends_used].sort().join(', '));
  assert('postmessage exercised',          backends_used.has('postmessage'));
  assert('postmessage-listen exercised',   backends_used.has('postmessage-listen'));
  assert('sdk-call exercised',             backends_used.has('sdk-call'));
  assert('script-bridge exercised',        backends_used.has('script-bridge'));
  assert('same-origin-window exercised',   backends_used.has('same-origin-window'));
  assert('synthetic-poll exercised',       backends_used.has('synthetic-poll'));

  /* ===== final state snapshot ===== */
  log('');
  log('--- final state snapshot ---');
  await page.screenshot({ path: path.join(EVID_DIR, '09-final.png'), fullPage: true });

  const finalState = await page.evaluate(() => ({
    plugin_slug:    window.__v25Demo.plugin_slug,
    iframe_ready:   window.__v25Demo.iframe_ready,
    last_read:      window.__v25Demo.last_read,
    last_event_keys: Object.keys(window.__v25Demo.last_event),
    provenance_count: window.__v25Demo.provenance.length,
    errors_seen:    window.__v25Demo.errors_seen,
    backends:       Array.from(new Set(window.__v25Demo.provenance.map(p => p.backend).filter(Boolean))),
  }));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url:   BASE_URL,
    demo_url:   DEMO_URL,
    run_date:   RUN_DATE,
    failures:   failures,
    final_state: finalState,
    provenance: prov,
  }, null, 2));

  await browser.close();

  /* run-log.txt for human eyes */
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'),
    log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  log('');
  log('===========================================');
  log('  failures:', failures);
  log('  evidence:', EVID_DIR);
  log('===========================================');
  if (failures > 0) process.exit(1);
  process.exit(0);
}

main().catch(e => {
  log('UNCAUGHT:', e.message, e.stack);
  process.exit(2);
});
