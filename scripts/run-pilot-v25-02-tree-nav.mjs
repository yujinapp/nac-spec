#!/usr/bin/env node
/* Layer 3 Pilot: V25-02 tree navigation. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-02-tree-nav/index.html';
const PILOT_MODE = (process.env.PILOT_MODE || 'dry-run').toLowerCase();
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-02-tree-nav-pilot', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

const STATEMENTS = [
  {
    id: 'walk-to-leaf',
    text: 'In the "editor" plugin, walk the tree from the menubar down to find ' +
          'the leaf "PDF". Steps: tree(editor, "menubar") to find menu-file. ' +
          'Follow its opens to submenu-file, call tree(editor, "submenu-file") ' +
          'to find action-file.export. Follow its opens to submenu-file.export, ' +
          'call tree(editor, "submenu-file.export") and report the labels of the ' +
          'children.',
    expect: { leaves: ['PDF','Word document','HTML page'] },
  },
  {
    id: 'enumerate-menubar',
    text: 'In the "editor" plugin, list the top-level menu items by calling ' +
          'tree(editor, "menubar"). I need to see for each child the nac_id, ' +
          'the label, and whether it is a leaf (data-nac-leaf) or it opens a ' +
          'submenu (data-nac-opens target).',
    expect: { count: 4, has_leaf: 'menu-help', has_opens: ['menu-file','menu-edit','menu-insert'] },
  },
];

const SYSTEM_PROMPT = `
You are the planner for V25-02 tree navigation on NAC3. Emit a JSON
plan with these op types:

  { "op": "tree", "plugin": "<slug>", "root_id": "<id>" }     // root_id may be omitted to list plugin top-level
  { "op": "context", "plugin": "<slug>" }                     // returns breadcrumb from focused element

The runner returns the result of each call. OUTPUT STRICT:
{ "steps": [...] }. No prose, no fences.
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
    'walk-to-leaf': { steps: [
      { op:'tree', plugin:'editor', root_id:'menubar' },
      { op:'tree', plugin:'editor', root_id:'submenu-file' },
      { op:'tree', plugin:'editor', root_id:'submenu-file.export' },
    ]},
    'enumerate-menubar': { steps: [
      { op:'tree', plugin:'editor', root_id:'menubar' },
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
      if(step.op === 'tree'){
        const v = await page.evaluate(({plugin, rootId}) => window.NAC.tree(plugin, rootId || undefined),
          { plugin: step.plugin, rootId: step.root_id });
        results.push({ idx:i, op:'tree', plugin:step.plugin, root_id:step.root_id, children:v, ok:true });
      } else if(step.op === 'context'){
        const v = await page.evaluate((plugin) => window.NAC.context(plugin), step.plugin);
        results.push({ idx:i, op:'context', plugin:step.plugin, breadcrumb:v.breadcrumb, ok:true });
      } else {
        results.push({ idx:i, op:step.op, ok:false, error:'unknown op' });
      }
    } catch(e){ results.push({ idx:i, op:step.op, ok:false, error:e.message }); }
  }
  return results;
}

async function main(){
  log('V25-02 Layer 3 Pilot driver');
  log('  mode:', PILOT_MODE); log('  base url:', BASE_URL); log('  evidence:', EVID_DIR);
  if(PILOT_MODE==='live' && !process.env.ANTHROPIC_API_KEY){ log('CRITICAL: live needs ANTHROPIC_API_KEY'); process.exit(2); }
  let browser; try{ browser=await chromium.launch({headless:true}); }catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try{ const r=await page.goto(DEMO_URL,{waitUntil:'load',timeout:8000}); if(!r||!r.ok()){log('CRITICAL status',r?r.status():'?'); await browser.close(); process.exit(2);} }
  catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_02Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  const trace = { mode:PILOT_MODE, base_url:BASE_URL, run_date:RUN_DATE, statements: [] };
  for(const stmt of STATEMENTS){
    log(''); log('========== statement:', stmt.id, '=========='); log('  text:', stmt.text);
    let plan;
    try{ plan = PILOT_MODE==='live' ? await planLive(stmt) : planDryRun(stmt); }
    catch(e){ log('  CRITICAL planner:', e.message); failures++; trace.statements.push({id:stmt.id, error:'planner:'+e.message}); continue; }
    log('  plan steps:', plan.plan.steps.length);
    const results = await executePlan(page, plan.plan);
    log('  step outcomes:', results.map(r => r.op + ':' + (r.children?(''+r.children.length+'kids'):(r.breadcrumb?(r.breadcrumb.length+'crumbs'):(r.ok?'OK':'ERR')))).join(', '));

    if(stmt.id === 'walk-to-leaf'){
      const last = results.filter(r => r.op === 'tree').slice(-1)[0];
      const leaves = last && last.children && last.children.map(c => c.label);
      assert(stmt.id+' final leaves == [PDF, Word document, HTML page]',
        JSON.stringify(leaves) === JSON.stringify(['PDF','Word document','HTML page']), { got: leaves });
    }
    if(stmt.id === 'enumerate-menubar'){
      const r = results.find(s => s.op === 'tree' && s.root_id === 'menubar');
      assert(stmt.id+' menubar has 4 children', r && r.children && r.children.length === 4, r);
      const helpItem = r && r.children && r.children.find(c => c.nac_id === 'menu-help');
      assert(stmt.id+' menu-help has leaf=true', helpItem && helpItem.leaf === true, helpItem);
      const opensCount = r && r.children && r.children.filter(c => c.opens).length;
      assert(stmt.id+' 3 children have opens=', opensCount === 3, r && r.children);
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
