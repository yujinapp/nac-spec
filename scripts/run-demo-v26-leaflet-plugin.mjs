#!/usr/bin/env node
/**
 * Layer 2 demo runner: V26-01 plugin extension hooks against a REAL
 * third-party library.
 *
 * WHY THIS ONE IS DIFFERENT from run-demo-v25-canvas-api.mjs. That
 * runner drives a target WE wrote: an iframe mock that answers the way
 * our manifest says it should. This one drives Leaflet 1.9.4, which we
 * do not control, did not write, and cannot adjust if the contract
 * does not fit. Everything asserted below is checked TWICE where it
 * can be: once through the protocol (NAC.read / NAC.subscribe) and
 * once against the library's own API (map.getCenter / map.getZoom), so
 * a pass means the effect happened in the APP and not merely in our
 * own bookkeeping.
 *
 * It serves the repository itself over a local HTTP server, so there
 * is no step for a human to run first. Leaflet comes from unpkg with a
 * pinned SRI hash: no network, no run -- and the runner says so
 * instead of reporting a green it did not measure.
 *
 * Evidence: evidence/v26-leaflet-plugin/<YYYY-MM-DD>/*.png + run-log.{json,txt}
 *
 * Exit codes:
 *   0 -- every assertion passed
 *   1 -- one or more assertions failed
 *   2 -- harness error (no browser, no network, page never booted)
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RUN_DATE  = new Date().toISOString().slice(0, 10);
const EVID_DIR  = path.join(REPO_ROOT, 'evidence', 'v26-leaflet-plugin', RUN_DATE);
const PORT      = Number(process.env.PORT || 8866);

fs.mkdirSync(EVID_DIR, { recursive: true });

const log_lines = [];
function log(...args) {
  const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  console.log(line);
  log_lines.push(new Date().toISOString().slice(11, 23) + ' ' + line);
}

let failures = 0;
const results = [];
function assert(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail === undefined ? null : detail });
  if (ok) log('PASS', name);
  else { failures++; log('FAIL', name, detail != null ? JSON.stringify(detail) : ''); }
}

/* ---------- the static server (so nothing has to be started first) ---------- */

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8',
};

function serveRepo(port) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    const abs = path.resolve(REPO_ROOT, rel);
    if (!abs.startsWith(REPO_ROOT)) { res.writeHead(403).end('no'); return; }
    let file = abs;
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); }
    catch { res.writeHead(404).end('not found'); return; }
    try {
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

/* ---------- harness ---------- */

async function main() {
  log('V26-01 Layer 2 demo runner -- NAC3 v2.6 hooks against real Leaflet 1.9.4');
  log('  repo root  ', REPO_ROOT);
  log('  evidence   ', EVID_DIR);

  /* The runtime bundle the page loads is a build artefact. A stale one
     is the classic way a demo reports green over code that is not the
     code under test, so the runner refuses rather than guesses. */
  const bundle = path.join(REPO_ROOT, 'runtime', 'dist', 'nac.browser.js');
  if (!fs.existsSync(bundle)) {
    log('CRITICAL: runtime/dist/nac.browser.js is missing. Run: cd runtime && npm run build');
    process.exit(2);
  }
  const bundleSrc = fs.readFileSync(bundle, 'utf8');
  if (!/registerApiHandle/.test(bundleSrc) || !/emitter-listen/.test(bundleSrc)) {
    log('CRITICAL: runtime/dist/nac.browser.js predates the v2.6 hooks. Run: cd runtime && npm run build');
    process.exit(2);
  }

  let server;
  try { server = await serveRepo(PORT); }
  catch (e) { log('CRITICAL: cannot serve the repo on port ' + PORT + ': ' + e.message); process.exit(2); }
  const BASE = 'http://127.0.0.1:' + PORT;
  log('  serving    ', BASE);

  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (e) {
    log('CRITICAL: failed to launch chromium: ' + e.message);
    log('  hint: npx playwright install chromium');
    server.close();
    process.exit(2);
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const externalFailures = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/tile\.openstreetmap\.org|unpkg\.com|ERR_/.test(text)) externalFailures.push(text);
    else consoleErrors.push(text);
  });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/^https?:\/\/(?!127\.0\.0\.1)/.test(u)) externalFailures.push('requestfailed ' + u);
  });

  const DEMO_URL = BASE + '/demos/v26-leaflet-plugin/index.html';
  await page.goto(DEMO_URL, { waitUntil: 'load', timeout: 30000 });

  try {
    await page.waitForFunction(() => window.__demo_ready === true, { timeout: 15000 });
  } catch {
    log('CRITICAL: the demo never booted. Leaflet is loaded from unpkg with a pinned');
    log('  SRI hash -- with no network, or with a hash the CDN no longer matches, the');
    log('  page cannot come up and this run measures nothing.');
    log('  external resource failures seen: ' + JSON.stringify(externalFailures.slice(0, 5)));
    await page.screenshot({ path: path.join(EVID_DIR, '00-boot-failed.png') });
    await browser.close(); server.close();
    process.exit(2);
  }

  /* Leaflet itself answered -- the library under test is really here. */
  const leafletVersion = await page.evaluate(() => (window.L && window.L.version) || null);
  assert('the real Leaflet loaded (version from the library itself)',
    leafletVersion === '1.9.4', leafletVersion);
  const rt = await page.evaluate(() => ({ v: window.NAC.version, s: window.NAC.spec_version }));
  assert('the page is running the 2.6 runtime', rt.v === '2.6.0' && rt.s === '2.6', rt);

  await page.waitForTimeout(1200);   /* let the tiles paint for the screenshot */
  await page.screenshot({ path: path.join(EVID_DIR, '01-initial.png'), fullPage: false });

  /* ============ E-1 -- an agent discovers a plugin it never saw ============ */

  const discovered = await page.evaluate(() => {
    /* This is all an agent has: the runtime. It did not read the
       plugin file and nobody handed it the manifest. */
    const found = window.NAC.plugins();
    return {
      slugs: found.map((p) => p.slug),
      entry: found.filter((p) => p.slug === 'leaflet.map')[0] || null,
    };
  });
  assert('plugins() finds the plugin without the agent registering anything',
    discovered.slugs.indexOf('leaflet.map') >= 0, discovered.slugs);
  const entry = discovered.entry || { verbs: [], state: [], events: [] };
  assert('the descriptor carries the surface label',
    entry.label === 'Leaflet map', entry.label);
  assert('every verb the plugin declares is listed, sorted',
    entry.verbs.map((v) => v.verb_path).join(',') ===
      'overlay.require,view.fit_all,view.set,view.zoom_in,view.zoom_out',
    entry.verbs.map((v) => v.verb_path));
  assert('the state paths are listed with their fallback chains',
    entry.state.filter((s) => s.state_path === 'view.zoom')[0].backends.join(',') === 'sdk-call,dom-mirror',
    entry.state.filter((s) => s.state_path === 'view.zoom')[0]);
  assert('the events are listed with the LIBRARY event name they listen to',
    entry.events.filter((e) => e.event_path === 'view.moved')[0].event === 'moveend',
    entry.events.filter((e) => e.event_path === 'view.moved')[0]);

  const copyProof = await page.evaluate(() => {
    const d = window.NAC.describePlugin('leaflet.map');
    d.verbs[0].backend = 'postmessage';
    d.slug = 'hijacked';
    const again = window.NAC.describePlugin('leaflet.map');
    return { slug: again.slug, backend: again.verbs[0].backend };
  });
  assert('the descriptor is a copy: a reader cannot rewrite the live registry',
    copyProof.slug === 'leaflet.map' && copyProof.backend === 'sdk-call', copyProof);

  /* ============ E-2 -- and UNDERSTANDS what the verbs take ============ */

  const setViewDesc = entry.verbs.filter((v) => v.verb_path === 'view.set')[0];
  assert('the verb has a human label an agent can say out loud',
    setViewDesc && setViewDesc.label === 'Move the view', setViewDesc && setViewDesc.label);
  assert('the verb declares its arguments: a coordinate and a zoom',
    setViewDesc && setViewDesc.params && setViewDesc.params.length === 2 &&
    setViewDesc.params[0].name === 'center' && setViewDesc.params[0].type === 'array' &&
    setViewDesc.params[0].required === true,
    setViewDesc && setViewDesc.params);
  assert('the argument declares its UNIT and its range -- the thing a map needs',
    setViewDesc.params[0].unit === 'degrees' &&
    setViewDesc.params[1].unit === 'zoom level' &&
    setViewDesc.params[1].min === 0 && setViewDesc.params[1].max === 19,
    setViewDesc.params);
  const cityDesc = entry.verbs.filter((v) => v.verb_path === 'view.fit_all')[0];
  assert('a closed set of values travels as an enum',
    cityDesc && cityDesc.params[0].enum && cityDesc.params[0].enum.join(',') === 'bue,mvd,scl',
    cityDesc && cityDesc.params[0]);
  const zoomState = entry.state.filter((s) => s.state_path === 'view.zoom')[0];
  assert('a state path is named and carries its unit',
    zoomState.label === 'Zoom level' && zoomState.unit === 'zoom level', zoomState);
  await page.screenshot({ path: path.join(EVID_DIR, '02-discovered.png') });

  /* ============ E-4 -- positional call on an off-window object ============ */

  const moved = await page.evaluate(async () => {
    await window.NAC.call('leaflet.map', 'view.set', { center: [-34.6037, -58.3816], zoom: 12 });
    /* Read the LIBRARY, not the protocol: did the app actually move? */
    const c = window.__demo.map.getCenter();
    return {
      lib: { lat: Number(c.lat.toFixed(4)), lng: Number(c.lng.toFixed(4)), zoom: window.__demo.map.getZoom() },
      viaProtocol: {
        lat: await window.NAC.read('leaflet.map', 'view.center.lat'),
        zoom: await window.NAC.read('leaflet.map', 'view.zoom'),
      },
    };
  });
  assert('map.setView(center, zoom) really moved the real map (library API says so)',
    moved.lib.lat === -34.6037 && moved.lib.lng === -58.3816 && moved.lib.zoom === 12,
    moved.lib);
  assert('and the protocol reads the same values back',
    Math.abs(moved.viaProtocol.lat - (-34.6037)) < 0.001 && moved.viaProtocol.zoom === 12,
    moved.viaProtocol);

  /* The positional half, proved by its absence: with only `center` in
     the args, the second slot is undefined, and Leaflet's documented
     behaviour for setView(center, undefined) is to keep the zoom. If
     the runtime were still passing ONE object argument, Leaflet would
     have read no centre at all. */
  const positional = await page.evaluate(async () => {
    await window.NAC.call('leaflet.map', 'view.set', { center: [-34.9011, -56.1645] });
    const c = window.__demo.map.getCenter();
    return { lat: Number(c.lat.toFixed(4)), zoom: window.__demo.map.getZoom() };
  });
  assert('one positional argument given, the other left out: centre moved, zoom kept',
    positional.lat === -34.9011 && positional.zoom === 12, positional);

  const glueCall = await page.evaluate(async () => {
    const r = await window.NAC.call('leaflet.map', 'view.fit_all', { city: 'scl', zoom: 9 });
    return { r, zoom: window.__demo.map.getZoom(), lat: Number(window.__demo.map.getCenter().lat.toFixed(2)) };
  });
  assert('a verb routed to the plugin own facade (a second handle) also lands',
    glueCall.r && glueCall.r.ok === true && glueCall.zoom === 9 && glueCall.lat === -33.45,
    glueCall);
  await page.screenshot({ path: path.join(EVID_DIR, '03-after-calls.png') });

  /* ============ E-3 -- Leaflet's own event, declared ============ */

  const eventProof = await page.evaluate(async () => {
    const seen = [];
    const h = window.NAC.subscribe('leaflet.map', 'view.moved', (snap) => seen.push(snap));
    /* Move the map through the LIBRARY, the way a user would -- no
       NAC call involved, so only a real moveend can deliver this. */
    window.__demo.map.panBy([160, 90], { animate: false });
    await new Promise((r) => setTimeout(r, 900));
    const afterSub = seen.length;
    window.NAC.unsubscribe(h);
    window.__demo.map.panBy([-160, -90], { animate: false });
    await new Promise((r) => setTimeout(r, 900));
    return { afterSub, afterUnsub: seen.length, first: seen[0] || null, handleBackend: h.backend };
  });
  assert('a real Leaflet moveend reaches the protocol through emitter-listen',
    eventProof.afterSub >= 1, eventProof);
  assert('the subscription handle names the backend that served it',
    eventProof.handleBackend === 'emitter-listen', eventProof.handleBackend);
  assert('the callback receives the observed state, re-read at event time',
    eventProof.first && typeof eventProof.first['view.zoom'] === 'number' &&
    typeof eventProof.first['view.center.lat'] === 'number',
    eventProof.first);
  assert('after unsubscribe the library stops delivering to us',
    eventProof.afterUnsub === eventProof.afterSub, eventProof);

  /* The 2.5 effect-confirmation surface, over plugin state, on a real
     library: this is what makes a continuous value confirmable. */
  const expectProof = await page.evaluate(async () => {
    const before = window.__demo.map.getZoom();
    await window.NAC.call('leaflet.map', 'view.zoom_in');
    const got = await window.NAC.expect('leaflet.map', 'view.zoom', before + 1,
      { timeout_ms: 4000, comparator: (cur, want) => Math.abs(cur - want) < 0.01 });
    return { before, got };
  });
  assert('NAC.expect confirms the EFFECT on the real map, by tolerance',
    expectProof.got === expectProof.before + 1, expectProof);
  await page.screenshot({ path: path.join(EVID_DIR, '04-events-and-expect.png') });

  /* ============ E-5 -- the observer that used to observe nothing ============ */

  /* Put Santiago out of the viewport so its row unmounts: the exact
     lifecycle of a virtualised grid row, produced by the real map. */
  const rowGone = await page.evaluate(async () => {
    window.__demo.map.setView([-34.6037, -58.3816], 12);
    await new Promise((r) => setTimeout(r, 600));
    return {
      painted: !!document.querySelector('[data-marker-row="scl"]'),
      rows: document.querySelectorAll('[data-marker-row]').length,
    };
  });
  assert('the row for a city outside the viewport is not painted',
    rowGone.painted === false, rowGone);

  const unrooted = await page.evaluate(() => {
    try {
      const h = window.NAC.subscribe('leaflet.map', 'markers.row.scl.changed_unrooted', () => {});
      return { threw: false, handle: !!h };
    } catch (e) { return { threw: true, code: e.code, message: e.message }; }
  });
  assert('subscribing to the unpainted row is REFUSED, not answered with a dead handle',
    unrooted.threw === true && unrooted.code === 'backend_target_missing', unrooted);
  assert('and the refusal names what did not resolve',
    unrooted.threw && /data-marker-row="scl"/.test(unrooted.message || ''), unrooted.message);

  const rooted = await page.evaluate(async () => {
    const seen = [];
    const h = window.NAC.subscribe('leaflet.map', 'markers.row.scl.changed', (s) => seen.push(s));
    /* Now bring Santiago back into view: the row MOUNTS, inside the
       container the subscription is observing. */
    window.__demo.map.setView([-34.2, -64.0], 5);
    await new Promise((r) => setTimeout(r, 1200));
    const afterMount = seen.slice();
    /* And move again, so the mounted row's value changes. */
    window.__demo.map.setView([-33.9, -67.0], 5);
    await new Promise((r) => setTimeout(r, 1200));
    window.NAC.unsubscribe(h);
    return {
      subscribed: !!h,
      afterMount: afterMount.length,
      total: seen.length,
      last: seen[seen.length - 1] || null,
      painted: !!document.querySelector('[data-marker-row="scl"]'),
    };
  });
  assert('with a root declared, the subscription on an unpainted row is accepted',
    rooted.subscribed === true, rooted);
  assert('the row remounts and the subscription taken BEFORE it existed fires',
    rooted.afterMount >= 1, rooted);
  assert('and keeps firing as the mounted row changes value',
    rooted.total > rooted.afterMount, rooted);
  assert('the value delivered is the row state, read through the chain',
    rooted.last && typeof rooted.last['markers.row.scl'] === 'string', rooted.last);
  await page.screenshot({ path: path.join(EVID_DIR, '05-rooted-row.png') });

  /* ============ E-6 -- the plugin's own error code ============ */

  const errs = await page.evaluate(async () => {
    const out = {};
    try { await window.NAC.call('leaflet.map', 'overlay.require', { overlay: 'heatmap' }); }
    catch (e) { out.plugin = { code: e.code, message: e.message }; }
    try { await window.NAC.call('leaflet.map', 'view.fit_all', { city: 'atlantis' }); }
    catch (e) { out.contract = { code: e.code }; }
    try { await window.NAC.call('leaflet.map', 'view.nonexistent', {}); }
    catch (e) { out.undeclared = { code: e.code }; }
    return out;
  });
  assert('an application failure comes back in the plugin code space',
    errs.plugin && errs.plugin.code === 'plugin.overlay_not_attached', errs.plugin);
  assert('and it is distinguishable from a routing failure of the protocol',
    errs.plugin.code !== 'backend_target_missing' && errs.plugin.code !== 'invalid', errs.plugin);
  assert('a wrong ARGUMENT still comes back as the contract code `invalid`',
    errs.contract && errs.contract.code === 'invalid', errs.contract);
  assert('an undeclared verb is still verb_not_declared',
    errs.undeclared && errs.undeclared.code === 'verb_not_declared', errs.undeclared);

  /* ============ provenance + console hygiene ============ */

  const prov = await page.evaluate(() => {
    const rows = [];
    /* The page logged every nac:plugin:* event into the panel; read
       the backends it recorded straight off the DOM. */
    document.querySelectorAll('#log .entry .backend').forEach((el) => rows.push(el.textContent));
    return rows;
  });
  assert('provenance recorded the sdk-call dispatches',
    prov.filter((b) => b === 'sdk-call').length >= 3, prov.length);
  assert('provenance recorded the emitter-listen events',
    prov.filter((b) => b === 'emitter-listen').length >= 1, prov.filter((b) => b === 'emitter-listen').length);
  assert('provenance recorded the synthetic-mutation events',
    prov.filter((b) => b === 'synthetic-mutation').length >= 1,
    prov.filter((b) => b === 'synthetic-mutation').length);

  assert('zero console errors from the page or the contract',
    consoleErrors.length === 0, consoleErrors.slice(0, 5));
  if (externalFailures.length) {
    log('NOTE  ' + externalFailures.length + ' external resource failure(s) (tiles / CDN), not asserted: ' +
      JSON.stringify(externalFailures.slice(0, 3)));
  }

  await page.screenshot({ path: path.join(EVID_DIR, '06-final.png'), fullPage: true });

  /* ---------- receipts ---------- */
  const summary = {
    runner: 'run-demo-v26-leaflet-plugin.mjs',
    rfc: 'V26-01',
    run_at: new Date().toISOString(),
    runtime_version: rt.v,
    spec_version: rt.s,
    third_party: { library: 'leaflet', version: leafletVersion, source: 'unpkg (pinned SRI)' },
    url: DEMO_URL,
    assertions: results,
    passed: results.filter((r) => r.ok).length,
    failed: failures,
    console_errors: consoleErrors,
    external_resource_failures: externalFailures,
    screenshots: fs.readdirSync(EVID_DIR).filter((f) => f.endsWith('.png')).sort(),
  };
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.json'), JSON.stringify(summary, null, 2) + '\n');

  log('');
  log(failures === 0
    ? 'V26-01 DEMO PASS (' + summary.passed + '/' + results.length + ' assertions)'
    : 'V26-01 DEMO FAIL (' + failures + ' of ' + results.length + ' assertions)');
  fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n');

  await browser.close();
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  log('CRITICAL harness error: ' + (e && e.stack ? e.stack : e));
  try { fs.writeFileSync(path.join(EVID_DIR, 'run-log.txt'), log_lines.join('\n') + '\n'); } catch {}
  process.exit(2);
});
