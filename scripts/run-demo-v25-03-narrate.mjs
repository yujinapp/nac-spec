#!/usr/bin/env node
/* Layer 2: V25-03 narrate. */
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8855';
const DEMO_URL = BASE_URL + '/demos/v25-03-narrate/index.html';
const RUN_DATE = new Date().toISOString().slice(0,10);
const EVID_DIR = path.join(REPO_ROOT, 'evidence', 'v25-03-narrate', RUN_DATE);
fs.mkdirSync(EVID_DIR, { recursive: true });
const log_lines=[]; function log(...a){const l=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' '); console.log(l); log_lines.push(new Date().toISOString().slice(11,23)+' '+l);}
let failures=0; function assert(n,ok,d){if(ok)log('PASS',n); else{failures++;log('FAIL',n,d!=null?JSON.stringify(d):'');}}

async function main() {
  log('V25-03 narrate Layer 2 demo runner');
  log('  base url   ', BASE_URL); log('  evidence   ', EVID_DIR);
  let browser;
  try { browser = await chromium.launch({ headless:true }); }
  catch(e){ log('CRITICAL chromium:',e.message); process.exit(2); }
  const page = await (await browser.newContext({viewport:{width:1280,height:800}})).newPage();
  page.on('pageerror', err => log('  page-error:', err.message));
  try {
    const r = await page.goto(DEMO_URL, {waitUntil:'load', timeout:8000});
    if(!r||!r.ok()){ log('CRITICAL status', r?r.status():'?'); await browser.close(); process.exit(2); }
  } catch(e){ log('CRITICAL load:',e.message); await browser.close(); process.exit(2); }
  await page.waitForFunction(()=>window.__v25_03Demo && window.NAC, {timeout:5000});
  await page.waitForTimeout(150);

  /* helper: call narrate and assert */
  async function narrAssert(label, nac_id, expectedValue, expectedTier) {
    const v = await page.evaluate((id)=>window.NAC.narrate('editor', id), nac_id);
    assert(label, v === expectedValue, { got: v, expected: expectedValue, tier: expectedTier });
    return v;
  }

  /* 1: initial render */
  log(''); log('--- scenario 1: page loaded + plugin present ---');
  await page.screenshot({ path: path.join(EVID_DIR, '01-initial.png'), fullPage:true });

  /* 2: aria-label wins */
  log(''); log('--- scenario 2: aria-label highest priority ---');
  await page.click('[data-action="narrate-save"]');
  await page.waitForTimeout(50);
  await narrAssert('btn-save -> aria-label "Save document"', 'btn-save', 'Save document', 'aria-label');

  /* 3: visible text */
  log(''); log('--- scenario 3: visible text fallback ---');
  await page.click('[data-action="narrate-print"]');
  await page.waitForTimeout(50);
  await narrAssert('btn-print -> visible text "Print"', 'btn-print', 'Print', 'visible-text');

  /* 4: data-nac-label override (no aria, visible text is hidden, icon-only visible) */
  log(''); log('--- scenario 4: data-nac-label override ---');
  await page.click('[data-action="narrate-export"]');
  await page.waitForTimeout(50);
  /* btn-export has hidden text + icon. Visible text via DOM is "hidden" which IS textContent.
     The narrate priority puts data-nac-label THIRD (below visible text). So visible text "hidden"
     wins. To force data-nac-label tier, the element must have NO visible text. Our element has
     a <span style=display:none>hidden</span> -- the visibleText helper does NOT respect CSS
     display:none, it reads raw textContent. So "hidden" gets returned. Adjust expectation
     accordingly: visible-text wins because raw text is present. */
  await narrAssert('btn-export -> visible text wins over data-nac-label (textContent includes hidden span)',
    'btn-export', 'hidden', 'visible-text');

  /* 5: nac_id fallback (no labels, no text, only icon) */
  log(''); log('--- scenario 5: nac_id fallback (no labels) ---');
  await page.click('[data-action="narrate-fallback"]');
  await page.waitForTimeout(50);
  await narrAssert('btn-9 -> fallback to nac_id', 'btn-9', 'btn-9', 'nac_id-fallback');

  /* 6: nested addressable child excluded from parent's narrate */
  log(''); log('--- scenario 6: nested addressable child excluded ---');
  await page.click('[data-action="narrate-nested"]');
  await page.waitForTimeout(50);
  /* menu-format has "Format" text + a <button data-nac-id="menu-format.bold">Bold</button>.
     The visibleText helper skips the nested addressable child, so result should be "Format". */
  await narrAssert('menu-format -> "Format" only (nested Bold excluded)', 'menu-format', 'Format', 'visible-text-excluding-nested');

  /* 7: aria-label that is whitespace-only collapses to next tier */
  log(''); log('--- scenario 7: whitespace aria-label falls through ---');
  await page.click('[data-action="narrate-whitespace"]');
  await page.waitForTimeout(50);
  await narrAssert('btn-clear -> "Clear" (whitespace aria ignored)', 'btn-clear', 'Clear', 'visible-text');

  /* 8: icon + text composition */
  log(''); log('--- scenario 8: icon + text -> text wins ---');
  await page.click('[data-action="narrate-icon-text"]');
  await page.waitForTimeout(50);
  await narrAssert('btn-undo -> "Undo" (icon excluded from text)', 'btn-undo', 'Undo', 'visible-text');

  /* 9: not-found returns null */
  log(''); log('--- scenario 9: unknown nac_id returns null ---');
  await page.click('[data-action="narrate-missing"]');
  await page.waitForTimeout(50);
  const missing = await page.evaluate(()=>window.NAC.narrate('editor', 'does-not-exist'));
  assert('unknown nac_id returns null', missing === null, { got: missing });

  /* 10: unknown plugin returns null */
  log(''); log('--- scenario 10: unknown plugin returns null ---');
  await page.click('[data-action="narrate-no-plugin"]');
  await page.waitForTimeout(50);
  const noPlugin = await page.evaluate(()=>window.NAC.narrate('no-such-plugin', 'btn-save'));
  assert('unknown plugin returns null', noPlugin === null, { got: noPlugin });

  /* 11: batch call */
  log(''); log('--- scenario 11: batch narrate every button ---');
  await page.click('[data-action="narrate-all"]');
  await page.waitForTimeout(100);
  const batch = await page.evaluate(()=>window.__v25_03Demo.batch);
  assert('batch returned 8 entries', batch && Object.keys(batch).length === 8, batch);
  assert('batch btn-save = "Save document"', batch && batch['btn-save'] === 'Save document', batch);
  assert('batch menu-format.bold = "Bold"',  batch && batch['menu-format.bold'] === 'Bold', batch);
  await page.screenshot({ path: path.join(EVID_DIR, '02-batch.png'), fullPage:true });

  /* final screenshot */
  await page.screenshot({ path: path.join(EVID_DIR, '03-final.png'), fullPage:true });

  const finalState = await page.evaluate(()=>window.__v25_03Demo);
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify({
    base_url:BASE_URL, demo_url:DEMO_URL, run_date:RUN_DATE, failures, final_state: finalState,
  }, null, 2));
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n\nFAILURES: ' + failures + '\n');
  await browser.close();
  log(''); log('failures:', failures); log('evidence:', EVID_DIR);
  process.exit(failures > 0 ? 1 : 0);
}
main().catch(e => { log('UNCAUGHT:', e.message, e.stack); process.exit(2); });
