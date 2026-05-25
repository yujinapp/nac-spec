#!/usr/bin/env node
/* Layer 3 Pilot: V25-03 narrate. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-03-narrate/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-03-narrate-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

const STATEMENTS = [
  {
    id: 'priority-order',
    text: 'For the editor plugin, narrate three buttons and confirm the priority ' +
          'order: btn-save has aria-label "Save document" (highest priority), ' +
          'btn-print has only visible text "Print", and btn-9 has no labels of ' +
          'any kind. Report the narration for each.',
    expect: { 'btn-save':'Save document', 'btn-print':'Print', 'btn-9':'btn-9' },
  },
  {
    id: 'null-on-missing',
    text: 'Call narrate for a nac_id that does not exist in the editor plugin ' +
          '(use "ghost-element"). The runtime should return null. Also call ' +
          'narrate against a plugin slug that is not registered ("no-such-plugin") ' +
          'with any nac_id -- also null.',
    expect: { missing: null, no_plugin: null },
  },
  {
    id: 'nested-children-excluded',
    text: 'In the "editor" plugin, narrate the nac_id "menu-format". That element ' +
          'contains the text "Format" AND a nested addressable child whose nac_id ' +
          'is "menu-format.bold". The narration of "menu-format" MUST be just ' +
          '"Format" -- nested addressable children get excluded so the spoken ' +
          'output stays scoped to the requested node.',
    expect: { 'menu-format': 'Format' },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V25-03 asistive narrate on NAC3. Emit a JSON
plan with one or more "narrate" steps:

  { "op": "narrate", "plugin": "<slug>", "nac_id": "<id>" }

The runner returns the narration for each step. There are no other
ops. OUTPUT STRICT: { "steps": [...] }. No prose, no fences.
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
    'priority-order': { steps: [
      { op:'narrate', plugin:'editor', nac_id:'btn-save' },
      { op:'narrate', plugin:'editor', nac_id:'btn-print' },
      { op:'narrate', plugin:'editor', nac_id:'btn-9' },
    ]},
    'null-on-missing': { steps: [
      { op:'narrate', plugin:'editor', nac_id:'ghost-element' },
      { op:'narrate', plugin:'no-such-plugin', nac_id:'btn-save' },
    ]},
    'nested-children-excluded': { steps: [
      { op:'narrate', plugin:'editor', nac_id:'menu-format' },
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
      if(step.op === 'narrate'){
        const v = await page.evaluate(({plugin, nac_id}) => window.NAC.narrate(plugin, nac_id),
          { plugin: step.plugin, nac_id: step.nac_id });
        results.push({ idx:i, op:'narrate', plugin:step.plugin, nac_id:step.nac_id, label:v, ok:true });
      } else {
        results.push({ idx:i, op:step.op, ok:false, error:'unknown op' });
      }
    } catch(e){ results.push({ idx:i, op:step.op, ok:false, error:e.message }); }
  }
  return results;
}

async function main(){
  log('V25-03 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE); log('  base url:', BASE_URL); log('  evidence:', EVID_DIR);
  if(PILOT_MODE==='live' && !process.env.ANTHROPIC_API_KEY){ log('CRITICAL: live needs ANTHROPIC_API_KEY'); process.exit(2); }
  let browser;
  try{ browser = await chromium.launch({headless:true}); }catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try{
    const r = await page.goto(DEMO_URL,{waitUntil:'load',timeout:8000});
    if(!r||!r.ok()){ log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  }catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_03Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements: [] };
  for(const stmt of STATEMENTS){
    log(''); log('========== statement:', stmt.id, '=========='); log('  text:', stmt.text);
    let plan;
    try{ plan = PILOT_MODE==='live' ? await planLive(stmt) : planDryRun(stmt); }
    catch(e){ log('  CRITICAL planner:', e.message); failures++; trace.statements.push({id:stmt.id, error:'planner:'+e.message}); continue; }
    log('  plan steps:', plan.plan.steps.length);
    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + ':' + (r.label !== undefined ? JSON.stringify(r.label) : (r.ok?'OK':'ERR'))).join(', '));

    if(stmt.id === 'priority-order'){
      const map = {}; results.forEach(r => map[r.nac_id] = r.label);
      assert(stmt.id+' btn-save aria-label wins',  map['btn-save'] === 'Save document', map);
      assert(stmt.id+' btn-print visible text',    map['btn-print'] === 'Print', map);
      assert(stmt.id+' btn-9 nac_id fallback',     map['btn-9'] === 'btn-9', map);
    }
    if(stmt.id === 'null-on-missing'){
      const missing  = results.find(r => r.nac_id === 'ghost-element');
      const noPlugin = results.find(r => r.plugin === 'no-such-plugin');
      assert(stmt.id+' missing nac_id -> null', missing && missing.label === null, missing);
      assert(stmt.id+' missing plugin -> null', noPlugin && noPlugin.label === null, noPlugin);
    }
    if(stmt.id === 'nested-children-excluded'){
      const r = results.find(s => s.nac_id === 'menu-format');
      assert(stmt.id+' "Format" only (nested Bold excluded)', r && r.label === 'Format', r);
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
