/*
 * fixture-dom.mjs -- the smallest DOM that makes validate_global() speak.
 *
 * Why this exists. The contract generator used to publish the buckets of
 * validate_global() with `code: null` for all of them, because it called the
 * validator on an EMPTY document: with no findings there is not one item to
 * look at, so it took the bucket NAMES from the result keys and then wrote the
 * codes by hand. One of those hand-written nulls was already wrong -- the
 * plugin_instance_violations bucket has carried a code since 2.5.0 and the same
 * artefact published it twice, once in the catalogue and once as uncoded. A
 * generator that composes what it should read is not a generator, it is a
 * second opinion (audit N-14 / PND-039).
 *
 * So: a fixture that PROVOKES every bucket on purpose, and the code read off
 * the items the runtime actually produced. Building it is also what found
 * audit N-33 -- four of the five buckets came back empty against a manifest
 * written the way the SPEC documents, because the id collector only read the
 * legacy manifest shape.
 *
 * This is deliberately NOT jsdom: the generator must run in CI with no browser
 * and no extra dependency. It stubs exactly the DOM surface the runtime touches
 * on this path and nothing else; readyState is 'loading' so the boot hooks
 * defer to a listener that never fires.
 *
 * ASCII-only. Used by scripts/build-contract-api.mjs and
 * scripts/test-validate-global.mjs -- one fixture, so the gate and the
 * published artefact can never describe two different runtimes.
 */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* The five conditions, named once so the test and the generator agree. */
export const FIXTURE_BUCKETS = [
  'duplicates',
  'orphans',
  'unmounted',
  'convention_violations',
  'plugin_instance_violations',
];

function makeEl(attrs) {
  const el = {
    getAttribute(n) {
      return Object.prototype.hasOwnProperty.call(attrs, n) ? attrs[n] : null;
    },
    setAttribute(n, v) { attrs[n] = String(v); },
    hasAttribute(n) { return Object.prototype.hasOwnProperty.call(attrs, n); },
    removeAttribute(n) { delete attrs[n]; },
    closest(sel) {
      if (sel === '[data-nac-plugin]'
          && Object.prototype.hasOwnProperty.call(attrs, 'data-nac-plugin')) {
        return el;
      }
      return null;
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    appendChild(c) { return c; },
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    textContent: '',
    children: [],
    childNodes: [],
  };
  return el;
}

/*
 * Loads the published runtime bytes in a sandbox that has a document, registers
 * two manifests written in the CANONICAL `elements: [{id}]` shape, and returns
 * the validate_global() result together with the pieces that provoked it.
 *
 * What provokes what:
 *   duplicates                 'shared.collision' declared by alpha AND beta
 *   orphans                    'nobody.declares.me' painted in the DOM only
 *   unmounted                  'alpha.ghost' declared and never painted
 *   convention_violations      'no_prefix_here' declared under slug 'alpha'
 *   plugin_instance_violations two roots with data-nac-plugin="twice", no ids
 *
 * Strict validation and the hard dedup gate are switched off on purpose: the
 * point is to let the invalid manifests through so the VALIDATOR can report
 * them, which is the surface under test.
 */
export function loadRuntimeInFixtureDom(opts) {
  const mutate = (opts && opts.mutate) || null;
  let src = readFileSync(join(ROOT, 'js', 'nac.js'), 'utf8');
  /* `mutate` plants a defect in the bytes IN MEMORY, never on disk. It is how
     scripts/test-validate-global.mjs proves each lock goes red on the real
     regression instead of asserting a green it was handed. */
  if (mutate) {
    const before = src;
    src = mutate(src);
    if (src === before) {
      throw new Error('the mutation matched nothing in js/nac.js: the lock would pass for the wrong reason');
    }
  }

  const dupRootA = makeEl({ 'data-nac-plugin': 'twice' });
  const dupRootB = makeEl({ 'data-nac-plugin': 'twice' });
  const mounted  = makeEl({ 'data-nac-id': 'alpha.ok', 'data-nac-role': 'action' });
  const orphan   = makeEl({ 'data-nac-id': 'nobody.declares.me', 'data-nac-role': 'action' });

  const nodes = {
    '[data-nac-id]': [mounted, orphan],
    '[data-nac-plugin]': [dupRootA, dupRootB],
  };

  const asked = new Set();
  const document = {
    readyState: 'loading',
    body: null,
    head: { appendChild() {} },
    documentElement: makeEl({}),
    querySelectorAll(sel) { asked.add(sel); return nodes[sel] || []; },
    querySelector(sel) { asked.add(sel); return (nodes[sel] || [])[0] || null; },
    createElement() { return makeEl({}); },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
  };

  class CustomEventStub {
    constructor(type, init) { this.type = type; this.detail = (init || {}).detail; }
  }

  const quiet = { log() {}, warn() {}, error() {}, info() {} };
  const ctx = vm.createContext({ console: quiet, document, CustomEvent: CustomEventStub });
  vm.runInContext(src, ctx, { filename: 'js/nac.js' });
  const NAC = ctx.NAC;
  if (!NAC || typeof NAC.validate_global !== 'function') {
    throw new Error('js/nac.js did not install a NAC export with validate_global in the fixture sandbox');
  }

  NAC.STRICT_VALIDATION = false;
  NAC.HARD_DEDUP = false;

  NAC.register({
    plugin_slug: 'alpha',
    version: '1.0.0',
    nac_version: '2.5',
    elements: [
      { id: 'alpha.ok', role: 'action' },
      { id: 'alpha.ghost', role: 'action' },
      { id: 'shared.collision', role: 'action' },
      { id: 'no_prefix_here', role: 'action' },
    ],
  });
  NAC.register({
    plugin_slug: 'beta',
    version: '1.0.0',
    nac_version: '2.5',
    elements: [{ id: 'shared.collision', role: 'action' }],
  });

  /* A manifest in the LEGACY shape, so the collector is exercised on both.
     Its one id is painted nowhere, which is why it lands in unmounted. */
  NAC.register({
    plugin_slug: 'legacy',
    version: '1.0.0',
    nac_version: '2.5',
    actions: [{ nac_id: 'legacy.old_style', verb: 'save' }],
  });

  const result = NAC.validate_global();

  return { NAC, result, nodes, selectors_asked: Array.from(asked).sort() };
}
