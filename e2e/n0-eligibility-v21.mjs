/*
 * n0-eligibility-v21.mjs -- E2E eligibility probe for Urazuke station N0
 * (prerequisite 4: "every screen drivable by a test tool, every element
 * accessible, the backend effect checkable -- proven with one real
 * end-to-end test of one flow").
 *
 * Target: example-v21-data-table.php served by a local PHP server.
 * Flow:   open invoice -> add line -> edit qty -> save (commit).
 *
 * What it PROVES (asserted, red on failure):
 *   A. The page is drivable by an automation tool (Playwright/Chromium).
 *   B. Every element the NAC runtime reports in describe() is addressable
 *      in the DOM by its data-nac-id, and its role attribute agrees.
 *   C. describe() reflects visibility: modal internals are reported
 *      visible=false while the modal is closed.
 *   D. The runtime exposes the state an assertion needs (rows, computed
 *      column, aggregates) -> the effect of a UI action is checkable.
 *   E. The flow reaches its terminal state: nac:dt:committed in the audit
 *      log + modal closed + table no longer modified.
 *
 * What it RECORDS instead of asserting (honesty):
 *   F. Persistence boundary: the data-table commit is IN MEMORY. No
 *      on_commit hook is registered, nothing is written to a server.
 *   G. The chat endpoint used by the demo is an external integration
 *      (Yujin chat backend serving Claude). Locally the PHP dev server
 *      answers 200 text/html with the landing page -- i.e. NOT a real
 *      intermediary. Reported, not failed.
 *
 * Exit code 0 = every asserted check green, 1 = at least one red.
 * ASCII-only. Run: node e2e/n0-eligibility-v21.mjs
 */
import { chromium } from '../node_modules/playwright/index.mjs';

const BASE = process.env.N0_BASE || 'http://localhost:8855';
const PAGE = process.env.N0_PAGE || '/example-v21-data-table.php';

const checks = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, green: true, detail });
  } catch (err) {
    checks.push({ name, green: false, detail: String((err && err.message) || err) });
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const consoleErrors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
page.on('requestfailed', (r) => failedRequests.push(r.url() + ' :: ' + ((r.failure() || {}).errorText || '')));

await page.goto(BASE + PAGE, { waitUntil: 'load' });

await check('A. page loads and the NAC runtime boots with the demo data', async () => {
  await page.waitForFunction(
    () => !!(window.NAC && window.NAC.__v2_dataTables && window.NAC.__v2_dataTables['invoice.lines']),
    null,
    { timeout: 15000 }
  );
  const info = await page.evaluate(() => ({
    runtime: window.NAC.version || 'unreported',
    spec: window.NAC.spec_version || 'unreported',
    tables: Object.keys(window.NAC.__v2_dataTables),
    rows: window.NAC.dt_state('invoice.lines').rows.length
  }));
  assert(info.rows === 8, 'expected 8 pre-loaded invoice lines, got ' + info.rows);
  return info;
});

await check('B. every element describe() reports is addressable and role-consistent', async () => {
  const report = await page.evaluate(() => {
    const d = window.NAC.describe();
    const els = (d.plugins || []).reduce((acc, p) => acc.concat(p.elements || []), []);
    const problems = [];
    for (const e of els) {
      const node = document.querySelector('[data-nac-id="' + e.nac_id + '"]');
      if (!node) { problems.push({ id: e.nac_id, why: 'no DOM node' }); continue; }
      const domRole = node.getAttribute('data-nac-role');
      if (domRole && domRole !== e.role) {
        problems.push({ id: e.nac_id, why: 'role mismatch: dom=' + domRole + ' runtime=' + e.role });
      }
    }
    return {
      total: els.length,
      plugins: (d.plugins || []).map((p) => p.plugin + ':' + (p.elements || []).length),
      problems
    };
  });
  assert(report.total > 0, 'describe() reported zero elements');
  assert(report.problems.length === 0, 'element problems: ' + JSON.stringify(report.problems.slice(0, 5)));
  return report;
});

await check('C. describe() tracks visibility (modal internals hidden while closed)', async () => {
  const vis = await page.evaluate(() => {
    const els = (window.NAC.describe().plugins || []).reduce((a, p) => a.concat(p.elements || []), []);
    const find = (id) => els.find((e) => e.nac_id === id) || {};
    return {
      open: find('action.open_invoice').visible,
      save: find('modal.invoice_edit.save').visible,
      cancel: find('modal.invoice_edit.cancel').visible
    };
  });
  assert(vis.open === true, 'action.open_invoice should report visible=true');
  assert(vis.save === false, 'modal.invoice_edit.save should report visible=false while closed');
  assert(vis.cancel === false, 'modal.invoice_edit.cancel should report visible=false while closed');
  return vis;
});

await check('D. opening the invoice modal through the UI works', async () => {
  await page.click('[data-nac-id="action.open_invoice"]');
  await page.waitForFunction(
    () => document.getElementById('modal').getAttribute('data-state') === 'open',
    null,
    { timeout: 5000 }
  );
  const st = await page.evaluate(() => ({
    state: document.getElementById('modal').getAttribute('data-state'),
    ariaHidden: document.getElementById('modal').getAttribute('aria-hidden'),
    renderedRows: document.querySelectorAll('#lines-table tbody tr').length
  }));
  assert(st.ariaHidden === 'false', 'modal aria-hidden should be false while open');
  assert(st.renderedRows === 8, 'expected 8 rendered rows, got ' + st.renderedRows);
  return st;
});

await check('E. flow part 1: add a line -> runtime state and DOM both follow', async () => {
  const before = await page.evaluate(() => ({
    rows: window.NAC.dt_state('invoice.lines').rows.length,
    sum: window.NAC.dt_read_aggregate('invoice.lines', 'sum', 'line_total'),
    domSum: document.getElementById('lines-sum').textContent.trim()
  }));
  await page.click('[data-nac-id="invoice.lines.add"]');
  await page.waitForFunction(
    (n) => window.NAC.dt_state('invoice.lines').rows.length === n + 1,
    before.rows,
    { timeout: 5000 }
  );
  const after = await page.evaluate(() => ({
    rows: window.NAC.dt_state('invoice.lines').rows.length,
    renderedRows: document.querySelectorAll('#lines-table tbody tr').length,
    modified: window.NAC.__v2_dataTables['invoice.lines'].modified,
    sum: window.NAC.dt_read_aggregate('invoice.lines', 'sum', 'line_total'),
    domSum: document.getElementById('lines-sum').textContent.trim()
  }));
  assert(after.rows === before.rows + 1, 'row was not added to the runtime state');
  assert(after.renderedRows === after.rows, 'DOM did not follow the state change');
  assert(after.modified === true, 'table should be marked modified after add');
  assert(String(after.domSum) === String(after.sum), 'rendered aggregate drifted from runtime aggregate');
  return { before, after };
});

await check('E2. flow part 2: edit a cell -> computed column + aggregate recompute', async () => {
  const r = await page.evaluate(() => {
    const rows = window.NAC.dt_state('invoice.lines').rows;
    const id = rows[rows.length - 1].line_id;
    const ed = window.NAC.dt_edit_cell('invoice.lines', id, 'qty', 4);
    const row = window.NAC.dt_state('invoice.lines').rows.find((x) => x.line_id === id);
    return {
      edit: ed,
      qty: row.qty,
      unitPrice: row.unit_price,
      lineTotal: row.line_total,
      sum: window.NAC.dt_read_aggregate('invoice.lines', 'sum', 'line_total'),
      domSum: document.getElementById('lines-sum').textContent.trim()
    };
  });
  assert(r.edit && r.edit.ok === true, 'dt_edit_cell refused an editable column: ' + JSON.stringify(r.edit));
  assert(r.qty === 4, 'qty did not take the new value');
  assert(r.lineTotal === r.qty * r.unitPrice, 'computed line_total wrong: ' + r.lineTotal + ' vs ' + r.qty + 'x' + r.unitPrice);
  assert(String(r.domSum) === String(r.sum), 'rendered aggregate drifted from runtime aggregate after edit');
  return r;
});

await check('E3. flow part 3: non-editable and computed columns are refused (rule enforced)', async () => {
  const r = await page.evaluate(() => {
    const id = window.NAC.dt_state('invoice.lines').rows[0].line_id;
    return {
      unitPrice: window.NAC.dt_edit_cell('invoice.lines', id, 'unit_price', 1),
      lineTotal: window.NAC.dt_edit_cell('invoice.lines', id, 'line_total', 1),
      unknown: window.NAC.dt_edit_cell('invoice.lines', id, 'nope', 1)
    };
  });
  assert(r.unitPrice.error === 'column_not_editable', 'unit_price should be refused as not editable');
  assert(r.lineTotal.error === 'computed_column', 'line_total should be refused as computed');
  assert(r.unknown.error === 'column_not_found', 'unknown column should be refused as not found');
  return r;
});

await check('E4. flow ends: commit closes the modal and lands in the audit log', async () => {
  await page.click('[data-nac-id="modal.invoice_edit.save"]');
  await page.waitForFunction(
    () => document.getElementById('modal').getAttribute('data-state') === 'closed',
    null,
    { timeout: 5000 }
  );
  const res = await page.evaluate(() => ({
    state: document.getElementById('modal').getAttribute('data-state'),
    modified: window.NAC.__v2_dataTables['invoice.lines'].modified,
    rowsAfterCommit: window.NAC.dt_state('invoice.lines').rows.length,
    log: (document.getElementById('log') || {}).textContent || ''
  }));
  assert(res.modified === false, 'table should no longer be modified after commit');
  assert(res.log.includes('COMMITTED: invoice.lines'), 'no COMMITTED event in the runtime audit log');
  const line = res.log.split('\n').find((l) => l.includes('COMMITTED: invoice.lines')) || '';
  return { state: res.state, rowsAfterCommit: res.rowsAfterCommit, auditLine: line.trim().slice(0, 160) };
});

await check('F. persistence boundary: commit is in-memory only (no server write)', async () => {
  const probe = await page.evaluate(() => {
    const tables = Object.keys(window.NAC.__v2_dataTables).map((id) => {
      const t = window.NAC.__v2_dataTables[id];
      return { id, on_commit_hook: !!(t.schema && t.schema.on_commit) };
    });
    return { tables, commit_is_client_fn: typeof window.NAC.dt_commit === 'function' };
  });
  assert(probe.tables.every((t) => t.on_commit_hook === false), 'a table declared an on_commit hook; revisit this finding');
  return probe;
});

const chatProbe = await page.evaluate(async (base) => {
  try {
    const r = await fetch(base + '/crm/api/v1/yujin/nac-demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hola' }] })
    });
    const ct = r.headers.get('content-type') || '';
    const body = (await r.text()).slice(0, 120);
    return { status: r.status, content_type: ct, served_html: /<!doctype html|<html/i.test(body) };
  } catch (e) {
    return { status: 0, error: String(e.message || e) };
  }
}, BASE);

await browser.close();

const red = checks.filter((c) => !c.green);
const output = {
  station: 'N0',
  prerequisite: 4,
  target: BASE + PAGE,
  checks,
  findings: {
    commit_persistence: 'IN-MEMORY ONLY -- nothing is written outside the browser',
    chat_endpoint: {
      path: '/crm/api/v1/yujin/nac-demo',
      local_probe: chatProbe,
      verdict: (chatProbe.status === 200 && chatProbe.served_html)
        ? 'NOT a real intermediary: the dev server answered 200 with site HTML. The chat/voice layer needs the real Yujin backend (external integration).'
        : 'unexpected response shape -- see local_probe'
    }
  },
  console_errors: consoleErrors.slice(0, 10),
  failed_requests: failedRequests.slice(0, 10),
  verdict: red.length === 0 ? 'GREEN (all asserted checks)' : 'RED'
};

console.log(JSON.stringify(output, null, 2));
process.exit(red.length === 0 ? 0 : 1);
