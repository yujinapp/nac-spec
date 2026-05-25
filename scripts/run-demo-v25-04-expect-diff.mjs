#!/usr/bin/env node
/* Layer 2: V25-04 expect + diff. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-04-expect-diff/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-04-expect-diff', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

async function main(){
  log('V25-04 expect+diff Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);
  let browser; try{ browser=await chromium.launch({headless:true}); }catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:820}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try{ const r=await page.goto(DEMO_URL,{waitUntil:'load',timeout:8000}); if(!r||!r.ok()){log('CRITICAL status',r?r.status():'?'); await browser.close(); process.exit(2);} }
  catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_04Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  /* 1: expect resolves immediately when state already matches */
  log(''); log('--- scenario 1: expect resolves immediately if state matches ---');
  await page.click('[data-action="expect-7-now"]');
  await page.waitForFunction(() => window.__v25_04Demo.expects.find(e=>e.label==='value-7-now'), {timeout: 2000});
  let e1 = await page.evaluate(()=>window.__v25_04Demo.expects.find(e=>e.label==='value-7-now'));
  assert('expect-7-now resolved ok',     e1 && e1.ok === true, e1);
  assert('expect-7-now value === 7',     e1 && e1.value === 7, e1);
  assert('expect-7-now duration < 200ms', e1 && e1.duration_ms < 200, e1);
  await page.screenshot({path:path.join(EVID_DIR,'01-expect-immediate.png'),fullPage:true});

  /* 2: expect resolves after delayed mutation */
  log(''); log('--- scenario 2: expect resolves after delayed mutation (500ms) ---');
  await page.click('[data-action="expect-7-delayed"]');
  await page.waitForFunction(() => window.__v25_04Demo.expects.find(e=>e.label==='value-7-delayed'), {timeout: 3500});
  const e2 = await page.evaluate(()=>window.__v25_04Demo.expects.find(e=>e.label==='value-7-delayed'));
  assert('expect-7-delayed resolved ok',           e2 && e2.ok === true, e2);
  assert('expect-7-delayed value === 7',           e2 && e2.value === 7, e2);
  assert('expect-7-delayed duration ~ 500-1000ms', e2 && e2.duration_ms >= 450 && e2.duration_ms < 1500, e2);
  await page.screenshot({path:path.join(EVID_DIR,'02-expect-delayed.png'),fullPage:true});

  /* 3: expect times out when state never matches */
  log(''); log('--- scenario 3: expect times out (state stays at 3) ---');
  await page.click('[data-action="expect-7-timeout"]');
  await page.waitForFunction(() => window.__v25_04Demo.expects.find(e=>e.label==='value-7-timeout'), {timeout: 2000});
  const e3 = await page.evaluate(()=>window.__v25_04Demo.expects.find(e=>e.label==='value-7-timeout'));
  assert('expect-7-timeout failed', e3 && e3.ok === false, e3);
  assert('expect-7-timeout code = timeout', e3 && e3.error_code === 'timeout', e3);
  assert('expect-7-timeout duration ~ 300ms', e3 && e3.duration_ms >= 280 && e3.duration_ms < 600, e3);
  await page.screenshot({path:path.join(EVID_DIR,'03-expect-timeout.png'),fullPage:true});

  /* 4: expect on bool state */
  log(''); log('--- scenario 4: expect(bold, true) after delay ---');
  await page.click('[data-action="expect-bold-true"]');
  await page.waitForFunction(() => window.__v25_04Demo.expects.find(e=>e.label==='bold-true-delayed'), {timeout: 3500});
  const e4 = await page.evaluate(()=>window.__v25_04Demo.expects.find(e=>e.label==='bold-true-delayed'));
  assert('expect-bold-true resolved', e4 && e4.ok === true, e4);
  assert('expect-bold-true value === true', e4 && e4.value === true, e4);
  await page.screenshot({path:path.join(EVID_DIR,'04-expect-bool.png'),fullPage:true});

  /* 5: diff detects change */
  log(''); log('--- scenario 5: diff captures before/after change ---');
  await page.click('[data-action="diff-set-7"]');
  await page.waitForFunction(() => window.__v25_04Demo.diffs.find(d=>d.label==='diff-set-7'), {timeout: 2000});
  const d5 = await page.evaluate(()=>window.__v25_04Demo.diffs.find(d=>d.label==='diff-set-7'));
  assert('diff-set-7 before === 0', d5 && d5.before === 0, d5);
  assert('diff-set-7 after === 7',  d5 && d5.after === 7, d5);
  assert('diff-set-7 changed === true', d5 && d5.changed === true, d5);
  await page.screenshot({path:path.join(EVID_DIR,'05-diff-change.png'),fullPage:true});

  /* 6: diff with no-op action -> changed:false */
  log(''); log('--- scenario 6: diff with no-op action -> changed:false ---');
  await page.click('[data-action="diff-noop"]');
  await page.waitForFunction(() => window.__v25_04Demo.diffs.find(d=>d.label==='diff-noop'), {timeout: 2000});
  const d6 = await page.evaluate(()=>window.__v25_04Demo.diffs.find(d=>d.label==='diff-noop'));
  assert('diff-noop before === after', d6 && d6.before === d6.after, d6);
  assert('diff-noop changed === false', d6 && d6.changed === false, d6);
  await page.screenshot({path:path.join(EVID_DIR,'06-diff-noop.png'),fullPage:true});

  /* 7: diff captures multi-step action endpoints (not the intermediate steps) */
  log(''); log('--- scenario 7: diff captures only START and END of multi-step ---');
  await page.click('[data-action="diff-multistep"]');
  await page.waitForFunction(() => window.__v25_04Demo.diffs.find(d=>d.label==='diff-multistep'), {timeout: 2000});
  const d7 = await page.evaluate(()=>window.__v25_04Demo.diffs.find(d=>d.label==='diff-multistep'));
  assert('diff-multistep before === 0', d7 && d7.before === 0, d7);
  assert('diff-multistep after === 3 (final state)', d7 && d7.after === 3, d7);
  assert('diff-multistep changed === true', d7 && d7.changed === true, d7);
  await page.screenshot({path:path.join(EVID_DIR,'07-diff-multistep.png'),fullPage:true});

  const finalState = await page.evaluate(()=>window.__v25_04Demo);
  fs.writeFileSync(path.join(EVID_DIR,'run-log.json'), JSON.stringify({base_url:BASE_URL,demo_url:DEMO_URL,run_date:RUN_DATE,failures,final_state:finalState}, null, 2));
  fs.writeFileSync(path.join(EVID_DIR,'run-log.txt'), log_lines.join('\n')+'\n\nFAILURES: '+failures+'\n');
  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e=>{ log('UNCAUGHT:',e.message,e.stack); process.exit(2); });
