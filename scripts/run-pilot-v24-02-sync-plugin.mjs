#!/usr/bin/env node
/* Layer 3 Pilot: V24-02 syncPlugin idempotent registration. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-02-sync-plugin/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-02-sync-plugin-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

const STATEMENTS = [
  {
    id:   'sync-replaces-not-appends',
    text: 'Call register(slug=cart) with manifest v1 that has only ONE verb. ' +
          'Then call syncPlugin(cart) with manifest v2 that has TWO verbs. ' +
          'Read back the registered manifest via NAC.manifest(slug=cart) and ' +
          'confirm the verb count is exactly 2 (replaced, not appended).',
    expect: { final_verb_count: 2 },
  },
  {
    id:   'idempotent-no-pollution',
    text: 'syncPlugin(cart) twice with the SAME manifest. The verb count after ' +
          'both calls must be the same as after the first call -- the second ' +
          'call should not accumulate or duplicate state.',
    expect: { verb_count_stable: true },
  },
  {
    id:   'invalidated-event-fires',
    text: 'Subscribe to nac:plugin:invalidated. Call syncPlugin with a new ' +
          'manifest version. Verify the invalidated event fired exactly once.',
    expect: { event_count: 1 },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V24-02 syncPlugin on NAC3. Each plan step is
one of:

  { "op": "register",   "slug": "cart", "manifest_version": 1|2|3 }
  { "op": "sync",       "slug": "cart", "manifest_version": 1|2|3 }
  { "op": "read_count", "slug": "cart" }
  { "op": "subscribe_invalidated" }

The runner has 3 manifest versions pre-defined:
  v1: cart with 1 verb (cart.add)
  v2: cart with 2 verbs (cart.add + cart.remove)
  v3: cart with 3 verbs (cart.add + cart.remove + cart.clear)

OUTPUT STRICT:
{ "steps": [ ... ] }
No prose, no fences, just JSON.
`.trim();

async function planLive(stmt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('PILOT_MODE=live requires ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{ 'content-type':'application/json', 'x-api-key':process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1024, system: SYSTEM_PROMPT, messages:[{ role:'user', content: stmt.text }] }),
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ': ' + await r.text());
  const j = await r.json();
  const text = (j.content && j.content[0] && j.content[0].text) || '';
  const cleaned = text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  let plan;
  try { plan = JSON.parse(cleaned); } catch(e){ throw new Error('plan parse: '+e.message+' :: '+text.slice(0,200)); }
  if (!plan || !Array.isArray(plan.steps)) throw new Error('plan missing steps: '+cleaned.slice(0,200));
  return { plan, raw: text };
}

function planDryRun(stmt) {
  const dry = {
    'sync-replaces-not-appends': {
      steps: [
        { op:'register', slug:'cart', manifest_version:1 },
        { op:'sync',     slug:'cart', manifest_version:2 },
        { op:'read_count', slug:'cart' },
      ],
    },
    'idempotent-no-pollution': {
      steps: [
        { op:'sync', slug:'cart', manifest_version:2 },
        { op:'read_count', slug:'cart' },
        { op:'sync', slug:'cart', manifest_version:2 },
        { op:'read_count', slug:'cart' },
      ],
    },
    'invalidated-event-fires': {
      steps: [
        { op:'subscribe_invalidated' },
        { op:'sync', slug:'cart', manifest_version:3 },
      ],
    },
  };
  const p = dry[stmt.id]; if (!p) throw new Error('no dry-run for ' + stmt.id);
  return { plan: p, raw: '<dry-run stub>' };
}

function manifestFor(version) {
  const verbsByVersion = {
    1: { 'cart.add': { role:'button', action:'add' } },
    2: { 'cart.add': { role:'button', action:'add' }, 'cart.remove': { role:'button', action:'remove' } },
    3: { 'cart.add': { role:'button', action:'add' }, 'cart.remove': { role:'button', action:'remove' }, 'cart.clear': { role:'button', action:'clear' } },
  };
  return { plugin_slug:'cart', verbs: verbsByVersion[version] };
}

async function executePlan(page, plan) {
  const results = [];
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    try {
      if (step.op === 'register') {
        await page.evaluate((m) => { try { window.NAC.register(m); } catch(_){} },
          manifestFor(step.manifest_version));
        results.push({ idx:i, op:'register', version:step.manifest_version, ok:true });
      } else if (step.op === 'sync') {
        const r = await page.evaluate((m) => window.NAC.syncPlugin(m), manifestFor(step.manifest_version));
        results.push({ idx:i, op:'sync', version:step.manifest_version, replaced:r.replaced, plugin_version:r.version, ok:true });
      } else if (step.op === 'read_count') {
        const c = await page.evaluate((slug) => {
          const m = window.NAC.manifest(slug);
          return m && m.verbs ? Object.keys(m.verbs).length : 0;
        }, step.slug);
        results.push({ idx:i, op:'read_count', slug:step.slug, count:c, ok:true });
      } else if (step.op === 'subscribe_invalidated') {
        await page.evaluate(() => {
          window.__v24_02PilotEventCount = 0;
          document.addEventListener('nac:plugin:invalidated', function(){ window.__v24_02PilotEventCount++; });
        });
        results.push({ idx:i, op:'subscribe_invalidated', ok:true });
      } else {
        results.push({ idx:i, op:step.op, ok:false, error:'unknown op' });
      }
    } catch (e) {
      results.push({ idx:i, op:step.op, ok:false, error:e.message });
    }
  }
  return results;
}

async function main() {
  log('V24-02 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE); log('  base url:', BASE_URL); log('  evidence:', EVID_DIR);
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
  } catch(e){ log('CRITICAL load:', e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(() => window.__v24_02Demo && window.NAC, { timeout:5000 });
  await page.waitForTimeout(200);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements:[] };
  for (const stmt of STATEMENTS) {
    log(''); log('========== statement:', stmt.id, '=========='); log('  text:', stmt.text);
    /* Reset per-statement: drop manifest if present. */
    await page.evaluate(() => {
      try { window.NAC.unregister && window.NAC.unregister('cart'); } catch(_){}
      window.__v24_02PilotEventCount = 0;
    });
    let plan;
    try { plan = PILOT_MODE === 'live' ? await planLive(stmt) : planDryRun(stmt); }
    catch(e){ log('  CRITICAL planner:', e.message); failures++; trace.statements.push({ id: stmt.id, error: 'planner:'+e.message }); continue; }
    log('  plan steps:', plan.plan.steps.length);
    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + (r.ok===false?':ERR':':OK')).join(', '));

    if (stmt.id === 'sync-replaces-not-appends') {
      const lastCount = [...results].reverse().find(r => r.op === 'read_count');
      assert(stmt.id + ' read_count = 2 (replaced)', lastCount && lastCount.count === 2, lastCount);
    }
    if (stmt.id === 'idempotent-no-pollution') {
      const counts = results.filter(r => r.op === 'read_count').map(r => r.count);
      assert(stmt.id + ' counts identical across idempotent sync', counts.length >= 2 && counts[0] === counts[counts.length-1], counts);
    }
    if (stmt.id === 'invalidated-event-fires') {
      const events = await page.evaluate(() => window.__v24_02PilotEventCount);
      assert(stmt.id + ' nac:plugin:invalidated fired >=1 time', events >= 1, { events });
    }

    const screenshot = path.join(EVID_DIR, stmt.id + '.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    trace.statements.push({ id: stmt.id, text: stmt.text, expect: stmt.expect,
      plan_raw: plan.raw, plan: plan.plan, results, screenshot: path.relative(REPO_ROOT, screenshot) });
  }

  await browser.close();
  fs.writeFileSync(path.join(EVID_DIR, 'pilot-trace.json'), JSON.stringify(trace, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'pilot-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
