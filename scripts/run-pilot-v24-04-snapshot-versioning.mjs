#!/usr/bin/env node
/**
 * Layer 3 Pilot driver: V24-04 snapshot versioning + OCC.
 *
 * Exercises the plan-and-execute loop an agent uses when the surface
 * enforces optimistic concurrency. The Pilot must:
 *
 *   1. Snapshot the plugin via NAC.describe().
 *   2. Plan its action sequence pinned to the snapshot's
 *      plugin_version (or tree_version, or element_state_hash).
 *   3. Dispatch verbs with expected_* values from the snapshot.
 *   4. Handle snapshot_stale rejections by re-snapping and retrying.
 *
 * Mode: PILOT_MODE=dry-run (default, no API spend) | live (Claude).
 */

import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL  = process.env.BASE_URL  || 'http://localhost:8855';
const DEMO_URL  = BASE_URL + '/demos/v24-04-snapshot-versioning/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE  = new Date().toISOString().slice(0, 10);
const EVID_DIR  = path.join(REPO_ROOT, 'evidence', 'v24-04-snapshot-versioning-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });

const log_lines = [];
function log(...a){ const l = a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

/* ---- statements ---- */

const STATEMENTS = [
  {
    id:   'snapshot-then-click',
    text: 'Snapshot the counter plugin via describe(). Then click the ' +
          'counter.add button with the plugin_version from your snapshot. ' +
          'The click should succeed (OCC gate passes).',
    expect: { last_step_op: 'click', last_step_ok: true },
  },
  {
    id:   'detect-stale-and-retry',
    text: 'Take a snapshot. Click counter.add pinning your snapshot tree_version ' +
          'via expected_tree_version (should succeed). Then call sync to invalidate. ' +
          'Try to click again pinning the OLD tree_version (the one from before sync) -- ' +
          'it must reject with snapshot_stale. Re-snapshot, get a fresh tree_version, ' +
          'and retry; the retry must succeed.',
    expect: { needs_retry: true, retry_ok: true },
  },
  {
    id:   'strict-without-expected',
    text: 'Enable STRICT_VERSIONING. Try to click counter.add WITHOUT any ' +
          'expected_* values. It must reject with code version_required. ' +
          'Then disable STRICT and retry the same click without expected_* ' +
          '-- this time it must succeed.',
    expect: { strict_rejects: true, relaxed_ok: true },
  },
];

/* ---- vocabulary for the planner ---- */

const VOCAB = {
  plugin: 'counter',
  ops: [
    { op: 'describe',  shape: 'returns { tree_version, plugins: [{plugin, plugin_version, elements:[{nac_id, element_state_hash}]}] }' },
    { op: 'click',     args: '{ nac_id, expected_plugin_version?, expected_tree_version?, expected_element_state_hash? }' },
    { op: 'sync',      shape: 'NAC.syncPlugin(slug, manifest) -- bumps tree_version (used to simulate concurrent invalidation)' },
    { op: 'strict_on', shape: 'NAC.STRICT_VERSIONING = true' },
    { op: 'strict_off',shape: 'NAC.STRICT_VERSIONING = false' },
  ],
};

const SYSTEM_PROMPT = `
You are the planner half of a NAC3 Pilot agent for surface V24-04.
The user gives you an instruction about plan-and-execute against
optimistic concurrency control. Emit ONLY a JSON object with a
"steps" array. Each step is one of:

  { "op": "describe" }
  { "op": "click", "nac_id": "counter.add", "args": { "expected_plugin_version": "<v_N>" } }
  { "op": "sync" }
  { "op": "strict_on" }
  { "op": "strict_off" }

The runner exposes a placeholder "<latest.plugin_version>" you can
write into args -- it will be substituted with the most recent
describe()'s plugin_version for the "counter" plugin. Similarly
"<latest.tree_version>" and "<latest.counter.add.element_state_hash>"
are substituted from the most recent snapshot.

If a step has no actual expected_* you can pass null in args.

RUNTIME SEMANTICS YOU NEED TO KNOW:
- syncPlugin bumps tree_version AND the slug-level plugin_version,
  but it does NOT bump the per-instance plugin_version that shows up
  in describe()'s elements list for an existing mounted instance.
  Therefore: to detect invalidation caused by syncPlugin, use
  expected_tree_version (NOT expected_plugin_version).
- A DOM mutation inside the plugin subtree bumps the per-instance
  plugin_version + tree_version. Use expected_plugin_version when
  your concern is "the specific plugin instance changed".
- Element-level content changes (textContent / attributes / value)
  flip element_state_hash. Use expected_element_state_hash when
  your concern is "this exact element changed".

OUTPUT SHAPE STRICT:
{ "steps": [ ... ] }
No prose, no fences, just JSON.
`.trim();

/* ---- planners ---- */

async function planLive(stmt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('PILOT_MODE=live requires ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type':'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: stmt.text }],
    }),
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + await r.text());
  const j = await r.json();
  const text = (j.content && j.content[0] && j.content[0].text) || '';
  const cleaned = text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  let plan;
  try { plan = JSON.parse(cleaned); } catch (e) { throw new Error('plan parse: ' + e.message + ' :: ' + text.slice(0, 200)); }
  if (!plan || !Array.isArray(plan.steps)) throw new Error('plan missing steps: ' + cleaned.slice(0, 200));
  return { plan, raw: text };
}

function planDryRun(stmt) {
  const dry = {
    'snapshot-then-click': {
      steps: [
        { op: 'describe' },
        { op: 'click', nac_id: 'counter.add', args: { expected_plugin_version: '<latest.plugin_version>' } },
      ],
    },
    'detect-stale-and-retry': {
      steps: [
        { op: 'describe' },
        { op: 'click', nac_id: 'counter.add', args: { expected_tree_version: '<latest.tree_version>' } },
        { op: 'sync' },
        /* frozen tree_version is now stale because sync bumped it */
        { op: 'click', nac_id: 'counter.add', args: { expected_tree_version: '<frozen.tree_version>' } },
        { op: 'describe' },
        { op: 'click', nac_id: 'counter.add', args: { expected_tree_version: '<latest.tree_version>' } },
      ],
    },
    'strict-without-expected': {
      steps: [
        { op: 'strict_on' },
        { op: 'click', nac_id: 'counter.add', args: {} },
        { op: 'strict_off' },
        { op: 'click', nac_id: 'counter.add', args: {} },
      ],
    },
  };
  const plan = dry[stmt.id];
  if (!plan) throw new Error('no dry-run plan for ' + stmt.id);
  return { plan, raw: '<dry-run stub>' };
}

/* ---- executor with substitutions ---- */

function substitute(value, latest, frozen) {
  if (typeof value !== 'string') return value;
  if (value === '<latest.plugin_version>') {
    const cp = (latest.plugins || []).find(p => p.plugin === 'counter');
    return cp && cp.plugin_version;
  }
  if (value === '<latest.tree_version>') return latest.tree_version;
  if (value === '<latest.counter.add.element_state_hash>') {
    const cp = (latest.plugins || []).find(p => p.plugin === 'counter');
    const el = cp && cp.elements.find(e => e.nac_id === 'counter.add');
    return el && el.element_state_hash;
  }
  if (value === '<frozen.plugin_version>' && frozen) {
    const cp = (frozen.plugins || []).find(p => p.plugin === 'counter');
    return cp && cp.plugin_version;
  }
  if (value === '<frozen.tree_version>' && frozen) return frozen.tree_version;
  return value;
}

async function executePlan(page, plan) {
  const results = [];
  let latest = null;
  let frozen = null;
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    try {
      if (step.op === 'describe') {
        latest = await page.evaluate(() => window.NAC.describe());
        if (frozen == null) frozen = latest;
        results.push({ idx: i, op: 'describe', ok: true, snapshot: { tv: latest.tree_version, pv: (latest.plugins.find(p=>p.plugin==='counter')||{}).plugin_version } });
      } else if (step.op === 'click') {
        const args = {};
        for (const k in (step.args || {})) {
          const v = substitute(step.args[k], latest || await page.evaluate(()=>window.NAC.describe()), frozen);
          if (v !== undefined && v !== null) args[k] = v;
        }
        try {
          await page.evaluate(({nac_id, args}) => window.NAC.click(nac_id, args),
            { nac_id: step.nac_id, args: args });
          results.push({ idx: i, op: 'click', nac_id: step.nac_id, args: args, ok: true });
        } catch (e) {
          results.push({ idx: i, op: 'click', nac_id: step.nac_id, args: args, ok: false, code: e.message.match(/code: ([\w_]+)/) && RegExp.$1 || null, error: e.message });
        }
      } else if (step.op === 'sync') {
        await page.evaluate(() => window.NAC.syncPlugin({
          plugin_slug: 'counter',
          verbs: {
            'counter.add':   { role: 'button', action: 'add' },
            'counter.reset': { role: 'button', action: 'reset' },
            'counter.input': { role: 'input' },
          },
        }));
        results.push({ idx: i, op: 'sync', ok: true });
        /* DO NOT refresh `latest` here. The whole point of the
           detect-stale-and-retry scenario is that `<latest.tree_version>`
           should still resolve to the pre-sync snapshot value until the
           planner emits another explicit describe. That way using
           `<latest>` after sync without a re-describe is the canonical
           agent-bug pattern the OCC gate is designed to catch. */
      } else if (step.op === 'strict_on') {
        await page.evaluate(() => { window.NAC.STRICT_VERSIONING = true; });
        results.push({ idx: i, op: 'strict_on', ok: true });
      } else if (step.op === 'strict_off') {
        await page.evaluate(() => { window.NAC.STRICT_VERSIONING = false; });
        results.push({ idx: i, op: 'strict_off', ok: true });
      } else {
        results.push({ idx: i, op: step.op, ok: false, error: 'unknown op' });
      }
    } catch (e) {
      results.push({ idx: i, op: step.op, ok: false, error: e.message });
    }
  }
  return results;
}

/* ---- main ---- */

async function main() {
  log('V24-04 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE);
  log('  base url:', BASE_URL);
  log('  evidence:', EVID_DIR);

  if (PILOT_MODE === 'live' && !process.env.ANTHROPIC_API_KEY) {
    log('CRITICAL: PILOT_MODE=live requires ANTHROPIC_API_KEY'); process.exit(2);
  }

  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) { log('CRITICAL chromium:', e.message); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));

  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) { log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch (e) {
    log('CRITICAL load:', e.message); await browser.close(); process.exit(2);
  }

  await page.waitForFunction(() => window.__v24_04Demo && window.NAC, { timeout: 5000 });
  await page.waitForTimeout(200);

  /* Click register-counter once so the plugin exists for every statement. */
  await page.click('[data-action="register-counter"]');
  await page.waitForTimeout(150);

  const trace = { mode: PILOT_MODE, base_url: BASE_URL, run_date: RUN_DATE, statements: [] };

  for (const stmt of STATEMENTS) {
    log(''); log('========== statement:', stmt.id, '==========');
    log('  text:', stmt.text);

    /* Re-register fresh + reset STRICT so each statement is independent. */
    await page.evaluate(() => { window.NAC.STRICT_VERSIONING = true; });

    let plan;
    try { plan = PILOT_MODE === 'live' ? await planLive(stmt) : planDryRun(stmt); }
    catch (e) { log('  CRITICAL planner:', e.message); failures++; trace.statements.push({ id: stmt.id, error: 'planner:' + e.message }); continue; }
    log('  plan steps:', plan.plan.steps.length);

    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + (r.ok ? ':OK' : ':ERR')).join(', '));

    /* Validation per statement. */
    if (stmt.id === 'snapshot-then-click') {
      const lastClick = [...results].reverse().find(r => r.op === 'click');
      assert(stmt.id + ' last click op present', !!lastClick, results);
      assert(stmt.id + ' last click ok=true (OCC passed)', lastClick && lastClick.ok === true, lastClick);
    }
    if (stmt.id === 'detect-stale-and-retry') {
      const clicks = results.filter(r => r.op === 'click');
      assert(stmt.id + ' at least 2 clicks attempted (initial + retry)', clicks.length >= 2, clicks);
      const someFailed = clicks.some(c => c.ok === false);
      const finalOk = clicks[clicks.length - 1] && clicks[clicks.length - 1].ok === true;
      assert(stmt.id + ' middle click rejected (snapshot_stale)', someFailed, clicks);
      assert(stmt.id + ' final retry succeeded', finalOk, clicks);
    }
    if (stmt.id === 'strict-without-expected') {
      const clicks = results.filter(r => r.op === 'click');
      assert(stmt.id + ' at least 2 clicks', clicks.length >= 2, clicks);
      assert(stmt.id + ' first click (STRICT on, no expected_*) rejected', clicks[0] && clicks[0].ok === false, clicks);
      assert(stmt.id + ' second click (STRICT off, no expected_*) ok', clicks[clicks.length - 1] && clicks[clicks.length - 1].ok === true, clicks);
    }

    const screenshot = path.join(EVID_DIR, stmt.id + '.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    trace.statements.push({
      id: stmt.id, text: stmt.text, expect: stmt.expect,
      plan_raw: plan.raw, plan: plan.plan, results: results,
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
