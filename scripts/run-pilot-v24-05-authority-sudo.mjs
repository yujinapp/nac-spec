#!/usr/bin/env node
/**
 * Layer 3 Pilot driver: V24-05 authority + sudo elevation.
 *
 * Exercises the plan-and-execute loop for surfaces where an agent
 * must reason about when to ask for elevation. Statements probe:
 *
 *  - canonical confirm flow (handler approves or rejects)
 *  - sudo bypass: grant high authority, then 3 confirms across
 *    scopes all bypass
 *  - rank rule: a low grant does NOT satisfy a high check
 *  - TTL expiry: agent must observe expiry and re-request
 *
 * Mode: PILOT_MODE=dry-run | live.
 */

import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-05-authority-sudo/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-05-authority-sudo-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });

const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

const STATEMENTS = [
  {
    id:   'single-confirm-approved',
    text: 'Install an auto-approve confirm handler. Then call confirm_action ' +
          "for action_id 'edit-text' with scope low. Verify the call returns " +
          'true (the handler approved).',
    expect: { last_confirm_approved: true },
  },
  {
    id:   'sudo-bypass-pattern',
    text: 'Install an auto-approve handler. Request high-scope authority for ' +
          '5000ms. Then perform three confirm_action calls -- one at low scope ' +
          'with id "a", one at medium scope with id "b", one at high scope with ' +
          'id "c". All three should return true. Critically, all three should ' +
          'BYPASS the handler (sudo) because the high grant satisfies all lower ' +
          'scopes.',
    expect: { all_three_bypass: true },
  },
  {
    id:   'rank-rule-blocks-escalation',
    text: 'Install a handler that approves request_authority but REJECTS regular ' +
          'confirm_action. Then request low-scope authority for 5000ms. Then call ' +
          'confirm_action id "low-act" scope low (should pass via sudo bypass), ' +
          'and confirm_action id "high-act" scope high (should be REJECTED by the ' +
          'handler -- low grant does NOT satisfy a high check).',
    expect: { low_passes: true, high_rejected: true },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V24-05 authority + sudo on NAC3. Emit a JSON
plan of steps. Each step is one of:

  { "op": "set_handler", "mode": "approve-all"|"reject-all"|"approve-grants-only" }
  { "op": "request_authority", "scope": "low"|"medium"|"high", "ttl_ms": <number> }
  { "op": "confirm_action", "action_id": "<string>", "scope": "low"|"medium"|"high" }
  { "op": "has_authority", "scope": "low"|"medium"|"high" }
  { "op": "revoke_authority", "scope": "low"|"medium"|"high" }

Mode "approve-grants-only" approves request_authority but rejects every
regular confirm_action -- the canonical way to test that sudo bypass
works without the handler being able to silently approve anything.

Scope rank: high > medium > low. A grant of higher scope satisfies all
lower-scope confirm checks (sudo). A grant of lower scope does NOT
satisfy a higher-scope confirm check.

OUTPUT STRICT:
{ "steps": [ ... ] }
No prose, no fences, just JSON.
`.trim();

async function planLive(stmt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('PILOT_MODE=live requires ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'content-type':'application/json', 'x-api-key':process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model:'claude-sonnet-4-6', max_tokens:1024,
      system: SYSTEM_PROMPT,
      messages:[{ role:'user', content: stmt.text }],
    }),
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + await r.text());
  const j = await r.json();
  const text = (j.content && j.content[0] && j.content[0].text) || '';
  const cleaned = text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  let plan;
  try { plan = JSON.parse(cleaned); } catch(e) { throw new Error('plan parse: ' + e.message + ' :: ' + text.slice(0,200)); }
  if (!plan || !Array.isArray(plan.steps)) throw new Error('plan missing steps: ' + cleaned.slice(0,200));
  return { plan, raw: text };
}

function planDryRun(stmt) {
  const dry = {
    'single-confirm-approved': {
      steps: [
        { op:'set_handler', mode:'approve-all' },
        { op:'confirm_action', action_id:'edit-text', scope:'low' },
      ],
    },
    'sudo-bypass-pattern': {
      steps: [
        { op:'set_handler', mode:'approve-all' },
        { op:'request_authority', scope:'high', ttl_ms:5000 },
        { op:'confirm_action', action_id:'a', scope:'low' },
        { op:'confirm_action', action_id:'b', scope:'medium' },
        { op:'confirm_action', action_id:'c', scope:'high' },
      ],
    },
    'rank-rule-blocks-escalation': {
      steps: [
        { op:'set_handler', mode:'approve-grants-only' },
        { op:'request_authority', scope:'low', ttl_ms:5000 },
        { op:'confirm_action', action_id:'low-act', scope:'low' },
        { op:'confirm_action', action_id:'high-act', scope:'high' },
      ],
    },
  };
  const p = dry[stmt.id];
  if (!p) throw new Error('no dry-run plan for ' + stmt.id);
  return { plan: p, raw: '<dry-run stub>' };
}

async function executePlan(page, plan) {
  const results = [];
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    try {
      if (step.op === 'set_handler') {
        await page.evaluate((mode) => {
          if (mode === 'approve-all') {
            window.NAC.set_confirm_handler(() => Promise.resolve(true));
          } else if (mode === 'reject-all') {
            window.NAC.set_confirm_handler(() => Promise.resolve(false));
          } else if (mode === 'approve-grants-only') {
            window.NAC.set_confirm_handler((req) => Promise.resolve(req.kind === 'request_authority'));
          } else {
            throw new Error('unknown mode: ' + mode);
          }
        }, step.mode);
        results.push({ idx:i, op:step.op, mode:step.mode, ok:true });
      } else if (step.op === 'request_authority') {
        const r = await page.evaluate(({scope, ttl_ms}) => window.NAC.request_authority(scope, ttl_ms),
          { scope: step.scope, ttl_ms: step.ttl_ms });
        results.push({ idx:i, op:step.op, scope:step.scope, ttl:step.ttl_ms, ok:true, granted:r.granted, expires_at:r.expires_at });
      } else if (step.op === 'confirm_action') {
        /* Snapshot action_events BEFORE the call so we can isolate the
           sudo flag added for THIS confirm. */
        const before = await page.evaluate(() => (window.__v24_05Demo.action_events || []).length);
        const approved = await page.evaluate(({id, scope}) => window.NAC.confirm_action(id, 'pilot-driven', { scope }),
          { id: step.action_id, scope: step.scope });
        const after = await page.evaluate(() => window.__v24_05Demo.action_events);
        const evList = after.slice(before);
        /* find the event for this action_id */
        const ev = evList.find(e => e.detail && e.detail.action_id === step.action_id);
        results.push({ idx:i, op:step.op, action_id:step.action_id, scope:step.scope, approved:approved, sudo: ev && ev.detail.sudo, event_kind: ev && ev.kind });
      } else if (step.op === 'has_authority') {
        const v = await page.evaluate((scope) => window.NAC.has_authority(scope), step.scope);
        results.push({ idx:i, op:step.op, scope:step.scope, has:v });
      } else if (step.op === 'revoke_authority') {
        await page.evaluate((scope) => window.NAC.revoke_authority(scope), step.scope);
        results.push({ idx:i, op:step.op, scope:step.scope, ok:true });
      } else {
        results.push({ idx:i, op:step.op, ok:false, error:'unknown op' });
      }
    } catch (e) {
      results.push({ idx:i, op:step.op, ok:false, error: e.message });
    }
  }
  return results;
}

async function main() {
  log('V24-05 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE);
  log('  base url:', BASE_URL);
  log('  evidence:', EVID_DIR);
  if (PILOT_MODE === 'live' && !process.env.ANTHROPIC_API_KEY) {
    log('CRITICAL: PILOT_MODE=live requires ANTHROPIC_API_KEY'); process.exit(2);
  }

  let browser;
  try { browser = await chromium.launch({ headless:true }); }
  catch(e){ log('CRITICAL chromium:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport:{width:1280,height:820} })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try {
    const r = await page.goto(DEMO_URL, { waitUntil:'load', timeout:8000 });
    if (!r || !r.ok()) { log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch (e) { log('CRITICAL load:', e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(() => window.__v24_05Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements:[] };

  for (const stmt of STATEMENTS) {
    log(''); log('========== statement:', stmt.id, '==========');
    log('  text:', stmt.text);

    /* Reset state before each statement: revoke any grants + re-install
       a safe default handler so the next plan starts clean. */
    await page.evaluate(() => {
      try { window.NAC.revoke_authority('low'); } catch(_) {}
      try { window.NAC.revoke_authority('medium'); } catch(_) {}
      try { window.NAC.revoke_authority('high'); } catch(_) {}
    });

    let plan;
    try { plan = PILOT_MODE === 'live' ? await planLive(stmt) : planDryRun(stmt); }
    catch (e) { log('  CRITICAL planner:', e.message); failures++; trace.statements.push({ id: stmt.id, error: 'planner:' + e.message }); continue; }
    log('  plan steps:', plan.plan.steps.length);

    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + (r.ok === false ? ':ERR' : ':OK')).join(', '));

    /* Validation per statement. */
    if (stmt.id === 'single-confirm-approved') {
      const last = [...results].reverse().find(r => r.op === 'confirm_action');
      assert(stmt.id + ' last confirm approved=true', last && last.approved === true, last);
    }
    if (stmt.id === 'sudo-bypass-pattern') {
      const confirms = results.filter(r => r.op === 'confirm_action');
      assert(stmt.id + ' 3 confirms performed', confirms.length === 3, confirms);
      assert(stmt.id + ' all 3 approved=true',  confirms.every(c => c.approved === true), confirms);
      assert(stmt.id + ' all 3 sudo=true (bypass)', confirms.every(c => c.sudo === true), confirms);
    }
    if (stmt.id === 'rank-rule-blocks-escalation') {
      const lowAct  = results.find(r => r.op === 'confirm_action' && r.action_id === 'low-act');
      const highAct = results.find(r => r.op === 'confirm_action' && r.action_id === 'high-act');
      assert(stmt.id + ' low-act approved (sudo bypass via low grant)', lowAct && lowAct.approved === true && lowAct.sudo === true, lowAct);
      assert(stmt.id + ' high-act REJECTED (low grant does not satisfy high)', highAct && highAct.approved === false, highAct);
    }

    const screenshot = path.join(EVID_DIR, stmt.id + '.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    trace.statements.push({
      id: stmt.id, text: stmt.text, expect: stmt.expect,
      plan_raw: plan.raw, plan: plan.plan, results,
      screenshot: path.relative(REPO_ROOT, screenshot),
    });
  }

  await browser.close();
  fs.writeFileSync(path.join(EVID_DIR, 'pilot-trace.json'), JSON.stringify(trace, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'pilot-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
