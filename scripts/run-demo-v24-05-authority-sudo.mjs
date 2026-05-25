#!/usr/bin/env node
/* Layer 2: V24-05 authority + sudo elevation. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-05-authority-sudo/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-05-authority-sudo', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

async function main() {
  log('V24-05 Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);
  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch(e){ log('CRITICAL chromium:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) { log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch (e) { log('CRITICAL load:', e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(() => window.__v24_05Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  /* 1: confirm_action without handler -> reject (no_confirm_handler error). */
  log(''); log('--- scenario 1: confirm_action without handler installed ---');
  const noHandler = await page.evaluate(async () => {
    try { return { ok: true, val: await window.NAC.confirm_action('a', 'm', { scope: 'low' }) }; }
    catch (e) { return { ok: false, code: e.code, msg: e.message }; }
  });
  assert('confirm_action with no handler rejects with no_confirm_handler', noHandler && noHandler.ok === false && noHandler.code === 'no_confirm_handler', noHandler);
  await page.screenshot({ path: path.join(EVID_DIR, '01-no-handler.png'), fullPage: true });

  /* 2: install auto-approve, confirm low scope -> approved, sudo=false. */
  log(''); log('--- scenario 2: auto-approve handler ---');
  await page.click('[data-action="install-auto-approve"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="confirm-low"]');
  await page.waitForTimeout(150);
  let st = await page.evaluate(() => window.__v24_05Demo);
  const firstDecision = st.confirm_decisions[st.confirm_decisions.length - 1];
  assert('confirm_action(low) approved via auto-approve handler', firstDecision && firstDecision.approved === true, firstDecision);
  /* nac:action:confirmed should have fired with sudo:false (no authority granted yet). */
  const confirmedEv = st.action_events.find(e => e.kind === 'confirmed' && e.detail && e.detail.action_id === 'edit-text');
  assert('nac:action:confirmed fired (sudo=false)', confirmedEv && confirmedEv.detail.sudo === false, confirmedEv);
  await page.screenshot({ path: path.join(EVID_DIR, '02-auto-approve.png'), fullPage: true });

  /* 3: auto-reject handler */
  log(''); log('--- scenario 3: auto-reject handler ---');
  await page.click('[data-action="install-auto-reject"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="confirm-medium"]');
  await page.waitForTimeout(150);
  st = await page.evaluate(() => window.__v24_05Demo);
  const rej = st.confirm_decisions[st.confirm_decisions.length - 1];
  assert('confirm_action(medium) rejected via auto-reject handler', rej && rej.approved === false, rej);
  const rejectedEv = st.action_events.find(e => e.kind === 'rejected' && e.detail && e.detail.action_id === 'change-amount');
  assert('nac:action:rejected fired',                                 rejectedEv && rejectedEv.detail.scope === 'medium', rejectedEv);
  await page.screenshot({ path: path.join(EVID_DIR, '03-auto-reject.png'), fullPage: true });

  /* 4: scenario sudo bypass -- grant high, then 3 confirms bypass. */
  log(''); log('--- scenario 4: sudo bypass (high grant satisfies low+medium+high) ---');
  await page.click('[data-action="scenario-sudo-bypass"]');
  await page.waitForTimeout(300);
  st = await page.evaluate(() => window.__v24_05Demo);
  const sudoDecisions = st.confirm_decisions.filter(d => ['a','b','c'].includes(d.id));
  assert('sudo-bypass: all 3 confirms approved', sudoDecisions.length === 3 && sudoDecisions.every(d => d.ok === true), sudoDecisions);
  const sudoEvents = st.action_events.filter(e => ['a','b','c'].includes(e.detail && e.detail.action_id));
  assert('sudo-bypass: every emitted confirmed event has sudo=true', sudoEvents.length === 3 && sudoEvents.every(e => e.detail.sudo === true), sudoEvents);
  await page.screenshot({ path: path.join(EVID_DIR, '04-sudo-bypass.png'), fullPage: true });

  /* 5: scenario rank rule -- low grant doesn't satisfy high check. */
  log(''); log('--- scenario 5: rank rule (low grant does NOT satisfy high check) ---');
  await page.click('[data-action="scenario-rank-rule"]');
  await page.waitForTimeout(300);
  st = await page.evaluate(() => window.__v24_05Demo);
  const lowAct  = st.confirm_decisions.find(d => d.id === 'low-act');
  const highAct = st.confirm_decisions.find(d => d.id === 'high-act');
  /* low grant satisfies low confirm (sudo bypass even if handler rejects). */
  assert('rank-rule: low-act approved (sudo bypass via low grant)',  lowAct && lowAct.approved === true,  lowAct);
  /* high check falls through to handler which rejects -> high-act false. */
  assert('rank-rule: high-act REJECTED (low grant does not satisfy high)', highAct && highAct.approved === false, highAct);
  await page.screenshot({ path: path.join(EVID_DIR, '05-rank-rule.png'), fullPage: true });

  /* 6: scenario TTL expiry */
  log(''); log('--- scenario 6: TTL expiry ---');
  await page.click('[data-action="scenario-ttl-expiry"]');
  await page.waitForTimeout(2000); /* wait for 1s grant + 1.2s post + buffer */
  st = await page.evaluate(() => window.__v24_05Demo);
  const within = st.confirm_decisions.find(d => d.id === 'within-ttl');
  const after  = st.confirm_decisions.find(d => d.id === 'after-ttl');
  assert('ttl-expiry: within-ttl confirm approved (sudo bypass)', within && within.approved === true, within);
  assert('ttl-expiry: after-ttl confirm rejected (handler said no)', after && after.approved === false, after);
  const expiredEv = st.authority_events.find(e => e.kind === 'expired');
  assert('ttl-expiry: nac:authority:expired fired', !!expiredEv, expiredEv);
  await page.screenshot({ path: path.join(EVID_DIR, '06-ttl-expiry.png'), fullPage: true });

  /* 7: revoke_authority is idempotent */
  log(''); log('--- scenario 7: revoke_authority idempotency ---');
  await page.click('[data-action="install-auto-approve"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="request-medium-5s"]');
  await page.waitForTimeout(200);
  let has = await page.evaluate(() => ({ low: window.NAC.has_authority('low'), medium: window.NAC.has_authority('medium') }));
  assert('after grant medium 5s, has(medium) === true', has.medium === true, has);
  assert('after grant medium, has(low) === true (rank rule)',   has.low    === true, has);
  await page.click('[data-action="revoke-medium"]');
  await page.waitForTimeout(100);
  await page.click('[data-action="revoke-medium"]'); /* idempotent second call */
  await page.waitForTimeout(100);
  has = await page.evaluate(() => ({ medium: window.NAC.has_authority('medium') }));
  assert('after revoke, has(medium) === false',                 has.medium === false, has);
  await page.screenshot({ path: path.join(EVID_DIR, '07-revoke-idempotent.png'), fullPage: true });

  const finalState = await page.evaluate(() => window.__v24_05Demo);
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url: BASE_URL, demo_url: DEMO_URL, run_date: RUN_DATE, failures: failures, final_state: finalState,
  }, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
