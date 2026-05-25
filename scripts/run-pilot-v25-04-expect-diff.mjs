#!/usr/bin/env node
/* Layer 3 Pilot: V25-04 expect + diff. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-04-expect-diff/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-04-expect-diff-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

const STATEMENTS = [
  {
    id: 'wait-for-effect',
    text: 'In the "canvas" plugin the state "canvas.value" can be set via the ' +
          'host-side window.canvasApp.set(n) function. Schedule a deferred set ' +
          '(canvasApp.set(9) after 400ms) and then use NAC.expect to wait until ' +
          'canvas.value reaches 9, with a timeout of 2000ms. Report the resolved ' +
          'value.',
    expect: { final_value: 9 },
  },
  {
    id: 'detect-silent-damage',
    text: 'In the "canvas" plugin, use NAC.diff to verify that calling ' +
          'canvasApp.set(5) really changed canvas.value. The expected outcome ' +
          'is {before: 0, after: 5, changed: true}. Reset first via ' +
          'canvasApp.set(0) so the before snapshot is 0.',
    expect: { before: 0, after: 5, changed: true },
  },
  {
    id: 'noop-detection',
    text: 'In the "canvas" plugin, prove that a no-op action does NOT change ' +
          'state. Set canvas.value to 11. Then use diff with an action that ' +
          'does nothing. Verify changed is false.',
    expect: { changed: false },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V25-04 effect detection on NAC3. Emit a JSON
plan with these op types:

  { "op": "set",     "value": <number> }                                 // canvasApp.set(n) host call
  { "op": "set_after","value": <number>, "delay_ms": <number> }          // canvasApp.set(n) after delay
  { "op": "expect",  "state_path": "canvas.value", "value": <number>, "timeout_ms"?: <ms> }
  { "op": "diff",    "state_path": "canvas.value", "action_value": <number>|null }
                              // action_value=null means no-op; non-null means call canvasApp.set(action_value)
  { "op": "read",    "state_path": "canvas.value" }

OUTPUT STRICT: { "steps": [...] }. No prose, no fences.
`.trim();

async function planLive(stmt){
  if(!process.env.ANTHROPIC_API_KEY) throw new Error('PILOT_MODE=live requires ANTHROPIC_API_KEY');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:1024, system:SYSTEM_PROMPT, messages:[{role:'user',content:stmt.text}] }),
  });
  if(!r.ok) throw new Error('Anthropic '+r.status+': '+await r.text());
  const j = await r.json();
  const text = (j.content&&j.content[0]&&j.content[0].text)||'';
  const cleaned = text.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
  let plan; try{plan=JSON.parse(cleaned);}catch(e){throw new Error('plan parse: '+e.message+' :: '+text.slice(0,200));}
  if(!plan||!Array.isArray(plan.steps)) throw new Error('plan missing steps: '+cleaned.slice(0,200));
  return { plan, raw:text };
}
function planDryRun(stmt){
  const dry = {
    'wait-for-effect': { steps: [
      { op:'set_after', value:9, delay_ms:400 },
      { op:'expect', state_path:'canvas.value', value:9, timeout_ms:2000 },
    ]},
    'detect-silent-damage': { steps: [
      { op:'set', value:0 },
      { op:'diff', state_path:'canvas.value', action_value:5 },
    ]},
    'noop-detection': { steps: [
      { op:'set', value:11 },
      { op:'diff', state_path:'canvas.value', action_value:null },
    ]},
  };
  const p = dry[stmt.id]; if(!p) throw new Error('no dry-run for '+stmt.id);
  return { plan:p, raw:'<dry-run stub>' };
}

async function executePlan(page, plan){
  const results = [];
  for(let i=0;i<plan.steps.length;i++){
    const step = plan.steps[i];
    try {
      if(step.op === 'set'){
        await page.evaluate((v)=>window.canvasApp.set(v), step.value);
        results.push({ idx:i, op:'set', value:step.value, ok:true });
      } else if(step.op === 'set_after'){
        /* Fire-and-forget schedule a setTimeout in the page. */
        await page.evaluate(({v, d}) => { setTimeout(() => window.canvasApp.set(v), d); }, {v: step.value, d: step.delay_ms});
        results.push({ idx:i, op:'set_after', value:step.value, delay_ms:step.delay_ms, ok:true });
      } else if(step.op === 'expect'){
        const t0 = Date.now();
        try {
          const r = await page.evaluate(({sp, v, t}) => window.NAC.expect('canvas', sp, v, { timeout_ms: t || 5000 }),
            { sp: step.state_path, v: step.value, t: step.timeout_ms });
          results.push({ idx:i, op:'expect', state_path:step.state_path, want:step.value, resolved:r, ok:true, duration_ms: Date.now()-t0 });
        } catch (e) {
          results.push({ idx:i, op:'expect', state_path:step.state_path, want:step.value, ok:false, error:e.message, duration_ms: Date.now()-t0 });
        }
      } else if(step.op === 'diff'){
        const r = await page.evaluate(({sp, av}) => {
          const actionFn = (av == null) ? () => {} : () => window.canvasApp.set(av);
          return window.NAC.diff('canvas', sp, actionFn);
        }, { sp: step.state_path, av: step.action_value });
        results.push({ idx:i, op:'diff', state_path:step.state_path, action_value:step.action_value, ...r, ok:true });
      } else if(step.op === 'read'){
        const v = await page.evaluate((sp)=>window.NAC.read('canvas', sp), step.state_path);
        results.push({ idx:i, op:'read', state_path:step.state_path, value:v, ok:true });
      } else {
        results.push({ idx:i, op:step.op, ok:false, error:'unknown op' });
      }
    } catch(e){ results.push({ idx:i, op:step.op, ok:false, error:e.message }); }
  }
  return results;
}

async function main(){
  log('V25-04 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE); log('  base url:', BASE_URL); log('  evidence:', EVID_DIR);
  if(PILOT_MODE==='live' && !process.env.ANTHROPIC_API_KEY){ log('CRITICAL: live needs ANTHROPIC_API_KEY'); process.exit(2); }
  let browser; try{ browser=await chromium.launch({headless:true}); }catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try{ const r=await page.goto(DEMO_URL,{waitUntil:'load',timeout:8000}); if(!r||!r.ok()){log('CRITICAL status',r?r.status():'?'); await browser.close(); process.exit(2);} }
  catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_04Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements: [] };
  for(const stmt of STATEMENTS){
    log(''); log('========== statement:', stmt.id, '=========='); log('  text:', stmt.text);
    /* Reset canvas between statements. */
    await page.evaluate(() => window.canvasApp.set(0));
    let plan;
    try{ plan = PILOT_MODE==='live' ? await planLive(stmt) : planDryRun(stmt); }
    catch(e){ log('  CRITICAL planner:', e.message); failures++; trace.statements.push({id:stmt.id, error:'planner:'+e.message}); continue; }
    log('  plan steps:', plan.plan.steps.length);
    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + ':' + (r.ok?'OK':'ERR')).join(', '));

    if(stmt.id === 'wait-for-effect'){
      const exp = results.find(r => r.op === 'expect');
      assert(stmt.id+' expect resolved', exp && exp.ok === true, exp);
      assert(stmt.id+' expect.resolved === 9', exp && exp.resolved === 9, exp);
    }
    if(stmt.id === 'detect-silent-damage'){
      const d = results.find(r => r.op === 'diff');
      assert(stmt.id+' diff.before === 0', d && d.before === 0, d);
      assert(stmt.id+' diff.after === 5',  d && d.after === 5, d);
      assert(stmt.id+' diff.changed === true', d && d.changed === true, d);
    }
    if(stmt.id === 'noop-detection'){
      const d = results.find(r => r.op === 'diff');
      assert(stmt.id+' diff.changed === false', d && d.changed === false, d);
      assert(stmt.id+' diff.before === diff.after', d && d.before === d.after, d);
    }
    const screenshot = path.join(EVID_DIR, stmt.id+'.png');
    await page.screenshot({ path:screenshot, fullPage:true });
    trace.statements.push({ id:stmt.id, text:stmt.text, expect:stmt.expect, plan_raw:plan.raw, plan:plan.plan, results, screenshot: path.relative(REPO_ROOT, screenshot) });
  }
  await browser.close();
  fs.writeFileSync(path.join(EVID_DIR,'pilot-trace.json'), JSON.stringify(trace,null,2));
  fs.writeFileSync(path.join(EVID_DIR,'pilot-log.txt'), log_lines.join('\n')+'\n\nFAILURES: '+failures+'\n');
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e=>{ log('UNCAUGHT:',e.message,e.stack); process.exit(2); });
