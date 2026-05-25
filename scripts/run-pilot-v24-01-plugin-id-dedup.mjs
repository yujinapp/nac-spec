#!/usr/bin/env node
/* Layer 3 Pilot: V24-01 plugin slug uniqueness gate. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v24-01-plugin-id-dedup/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v24-01-plugin-id-dedup-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines = [];
function log(...a){ const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l); }
let failures = 0;
function assert(n,ok,d){ if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');} }

const STATEMENTS = [
  {
    id:   'detect-and-recover',
    text: 'A multi-instance plugin slug has been mounted in the DOM with two ' +
          'roots that LACK data-nac-plugin-id (a violation per V24-01). Your ' +
          'task: 1) run validate_global to detect the violation, 2) confirm ' +
          'the plugin_instance_violations bucket has >=1 finding, 3) then ' +
          'clean up the violation surface and re-validate -- the bucket must ' +
          'now be empty.',
    expect: { detected: true, cleaned: true },
  },
  {
    id:   'register-throws-on-violation',
    text: 'The DOM has TWO cart roots without data-nac-plugin-id. Call ' +
          'register(slug=cart). It MUST throw with code ' +
          'duplicate_plugin_no_instance_id -- you should not be allowed to ' +
          'register a plugin whose mounted instances violate the uniqueness ' +
          'rule.',
    expect: { register_throws: true },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V24-01 plugin slug uniqueness gate on NAC3.
Each plan step is one of:

  { "op": "inject_violation" }            // adds 2 cart roots without IDs
  { "op": "cleanup_violation" }           // removes them
  { "op": "register",   "slug": "cart" }  // attempts NAC.register({plugin_slug})
  { "op": "validate" }                    // calls NAC.validate_global()
  { "op": "read_violations" }             // reads validate_global().plugin_instance_violations

OUTPUT STRICT: { "steps": [ ... ] } -- no prose, no fences.
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
    'detect-and-recover': {
      steps: [
        { op:'inject_violation' },
        { op:'read_violations' },
        { op:'cleanup_violation' },
        { op:'read_violations' },
      ],
    },
    'register-throws-on-violation': {
      steps: [
        { op:'inject_violation' },
        { op:'register', slug:'cart' },
      ],
    },
  };
  const p = dry[stmt.id]; if (!p) throw new Error('no dry-run for '+stmt.id);
  return { plan: p, raw:'<dry-run stub>' };
}

async function executePlan(page, plan) {
  const results = [];
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    try {
      if (step.op === 'inject_violation') {
        await page.evaluate(() => {
          const zone = document.getElementById('violation-zone');
          while (zone.children.length > 0) zone.removeChild(zone.firstChild);
          for (let j = 0; j < 2; j++) {
            const d = document.createElement('div');
            d.className = 'plugin-root';
            d.setAttribute('data-nac-plugin', 'cart');
            zone.appendChild(d);
          }
        });
        results.push({ idx:i, op:'inject_violation', ok:true });
      } else if (step.op === 'cleanup_violation') {
        await page.evaluate(() => {
          const zone = document.getElementById('violation-zone');
          while (zone.children.length > 0) zone.removeChild(zone.firstChild);
        });
        results.push({ idx:i, op:'cleanup_violation', ok:true });
      } else if (step.op === 'register') {
        /* Catch INSIDE evaluate so we keep .code which is lost across
           the Playwright serialization boundary. */
        const r = await page.evaluate((slug) => {
          try {
            window.NAC.register({
              plugin_slug: slug,
              verbs: { add: { role:'button', action:'add' } },
            });
            return { ok: true };
          } catch (e) {
            return { ok: false, code: e.code || null, message: e.message };
          }
        }, step.slug);
        results.push({ idx:i, op:'register', slug:step.slug, ok: r.ok, code: r.code, error: r.message });
      } else if (step.op === 'validate' || step.op === 'read_violations') {
        const v = await page.evaluate(() => {
          const r = window.NAC.validate_global();
          return (r && r.plugin_instance_violations) || [];
        });
        results.push({ idx:i, op:step.op, violations_count: v.length, ok:true, violations: v });
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
  log('V24-01 Layer 3 Pilot driver');
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
  await page.waitForFunction(() => window.__v24_01Demo && window.NAC, { timeout:5000 });
  await page.waitForTimeout(200);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements:[] };
  for (const stmt of STATEMENTS) {
    log(''); log('========== statement:', stmt.id, '=========='); log('  text:', stmt.text);
    /* Reset violation zone between statements. */
    await page.evaluate(() => {
      const zone = document.getElementById('violation-zone');
      while (zone && zone.children.length > 0) zone.removeChild(zone.firstChild);
    });

    let plan;
    try { plan = PILOT_MODE === 'live' ? await planLive(stmt) : planDryRun(stmt); }
    catch(e){ log('  CRITICAL planner:', e.message); failures++; trace.statements.push({ id: stmt.id, error: 'planner:'+e.message }); continue; }
    log('  plan steps:', plan.plan.steps.length);
    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + (r.ok===false?':ERR':':OK')).join(', '));

    if (stmt.id === 'detect-and-recover') {
      const violations = results.filter(r => r.op === 'read_violations' || r.op === 'validate');
      assert(stmt.id + ' at least 2 validate calls', violations.length >= 2, violations);
      const first = violations[0], last = violations[violations.length-1];
      assert(stmt.id + ' first validate detected violation (>=1)', first && first.violations_count >= 1, first);
      assert(stmt.id + ' last validate clean (0 violations)',      last  && last.violations_count === 0, last);
    }
    if (stmt.id === 'register-throws-on-violation') {
      const reg = results.find(r => r.op === 'register');
      assert(stmt.id + ' register rejected', reg && reg.ok === false, reg);
      assert(stmt.id + ' code = duplicate_plugin_no_instance_id', reg && reg.code === 'duplicate_plugin_no_instance_id', reg);
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
