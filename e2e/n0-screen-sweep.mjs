/*
 * n0-screen-sweep.mjs -- Urazuke N0, prerequisite 4 (inventory half).
 * Loads every operating screen of the system and measures, mechanically:
 *   - does the NAC runtime boot there?
 *   - how many elements does the manifest report, and how many are
 *     addressable in the DOM by data-nac-id?
 *   - how many interactive elements (button/input/select/a) carry NO
 *     data-nac-id -> the accessibility gap a test tool would hit.
 *   - console errors on load.
 *
 * It does not judge; it produces the raw table used by docs/ELIGIBILITY.md.
 * ASCII-only. Run: node e2e/n0-screen-sweep.mjs
 */
import { chromium } from '../node_modules/playwright/index.mjs';

const BASE = process.env.N0_BASE || 'http://localhost:8855';

const PAGES = [
  ['public site', 'index.html'],
  ['public site', 'peer-reviews.html'],
  ['public site', 'SPEC.html'],
  ['public site', 'ABOUT.html'],
  ['public site', 'SECURITY.html'],
  ['public site', 'CONTRIBUTING.html'],
  ['public site', 'README_DEMOS.html'],
  ['public site', 'benchmark/index.html'],
  ['public site', 'benchmark/methodology.html'],
  ['public site', 'benchmark/results.html'],
  ['case study', 'conduit/index.html'],
  ['case study', 'migration/index.html'],
  ['case study', 'migration/methodology.html'],
  ['case study', 'migration/results.html'],
  ['case study', 'migration/byte-diff.html'],
  ['case study', 'migration/demos/calc-raw/index.html'],
  ['case study', 'migration/demos/calc-forge-silent/index.html'],
  ['case study', 'migration/demos/calc-forge-assisted/index.html'],
  ['case study', 'migration/demos/calc-sumi-manual/index.html'],
  ['demo', 'demos/index.html'],
  ['demo', 'demos/react/index.html'],
  ['demo', 'demos/angular/index.html'],
  ['demo', 'demos/v24-01-plugin-id-dedup/index.html'],
  ['demo', 'demos/v24-02-sync-plugin/index.html'],
  ['demo', 'demos/v24-04-snapshot-versioning/index.html'],
  ['demo', 'demos/v24-05-authority-sudo/index.html'],
  ['demo', 'demos/v25-02-tree-nav/index.html'],
  ['demo', 'demos/v25-03-narrate/index.html'],
  ['demo', 'demos/v25-04-expect-diff/index.html'],
  ['demo', 'demos/v25-canvas-api/index.html'],
  ['adopter demo', 'ads-demo/index.html'],
  ['adopter demo', 'ads-demo/atlas-pro/index.html'],
  ['reference demo', 'example.php'],
  ['reference demo', 'example-v13.php'],
  ['reference demo', 'example-v20-primitives-showcase.php'],
  ['reference demo', 'example-v20-full.php'],
  ['reference demo', 'example-v20-page-a.php'],
  ['reference demo', 'example-v20-page-b.php'],
  ['reference demo', 'example-v21-data-table.php'],
  ['reference demo', 'example-v22-interop.php'],
  ['reference demo', 'example-v23-editor.php'],
  ['reference demo', 'example-v23-shadow-open.php'],
  ['reference demo', 'example-v23-shadow-closed.php'],
  ['reference demo', 'example-v24-disambiguation.php'],
  ['reference demo', 'example-navmap.php'],
  ['manual/tool', 'docs/TESTER_CHECKLIST_VISUAL.interactive.html'],
  ['manual/tool', 'docs/TESTER_CHECKLIST_VOICE_CHAT.interactive.html'],
  ['manual/tool', 'docs/HUMAN_OK_CHECKLIST_TESTER.interactive.html'],
  ['manual/tool', 'docs/tester-reports-admin.html'],
  ['manual/tool', 'docs/TEST_COVERAGE_MATRIX.html'],
  ['manual/tool', 'docs/NAC_TEST_MANUAL.html']
];

const browser = await chromium.launch({ headless: true });
const rows = [];

for (const [group, rel] of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 120)));

  let status = 0;
  try {
    const resp = await page.goto(BASE + '/' + rel, { waitUntil: 'load', timeout: 20000 });
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(1200);
    const m = await page.evaluate(() => {
      const hasNac = !!(window.NAC && typeof window.NAC.describe === 'function');
      let reported = 0;
      let addressable = 0;
      if (hasNac) {
        try {
          const els = (window.NAC.describe().plugins || []).reduce((a, p) => a.concat(p.elements || []), []);
          reported = els.length;
          addressable = els.filter((e) => document.querySelector('[data-nac-id="' + e.nac_id + '"]')).length;
        } catch (e) { /* reported stays 0 */ }
      }
      const interactive = [...document.querySelectorAll('button, input, select, textarea, a[href]')];
      const interactiveReal = interactive.filter((el) => el.type !== 'hidden');
      const unmarked = interactiveReal.filter((el) => !el.getAttribute('data-nac-id')).length;
      return {
        title: (document.title || '').slice(0, 70),
        hasNac, reported, addressable,
        interactive: interactiveReal.length,
        unmarked
      };
    });
    rows.push({ group, page: rel, status, nac: m.hasNac, reported: m.reported, addressable: m.addressable, interactive: m.interactive, unmarked: m.unmarked, errors: errors.length, note: (errors[0] || '').slice(0, 80) });
  } catch (e) {
    rows.push({ group, page: rel, status: 0, nac: false, reported: 0, addressable: 0, interactive: 0, unmarked: 0, errors: errors.length, note: 'LOAD FAILED: ' + String(e.message || e).slice(0, 80) });
  }
  await ctx.close();
}

await browser.close();

const summary = {
  pages: rows.length,
  loaded_ok: rows.filter((r) => r.status === 200).length,
  with_nac: rows.filter((r) => r.nac).length,
  fully_addressable: rows.filter((r) => r.nac && r.addressable === r.reported).length,
  with_console_errors: rows.filter((r) => r.errors > 0).length,
  unmarked_interactive_total: rows.reduce((a, r) => a + r.unmarked, 0)
};

/* The output is cited by docs/EVIDENCE_N0.md, so it dates itself: an
   undated measurement cannot be told apart from a current one, and this
   file ages the moment any page gains or loses a data-nac-id. */
let head = 'unknown';
let tree = 'unknown';
try {
  const { execSync } = await import('node:child_process');
  head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  /* A measurement of a dirty tree is not a measurement of that commit.
     Say which one it was, instead of letting the sha imply the wrong thing.
     Its own output files do not count: the shell truncates them before this
     runs, so including them would make every run report 'dirty' and the flag
     would stop meaning anything. */
  const OWN_OUTPUT = ['e2e/sweep.json', 'e2e/sweep.err'];
  const dirty = execSync('git status --porcelain', { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((l) => l.slice(3).trim())
    .filter((f) => f && !OWN_OUTPUT.includes(f));
  tree = dirty.length ? 'dirty' : 'clean';
} catch (_) { /* not a git checkout -- say so rather than guess */ }

console.log(JSON.stringify({
  measured_at: new Date().toISOString(),
  measured_at_commit: head,
  tree: tree,
  base: BASE,
  summary,
  rows
}, null, 1));
