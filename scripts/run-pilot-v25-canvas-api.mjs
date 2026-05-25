#!/usr/bin/env node
/**
 * Layer 3 Pilot driver: V25-01 canvas+API plugin extension.
 *
 * Feeds high-complexity natural-language statements through Claude
 * (Anthropic API), parses the response into a sequence of
 * NAC.call / NAC.read / NAC.subscribe invocations, dispatches each
 * via Playwright against the live demo, and validates the final
 * canvas state matches the statement's intent.
 *
 * This is the Pilot-driven Layer 3 evidence gate per PROJECT.md
 * sec 3.1. It complements Layer 2 (run-demo-v25-canvas-api.mjs)
 * which exercises every backend deterministically; Layer 3 exercises
 * the *plan-and-execute* loop an agent uses in production.
 *
 * Modes (env PILOT_MODE):
 *   dry-run     (default) -- use stub planner instead of real Claude;
 *                            no API spend, full driver harness runs.
 *   live        -- call ANTHROPIC_API_KEY against claude-sonnet-4-6.
 *                  Requires explicit Pablo OK per "no defensive
 *                  pre-launch" memory: real-money actions need it.
 *
 * Cost model (live mode):
 *   - System prompt: ~3 KB (about 800 input tokens once per statement).
 *   - Plan response: ~1 KB (about 250 output tokens).
 *   - Per statement: ~0.005 USD at claude-sonnet-4-6 pricing.
 *   - Per RFC demo (5 statements): ~0.025 USD.
 *   - Replicating for all 5 SHIPPED RFCs: ~0.125 USD total.
 *
 * Exit codes:
 *   0  -- every statement's final state matched intent
 *   1  -- one or more statements failed validation
 *   2  -- harness error (Anthropic API unreachable, plan parse failed, etc)
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-canvas-api/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0, 10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-canvas-api-pilot', RUN_DATE);
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

/* ---------- statement catalog ----------
   Each statement is a high-complexity natural-language instruction.
   `expect` is a programmatic predicate the runner uses to validate
   the FINAL canvas state after the Pilot executes the plan. */

const STATEMENTS = [
  {
    id:   'add-and-highlight',
    text: 'Reset the counter, then add seven to it, then turn the highlight on. ' +
          'After that, tell me the current value and whether it is highlighted.',
    expect: { value: 7, highlighted: true },
  },
  {
    id:   'compound-math',
    text: 'Make sure the counter is at zero. Add three. Add two more. Then add one. ' +
          'Verify the highlight is off, and report the final value.',
    expect: { value: 6, highlighted: false },
  },
  {
    id:   'silent-damage-check',
    text: 'Reset the counter, add four, then immediately ask the canvas itself ' +
          '(round-trip) what it thinks the value is, to confirm the host-side ' +
          'view matches the canvas-side view. Highlight stays as it is.',
    expect: { value: 4 /* highlighted not asserted */ },
  },
  {
    id:   'mistake-recovery',
    text: 'Reset the counter. Add one. Realize that was wrong, reset again. ' +
          'Now add ten and confirm the value.',
    expect: { value: 10 },
  },
];

/* ---------- vocabulary that the planner is given ---------- */

const VOCABULARY = {
  plugin: 'counter-canvas',
  verbs: [
    { verb: 'counter.reset',        args: 'none' },
    { verb: 'counter.increment',    args: '{ by: number }' },
    { verb: 'counter.sdk-add',      args: 'number (positional)' },
    { verb: 'counter.highlight',    args: '{ on: boolean }' },
    { verb: 'counter.fetch-state',  args: 'none; returns {Values:{value,highlighted}}' },
  ],
  state: [
    { path: 'counter.value',           shape: 'number' },
    { path: 'counter.highlighted',     shape: 'boolean' },
    { path: 'counter.value-fallback',  shape: 'number (demonstrates fallback chain)' },
  ],
  events: [
    { path: 'counter.changed',   payload: '{ MessageId, Values:{value,delta} }' },
    { path: 'counter.derived',   payload: '{ "counter.value": number }' },
  ],
};

/* ---------- planner ---------- */

const SYSTEM_PROMPT = `
You are the planner half of a NAC3 Pilot agent. The user gives you a
natural-language instruction to perform on a canvas+API surface. You
have one and only one tool: emit a JSON object with a "steps" array.
Each step is one of:

  { "op": "call",  "verb": "<verb-path>", "args": <arg-object-or-number-or-null> }
  { "op": "read",  "state": "<state-path>" }

The runner will execute the steps in order against the live NAC3 v2.5
plugin. After running, it will compare the final canvas state against
the user's intent.

VOCABULARY (the only verbs/state paths that exist on plugin "counter-canvas"):

VERBS:
${VOCABULARY.verbs.map(v => '  - ' + v.verb + '  args: ' + v.args).join('\n')}

STATE PATHS:
${VOCABULARY.state.map(s => '  - ' + s.path + '  shape: ' + s.shape).join('\n')}

Rules:
- Output ONLY a JSON object, no prose.
- Steps run in order, sequentially. Each call awaits before the next step.
- counter.increment is fire-and-forget postMessage; the canvas-side
  value updates asynchronously. If you need to read AFTER an increment
  and want the ground truth, prefer counter.fetch-state (script-bridge
  round-trip) over counter.value (same-origin-window) because the
  bridge reply is processed after pending postmessage in the iframe.
- counter.reset, counter.sdk-add are synchronous sdk-call wrappers.
- Do not hallucinate verbs. If the user asks for something the
  vocabulary cannot express, emit a steps array that does as much as
  possible and end with a final read.

OUTPUT SHAPE:
{ "steps": [ {...}, {...}, ... ] }
`.trim();

async function planLive(statement) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('PILOT_MODE=live requires ANTHROPIC_API_KEY env');
  }
  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: statement.text }],
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error('Anthropic API ' + r.status + ': ' + errText);
  }
  const j = await r.json();
  const text = (j.content && j.content[0] && j.content[0].text) || '';
  /* Defensive: strip optional ```json fences if the model adds them. */
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  let plan;
  try { plan = JSON.parse(cleaned); }
  catch (e) { throw new Error('plan parse: ' + e.message + ' :: ' + text.slice(0, 200)); }
  if (!plan || !Array.isArray(plan.steps)) {
    throw new Error('plan missing steps array: ' + cleaned.slice(0, 200));
  }
  return { plan, raw: text };
}

/* ---------- dry-run planner ----------
   Hand-coded plans matching each statement's intent. Lets the harness
   prove the executor + asserts wiring work end-to-end with zero API
   spend before flipping to live mode. */
function planDryRun(statement) {
  const dryPlans = {
    'add-and-highlight': {
      steps: [
        { op: 'call', verb: 'counter.reset',     args: null },
        { op: 'call', verb: 'counter.increment', args: { by: 7 } },
        { op: 'call', verb: 'counter.highlight', args: { on: true } },
        { op: 'call', verb: 'counter.fetch-state', args: null },
        { op: 'read', state: 'counter.value' },
        { op: 'read', state: 'counter.highlighted' },
      ],
    },
    'compound-math': {
      steps: [
        { op: 'call', verb: 'counter.reset',     args: null },
        { op: 'call', verb: 'counter.increment', args: { by: 3 } },
        { op: 'call', verb: 'counter.increment', args: { by: 2 } },
        { op: 'call', verb: 'counter.increment', args: { by: 1 } },
        { op: 'call', verb: 'counter.highlight', args: { on: false } },
        { op: 'call', verb: 'counter.fetch-state', args: null },
        { op: 'read', state: 'counter.value' },
        { op: 'read', state: 'counter.highlighted' },
      ],
    },
    'silent-damage-check': {
      steps: [
        { op: 'call', verb: 'counter.reset',     args: null },
        { op: 'call', verb: 'counter.increment', args: { by: 4 } },
        { op: 'call', verb: 'counter.fetch-state', args: null },
        { op: 'read', state: 'counter.value' },
      ],
    },
    'mistake-recovery': {
      steps: [
        { op: 'call', verb: 'counter.reset',     args: null },
        { op: 'call', verb: 'counter.increment', args: { by: 1 } },
        { op: 'call', verb: 'counter.reset',     args: null },
        { op: 'call', verb: 'counter.increment', args: { by: 10 } },
        { op: 'call', verb: 'counter.fetch-state', args: null },
        { op: 'read', state: 'counter.value' },
      ],
    },
  };
  const plan = dryPlans[statement.id];
  if (!plan) throw new Error('no dry-run plan for statement: ' + statement.id);
  return { plan, raw: '<dry-run stub>' };
}

/* ---------- executor ---------- */

async function executePlan(page, plan) {
  const results = [];
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    try {
      if (step.op === 'call') {
        const r = await page.evaluate(
          ({ verb, args }) => window.NAC.call('counter-canvas', verb, args),
          { verb: step.verb, args: step.args }
        );
        results.push({ idx: i, op: step.op, verb: step.verb, args: step.args, ok: true, result: r });
      } else if (step.op === 'read') {
        const r = await page.evaluate(
          (state) => window.NAC.read('counter-canvas', state),
          step.state
        );
        results.push({ idx: i, op: step.op, state: step.state, ok: true, result: r });
      } else {
        results.push({ idx: i, op: step.op, ok: false, error: 'unknown op' });
      }
    } catch (e) {
      results.push({ idx: i, op: step.op, ok: false, error: e.message });
    }
  }
  return results;
}

async function readFinalState(page) {
  return await page.evaluate(async () => {
    const v  = await window.NAC.read('counter-canvas', 'counter.value');
    const hi = await window.NAC.read('counter-canvas', 'counter.highlighted');
    return { value: v, highlighted: hi };
  });
}

/* ---------- main ---------- */

async function main() {
  log('V25-01 Layer 3 Pilot driver');
  log('  base url   ', BASE_URL);
  log('  mode       ', PILOT_MODE);
  log('  evidence   ', EVID_DIR);

  if (PILOT_MODE === 'live' && !process.env.ANTHROPIC_API_KEY) {
    log('CRITICAL: PILOT_MODE=live but ANTHROPIC_API_KEY not set');
    process.exit(2);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    log('CRITICAL: failed to launch chromium:', e.message);
    process.exit(2);
  }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', msg => { if (msg.type() === 'error') log('  page-console-error:', msg.text()); });
  page.on('pageerror', err => log('  page-error:', err.message));

  try {
    const r = await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 8000 });
    if (!r || !r.ok()) {
      log('CRITICAL: demo page returned status', r ? r.status() : 'no response');
      await browser.close();
      process.exit(2);
    }
  } catch (e) {
    log('CRITICAL: failed to load demo:', e.message);
    log('  hint: run `python -m http.server 8855` from', REPO_ROOT);
    await browser.close();
    process.exit(2);
  }

  await page.waitForFunction(
    () => window.__v25Demo && window.__v25Demo.iframe_ready === true,
    { timeout: 5000 }
  );
  await page.waitForTimeout(200);

  const trace = {
    mode:       PILOT_MODE,
    base_url:   BASE_URL,
    run_date:   RUN_DATE,
    statements: [],
  };

  for (const stmt of STATEMENTS) {
    log('');
    log('========== statement:', stmt.id, '==========');
    log('  text:', stmt.text);

    /* Reset the canvas before each statement so they are independent. */
    await page.evaluate(() => window.NAC.call('counter-canvas', 'counter.reset'));
    await page.waitForTimeout(150);

    let planResult;
    try {
      planResult = PILOT_MODE === 'live' ? await planLive(stmt) : planDryRun(stmt);
    } catch (e) {
      log('  CRITICAL: planner failed:', e.message);
      failures++;
      trace.statements.push({ id: stmt.id, error: 'planner: ' + e.message });
      continue;
    }
    log('  plan steps:', planResult.plan.steps.length);

    const results = await executePlan(page, planResult.plan);
    const finalState = await readFinalState(page);
    log('  final state:', JSON.stringify(finalState));

    /* Validate against the expectation. */
    const valueOk = (stmt.expect.value == null) || (finalState.value === stmt.expect.value);
    const hiOk    = (stmt.expect.highlighted == null) || (finalState.highlighted === stmt.expect.highlighted);
    assert(stmt.id + ' value matches intent (' + JSON.stringify(stmt.expect.value) + ')',     valueOk, finalState);
    if (stmt.expect.highlighted != null) {
      assert(stmt.id + ' highlighted matches intent (' + stmt.expect.highlighted + ')', hiOk, finalState);
    }
    /* Every step should have executed without error. */
    const stepErrors = results.filter(r => !r.ok);
    assert(stmt.id + ' all plan steps executed (' + results.length + ' steps)',
      stepErrors.length === 0, stepErrors);

    /* Screenshot per statement. */
    const screenshotPath = path.join(EVID_DIR, stmt.id + '.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    trace.statements.push({
      id:           stmt.id,
      text:         stmt.text,
      expect:       stmt.expect,
      plan_raw:     planResult.raw,
      plan:         planResult.plan,
      results:      results,
      final_state:  finalState,
      value_ok:     valueOk,
      highlighted_ok: hiOk,
      screenshot:   path.relative(REPO_ROOT, screenshotPath),
    });
  }

  await browser.close();

  fs.writeFileSync(path.join(EVID_DIR, 'pilot-trace.json'), JSON.stringify(trace, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'pilot-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');

  log('');
  log('===========================================');
  log('  mode:    ', PILOT_MODE);
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
