#!/usr/bin/env node
/* Layer 2: V25-02 tree navigation. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-02-tree-nav/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-02-tree-nav', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

async function main(){
  log('V25-02 tree-nav Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);
  let browser; try{ browser=await chromium.launch({headless:true}); }catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try{ const r=await page.goto(DEMO_URL,{waitUntil:'load',timeout:8000}); if(!r||!r.ok()){log('CRITICAL status',r?r.status():'?'); await browser.close(); process.exit(2);} }
  catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_02Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  /* 1: tree at plugin root -- only direct addressable children of [data-nac-plugin] */
  log(''); log('--- scenario 1: tree(editor) returns top-level descendants ---');
  await page.click('[data-action="tree-root"]');
  await page.waitForTimeout(80);
  let t = await page.evaluate(()=>window.__v25_02Demo.trees.root);
  /* Top-level: menubar + submenu-file + submenu-file.export + submenu-edit + submenu-insert + submenu-insert.table
     are all immediate (none nested under another nac-id). Should be 6 entries. */
  assert('tree(editor) returns 6 top-level entries', t && t.length === 6, t && t.map(e => e.nac_id));
  const slugs = t.map(e => e.nac_id);
  assert('tree(editor) includes menubar', slugs.includes('menubar'), slugs);
  assert('tree(editor) includes all 5 submenus', ['submenu-file','submenu-edit','submenu-insert','submenu-file.export','submenu-insert.table'].every(s => slugs.includes(s)), slugs);
  await page.screenshot({path:path.join(EVID_DIR,'01-tree-root.png'),fullPage:true});

  /* 2: tree(menubar) -- immediate kids: 4 menu items */
  log(''); log('--- scenario 2: tree(editor, menubar) ---');
  await page.click('[data-action="tree-menubar"]');
  await page.waitForTimeout(80);
  t = await page.evaluate(()=>window.__v25_02Demo.trees.menubar);
  assert('tree(menubar) returns 4 menu items', t && t.length === 4, t);
  assert('menu-file has opens=submenu-file', t && t.find(e=>e.nac_id==='menu-file').opens === 'submenu-file', t);
  assert('menu-help has leaf=true', t && t.find(e=>e.nac_id==='menu-help').leaf === true, t);
  assert('menu-file label resolved via narrate', t && t.find(e=>e.nac_id==='menu-file').label === 'File', t);
  await page.screenshot({path:path.join(EVID_DIR,'02-tree-menubar.png'),fullPage:true});

  /* 3: tree(submenu-file) -- 4 actions */
  log(''); log('--- scenario 3: tree(editor, submenu-file) ---');
  await page.click('[data-action="tree-file"]');
  await page.waitForTimeout(80);
  t = await page.evaluate(()=>window.__v25_02Demo.trees['submenu-file']);
  assert('tree(submenu-file) returns 4 actions', t && t.length === 4, t);
  const exportAction = t && t.find(e=>e.nac_id==='action-file.export');
  assert('action-file.export has opens=submenu-file.export', exportAction && exportAction.opens === 'submenu-file.export', exportAction);
  const saveAction = t && t.find(e=>e.nac_id==='action-file.save');
  assert('action-file.save label uses aria-label "Save document"', saveAction && saveAction.label === 'Save document', saveAction);
  await page.screenshot({path:path.join(EVID_DIR,'03-tree-file.png'),fullPage:true});

  /* 4: tree(submenu-file.export) -- 3 leaves */
  log(''); log('--- scenario 4: tree(editor, submenu-file.export) ---');
  await page.click('[data-action="tree-export"]');
  await page.waitForTimeout(80);
  t = await page.evaluate(()=>window.__v25_02Demo.trees['submenu-export']);
  assert('tree(submenu-file.export) returns 3 leaves', t && t.length === 3, t);
  assert('all 3 are leaf=true', t && t.every(e => e.leaf === true), t);
  await page.screenshot({path:path.join(EVID_DIR,'04-tree-export.png'),fullPage:true});

  /* 5: tree of a leaf -- empty */
  log(''); log('--- scenario 5: tree of a leaf returns [] ---');
  await page.click('[data-action="tree-leaf"]');
  await page.waitForTimeout(80);
  t = await page.evaluate(()=>window.__v25_02Demo.trees['leaf-empty']);
  assert('tree(action-file.new) returns []', Array.isArray(t) && t.length === 0, t);

  /* 6: unknown rootId -- empty */
  log(''); log('--- scenario 6: tree of unknown rootId returns [] ---');
  await page.click('[data-action="tree-bad"]');
  await page.waitForTimeout(80);
  t = await page.evaluate(()=>window.__v25_02Demo.trees['bad-empty']);
  assert('tree(no-such-id) returns []', Array.isArray(t) && t.length === 0, t);

  /* 7: context() with no focus -- empty breadcrumb */
  log(''); log('--- scenario 7: context() with no focus inside plugin ---');
  /* Focus body to force activeElement out of the plugin. */
  await page.evaluate(()=> document.body.focus());
  await page.click('[data-action="context-after-focus"]');
  await page.waitForTimeout(80);
  let ctx = await page.evaluate(()=>window.__v25_02Demo.context);
  assert('context with no focus -> empty breadcrumb', ctx && Array.isArray(ctx.breadcrumb) && ctx.breadcrumb.length === 0, ctx);

  /* 8: context() with deep focus.
     Open the submenu first (display:none elements cannot be focused),
     then call NAC.click() which both focuses + fires the lifecycle.
     The button has data-nac-id="action-export.pdf" registered via the
     demo's plugin so click() works against it. */
  log(''); log('--- scenario 8: context() with deep focus (action-export.pdf) ---');
  await page.evaluate(() => {
    document.getElementById('submenu-file').classList.add('open');
    document.getElementById('submenu-file.export').classList.add('open');
    document.querySelector('[data-nac-id="action-export.pdf"]').focus();
  });
  ctx = await page.evaluate(() => window.NAC.context('editor'));
  await page.evaluate((c) => { window.__v25_02Demo.context = c; }, ctx);
  /* The breadcrumb should include the chain: submenu-file.export -> action-export.pdf
     (the submenu-file.export wrapper is a sibling, not an ancestor of action-export.pdf,
     because both submenus are flat children of plugin-root. The PARENT chain of
     action-export.pdf is: submenu-file.export -- which IS a nac-id ancestor).
     So expected breadcrumb: [submenu-file.export, action-export.pdf]. */
  assert('context breadcrumb has at least 1 level', ctx && ctx.breadcrumb.length >= 1, ctx);
  const lastCrumb = ctx && ctx.breadcrumb[ctx.breadcrumb.length-1];
  assert('last crumb is action-export.pdf', lastCrumb && lastCrumb.nac_id === 'action-export.pdf', lastCrumb);
  assert('action-export.pdf label resolved to "PDF"', lastCrumb && lastCrumb.label === 'PDF', lastCrumb);
  await page.screenshot({path:path.join(EVID_DIR,'05-context-focused.png'),fullPage:true});

  /* 9: opens-chain semantic check via tree+narrate composition */
  log(''); log('--- scenario 9: opens-chain walks via tree() composition ---');
  /* Start at menubar, find menu-file (opens=submenu-file), call tree(submenu-file),
     find action-file.export (opens=submenu-file.export), call tree(submenu-file.export). */
  const chain = await page.evaluate(() => {
    const lvl1 = window.NAC.tree('editor', 'menubar');
    const file = lvl1.find(e => e.nac_id === 'menu-file');
    const lvl2 = window.NAC.tree('editor', file.opens);
    const exp = lvl2.find(e => e.nac_id === 'action-file.export');
    const lvl3 = window.NAC.tree('editor', exp.opens);
    return { lvl1_count: lvl1.length, lvl2_count: lvl2.length, lvl3_count: lvl3.length,
             leaves: lvl3.map(e => e.label) };
  });
  assert('opens-chain lvl1 = 4', chain.lvl1_count === 4, chain);
  assert('opens-chain lvl2 = 4', chain.lvl2_count === 4, chain);
  assert('opens-chain lvl3 = 3', chain.lvl3_count === 3, chain);
  assert('opens-chain leaf labels = [PDF, Word document, HTML page]',
    JSON.stringify(chain.leaves) === JSON.stringify(['PDF','Word document','HTML page']), chain);
  await page.screenshot({path:path.join(EVID_DIR,'06-opens-chain.png'),fullPage:true});

  const finalState = await page.evaluate(()=>window.__v25_02Demo);
  fs.writeFileSync(path.join(EVID_DIR,'run-log.json'), JSON.stringify({base_url:BASE_URL,demo_url:DEMO_URL,run_date:RUN_DATE,failures,final_state:finalState}, null, 2));
  fs.writeFileSync(path.join(EVID_DIR,'run-log.txt'), log_lines.join('\n')+'\n\nFAILURES: '+failures+'\n');
  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e=>{ log('UNCAUGHT:',e.message,e.stack); process.exit(2); });
