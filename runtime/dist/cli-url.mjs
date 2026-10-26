/* =====================================================================
   cli-url.mjs -- URL mode of the NAC CLI validator, and the only place
   that decides a conformance level.

   Audit N-18, second half. Before 2.5.0 `nac validate <url>` aborted
   with exit 2 and a message saying URL validation required Playwright,
   and NO mode of the CLI ever printed a conformance level -- while
   SPEC.md section 8 says, in those words, that the package's CLI
   "reports the highest level a page reaches". A spec that promises an
   instrument nobody can run is worse than one that promises nothing:
   the reader believes the claim is checkable.

   THE LEVEL DEFINITIONS ARE NOT IN THIS FILE. They are read from
   dist/cli-levels.json, which runtime/build.mjs generates out of
   SPEC.md section 8 through scripts/spec-levels.mjs -- the same module
   that produces the published api/v/<version>/levels.json. Two copies
   of section 8 would let this validator certify pages against a spec
   nobody is reading. What lives here is the DECIDERS: one function per
   requirement, registered under the name the contract publishes for
   it, so a report can be audited against the check that produced it.

   Three verdicts, and the difference between the last two is the whole
   point:
     pass        measured, and it holds.
     fail        measured, and it does not hold.
     unverified  NOT measured. Never counted as a pass.

   ASCII only. No dependency beyond node core, except Playwright, which
   is resolved at call time and is optional.
   ===================================================================== */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadLevels() {
  return JSON.parse(readFileSync(join(HERE, 'cli-levels.json'), 'utf8'));
}

export class PlaywrightMissing extends Error {}

/* Playwright is OPTIONAL, resolved at call time, and never a
   dependency of this package: a runtime that pulled a browser into
   every adopter's node_modules to offer a validator would be charging
   every user for a tool most of them never run. The three names are
   the three ways it is actually installed in the wild. */
async function resolveChromium() {
  const tried = [];
  for (const name of ['playwright', 'playwright-core', '@playwright/test']) {
    try {
      const mod = await import(name);
      const chromium = mod.chromium || (mod.default && mod.default.chromium);
      if (chromium) return { chromium, from: name };
      tried.push(name + ' (resolved, exports no chromium)');
    } catch (e) {
      tried.push(name + ' (not installed)');
    }
  }
  const err = new PlaywrightMissing('cannot resolve a Playwright chromium launcher');
  err.tried = tried;
  throw err;
}

/* ---- observation -----------------------------------------------------
   One evaluate, one snapshot. Asking the page five separate questions
   invites five different answers, because a page that is still
   registering manifests changes between calls -- and a validator whose
   findings depend on when it looked is not measuring the page. */

function pageObservation() {
  /* Runs INSIDE the page. Must be self-contained: no closures over
     anything in this file. */
  const N = window.NAC;
  if (!N) return { nac: false };

  function labelMaps(m) {
    /* Every user-facing label the manifest declares, canonical shape
       (elements[]) and legacy groups alike, including the per-action
       labels nested under an element. */
    const out = [];
    function take(owner, where) {
      if (owner && owner.label_i18n && typeof owner.label_i18n === 'object') {
        out.push({ where: where, locales: Object.keys(owner.label_i18n) });
      }
    }
    const els = Array.isArray(m.elements) ? m.elements : [];
    els.forEach(function (e) {
      take(e, String(e && e.id));
      const acts = Array.isArray(e && e.actions) ? e.actions : [];
      acts.forEach(function (a, i) {
        take(a, String(e && e.id) + '.actions[' + i + ']');
      });
    });
    ['tabs', 'fields', 'actions', 'kpis', 'charts'].forEach(function (g) {
      const arr = Array.isArray(m[g]) ? m[g] : [];
      arr.forEach(function (x, i) {
        take(x, g + '[' + i + ']');
      });
    });
    return out;
  }

  const manifests = (N.manifest() || []).filter(Boolean).map(function (m) {
    const groupLen = function (g) { return Array.isArray(m[g]) ? m[g].length : null; };
    return {
      plugin_slug: m.plugin_slug || null,
      element_count: Array.isArray(m.elements) ? m.elements.length : null,
      groups: { tabs: groupLen('tabs'), fields: groupLen('fields'), actions: groupLen('actions') },
      /* "Carries HMAC-signed manifests": the only thing a validator
         without the tenant secret can see is whether a provenance
         block is there at all. */
      provenance_block: !!(m.provenance || m.signature
        || (m.source && m.source.signature)
        || (m.provenance_source && m.provenance_source.signature)),
      labels: labelMaps(m),
    };
  });

  const described = N.describe();

  /* ADVERTISED means declared by the contract, not merely present in
     the DOM: describe() can only report what it finds mounted, so
     reading the advertised set off describe() would make "every
     advertised id resolves" true by construction -- a comparison that
     cannot fail. So the advertised set comes from the MANIFESTS and
     resolution is checked against the DOM. */
  const advertised = [];
  const seenId = Object.create(null);
  (N.manifest() || []).filter(Boolean).forEach(function (m) {
    const slug = m.plugin_slug || null;
    function push(id, role) {
      if (!id) return;
      id = String(id);
      if (seenId[id]) return;
      seenId[id] = true;
      advertised.push({ nac_id: id, role: role || null, plugin: slug });
    }
    (Array.isArray(m.elements) ? m.elements : []).forEach(function (e) {
      push(e && e.id, e && e.role);
    });
    [['tabs', 'tab'], ['fields', 'field'], ['actions', 'action'],
      ['kpis', null], ['charts', null]].forEach(function (pair) {
      (Array.isArray(m[pair[0]]) ? m[pair[0]] : []).forEach(function (x) {
        push(x && (x.nac_id || x.id), (x && x.role) || pair[1]);
      });
    });
  });

  const domIds = [];
  Array.prototype.forEach.call(document.querySelectorAll('[data-nac-id]'), function (el) {
    const id = el.getAttribute('data-nac-id');
    if (id) domIds.push(id);
  });

  const g = N.validate_global();

  return {
    nac: true,
    version: N.version || null,
    spec_version: N.spec_version || null,
    conformance_tier: N.conformance_tier || null,
    strict_versioning: !!N.STRICT_VERSIONING,
    url: location.href,
    tree_version: described.tree_version || null,
    plugin_count: g.plugin_count,
    total_ids: g.total_ids,
    dom_ids: domIds.length,
    dom_id_list: domIds,
    advertised: advertised,
    manifests: manifests,
    /* The buckets, flattened with their bucket name kept, because the
       severity threshold is what two different level requirements
       disagree about. `tolerated` is reported and NOT counted: the
       host registered it as tracked debt, which is a different claim
       than "clean". */
    findings: ['duplicates', 'orphans', 'unmounted', 'convention_violations',
      'plugin_instance_violations'].reduce(function (acc, b) {
      (g[b] || []).forEach(function (f) {
        /* severity 'unknown' rather than a guess: a runtime older than
           2.5.0 attaches neither code nor severity to any bucket item
           (audit N-14), and defaulting those to 'error' would make the
           validator invent a severity the page never stated. Unknown
           counts as failing -- fail closed -- and the report says why
           instead of printing a number it made up. */
        acc.push({
          bucket: b,
          code: f.code || null,
          severity: f.severity || 'unknown',
          nac_id: f.nac_id || null,
        });
      });
      return acc;
    }, []),
    tolerated_count: (g.tolerated || []).length,
  };
}

/* The page may register its manifests inside a readiness callback, so
   the honest moment to look is when the registry stops moving -- not
   after a fixed sleep, which measures the machine's mood. */
async function settle(page, { settleMs, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let last = -1;
  let stableSince = 0;
  for (;;) {
    const n = await page.evaluate(() => {
      const N = window.NAC;
      if (!N) return -1;
      try { return N.list_registered_plugins().length; } catch (_) { return -1; }
    });
    if (n >= 0 && n === last) {
      if (!stableSince) stableSince = Date.now();
      if (Date.now() - stableSince >= settleMs) return { plugins: n, settled: true };
    } else {
      stableSince = 0;
      last = n;
    }
    if (Date.now() > deadline) return { plugins: last, settled: false };
    await new Promise((r) => setTimeout(r, 60));
  }
}

/* ---- driving ---------------------------------------------------------
   Two of the four level-1 requirements are behavioural: they are about
   what the page DOES when an agent clicks, and no amount of reading
   decides them. So the validator can click -- but only when asked,
   because clicking every advertised control on somebody's production
   page is not a read-only operation and must never be the default. */

async function driveOne(page, id, { perActionMs }) {
  try {
    return await driveOneInPage(page, id, { perActionMs });
  } catch (e) {
    const msg = String((e && e.message) || e);
    /* A click that navigates away tears down the context the evaluate
       was running in. That is not a failed action -- navigating IS the
       side effect of a link -- but the completion event becomes
       unobservable, and the difference between "did not fire" and
       "could not be watched" is the difference between a verdict and a
       guess. So it is recorded as its own outcome and the caller
       restores the page before the next id. */
    if (/Execution context was destroyed|navigation|detached/i.test(msg)) {
      return { id, resolved: null, click_error: null, succeeded: false, failed: null, navigated: true };
    }
    return { id, resolved: null, click_error: msg.split('\n')[0], succeeded: false, failed: null };
  }
}

async function driveOneInPage(page, id, { perActionMs }) {
  return page.evaluate(async (payload) => {
    const N = window.NAC;
    const id = payload.id;
    const seen = { succeeded: false, failed: null };
    const onOk = function (e) {
      const d = (e && e.detail) || {};
      if (d.action_id === id || d.nac_id === id) seen.succeeded = true;
    };
    const onBad = function (e) {
      const d = (e && e.detail) || {};
      if (d.action_id === id || d.nac_id === id) seen.failed = d.error || d.code || 'failed';
    };
    document.addEventListener('nac:action:succeeded', onOk);
    document.addEventListener('nac:action:failed', onBad);

    const resolved = !!N.find(id);
    /* Is this action's side effect a NAVIGATION? It changes what a
       timeout means. A plain anchor cannot emit a completion event
       after its own unload, so "no event" says nothing about the page
       -- while for a scripted button it says everything. Recorded
       here, decided later, because the validator must not collapse two
       different facts into one verdict. */
    const el = document.querySelector('[data-nac-id="' + id + '"]');
    const nav_link = !!(el && el.tagName === 'A' && el.getAttribute('href')
      && !/^#/.test(el.getAttribute('href')));
    let click_error = null;
    try {
      /* STRICT_VERSIONING defaults to true in 2.5, so a click with no
         expected_* is refused with version_required. Passing the tree
         version the page just reported is the conformant way to ask,
         and it exercises the versioned tier while it is at it. */
      const tv = N.describe().tree_version;
      await N.click(id, tv ? { expected_tree_version: tv } : undefined);
    } catch (e) {
      click_error = (e && (e.code || e.message)) || 'error';
    }
    await new Promise((r) => setTimeout(r, payload.perActionMs));
    document.removeEventListener('nac:action:succeeded', onOk);
    document.removeEventListener('nac:action:failed', onBad);
    return {
      id: id, resolved: resolved, nav_link: nav_link, click_error: click_error,
      succeeded: seen.succeeded, failed: seen.failed,
    };
  }, { id, perActionMs });
}

/* ---- deciders --------------------------------------------------------
   One per published `decider` name. The name is the contract: the
   build refuses to ship a CLI whose table does not match the names the
   sidecar reviewed against each sentence, so a report always names a
   check that exists. */

function pass(detail) { return { verdict: 'pass', detail }; }
function failV(detail) { return { verdict: 'fail', detail }; }
function unverified(detail) { return { verdict: 'unverified', detail }; }

const DECIDERS = {
  manifest_registered(ctx) {
    const n = ctx.obs.plugin_count;
    return n >= 1
      ? pass(n + ' manifest(s) registered')
      : failV('no manifest is registered (finding code no_manifest)');
  },

  manifest_declares_groups(ctx) {
    /* Read LITERALLY: the sentence names tabs[], fields[] and
       actions[]. That is the LEGACY manifest shape; section 4
       documents elements[] as the canonical one, so a page written the
       documented way fails this as worded. The validator does not
       rewrite the requirement to what it probably meant -- that is
       what the hash-keyed review in the sidecar is for, and the gap is
       audit N-37. */
    const missing = [];
    for (const m of ctx.obs.manifests) {
      const gaps = ['tabs', 'fields', 'actions'].filter((g) => !(m.groups[g] > 0));
      if (gaps.length) missing.push((m.plugin_slug || '(unnamed)') + ' lacks ' + gaps.join('/'));
    }
    if (!ctx.obs.manifests.length) return failV('no manifest to read');
    return missing.length === 0
      ? pass('every manifest declares tabs[], fields[] and actions[]')
      : failV(missing.length + ' of ' + ctx.obs.manifests.length + ' manifest(s) do not declare the three arrays: '
          + missing.slice(0, 4).join('; ') + (missing.length > 4 ? '; ...' : '')
          + ' -- note: these manifests use the canonical elements[] shape instead (audit N-37)');
  },

  label_i18n_covers_locales(ctx) {
    const required = ctx.levels.locales_required;
    let total = 0;
    const offenders = [];
    for (const m of ctx.obs.manifests) {
      for (const l of m.labels) {
        total += 1;
        const miss = required.filter((loc) => l.locales.indexOf(loc) < 0);
        if (miss.length) offenders.push(l.where + ' misses ' + miss.join(','));
      }
    }
    if (total === 0) return failV('no label_i18n is declared anywhere in the registered manifests');
    return offenders.length === 0
      ? pass(total + ' label(s), all covering the ' + required.length + ' required locales')
      : failV(offenders.length + ' of ' + total + ' label(s) do not cover all ' + required.length
          + ' locales: ' + offenders.slice(0, 3).join('; ') + (offenders.length > 3 ? '; ...' : ''));
  },

  validate_global_no_errors(ctx) {
    /* 'unknown' counts against the page: a finding whose severity the
       page never stated cannot be assumed harmless. The caveat names
       why, so nobody reads a pre-2.5.0 runtime as a defective page. */
    const errs = ctx.obs.findings.filter((f) => f.severity === 'error' || f.severity === 'unknown');
    const unknown = ctx.obs.findings.filter((f) => f.severity === 'unknown').length;
    const caveat = unknown
      ? ' -- ' + unknown + ' of them carry no severity at all, because the runtime on this page '
        + 'predates coded findings (audit N-14); counted as failing rather than assumed harmless'
      : '';
    return errs.length === 0
      ? pass('validate_global reports 0 error-severity findings'
          + (ctx.obs.findings.length ? ' (' + ctx.obs.findings.length + ' of lower severity)' : ''))
      : failV(errs.length + ' error-severity finding(s): '
          + errs.slice(0, 4).map((f) => (f.code || f.bucket) + (f.nac_id ? '(' + f.nac_id + ')' : '')).join(', ')
          + (errs.length > 4 ? ', ...' : '') + caveat);
  },

  validate_global_no_findings(ctx) {
    const n = ctx.obs.findings.length;
    /* The sentence asks for {probe: true}. validate_global() takes no
       arguments and never reads `probe`, although SPEC.md 10.1
       publishes the option -- audit N-35. So this is the level-2 check
       with a stricter threshold, not the deeper probing the sentence
       implies, and the report says so rather than quietly passing. */
    const caveat = ' -- note: the runtime ignores the {probe: true} this requirement asks for (audit N-35), so this is the same call with a stricter threshold';
    return n === 0
      ? pass('validate_global reports 0 findings of any severity' + caveat)
      : failV(n + ' finding(s) of some severity' + caveat);
  },

  manifest_hmac_block_present(ctx) {
    const withBlock = ctx.obs.manifests.filter((m) => m.provenance_block);
    if (!ctx.obs.manifests.length) return failV('no manifest to read');
    if (withBlock.length === 0) {
      return failV('no registered manifest carries a provenance block, so none can be HMAC-signed');
    }
    /* Present, and that is as far as any tool gets. The validator has
       no tenant secret, and the runtime exposes no manifest
       verification to ask -- sign_provenance / verify_provenance cover
       an event's detail.source, never a manifest (audit N-36). */
    return unverified(withBlock.length + ' of ' + ctx.obs.manifests.length
      + ' manifest(s) carry a provenance block, and no tool can confirm it is authentic: '
      + 'the validator holds no tenant secret and the runtime exposes no manifest verification (audit N-36)');
  },

  action_completion_events(ctx) {
    if (!ctx.drive) {
      return unverified('behavioural: needs --drive. ' + ctx.actionIds.length
        + ' action element(s) advertised and none were clicked, so whether they fire nac:action:succeeded is unmeasured');
    }
    const driven = ctx.driveResults.filter((r) => ctx.actionIds.indexOf(r.id) >= 0);
    if (!driven.length) return failV('no data-nac-role="action" element is advertised, so the page fires nothing');
    const navigated = driven.filter((r) => r.navigated);
    /* A navigating anchor that emits nothing is NOT a measured failure.
       Its side effect is leaving the page, and nothing can emit a
       completion event after its own unload -- so the requirement as
       written has no outcome a tool can record for it either way. The
       validator says that, instead of counting it as a defect of the
       page or quietly as a pass. Audit N-38. */
    const navSilent = driven.filter((r) => !r.succeeded && !r.navigated && r.nav_link);
    const silent = driven.filter((r) => !r.succeeded && !r.navigated && !r.nav_link);
    if (silent.length) {
      return failV(silent.length + ' of ' + driven.length + ' scripted action(s) did not fire nac:action:succeeded: '
        + silent.slice(0, 4).map((r) => r.id).join(', ') + (silent.length > 4 ? ', ...' : ''));
    }
    if (navSilent.length) {
      return unverified((driven.length - navSilent.length - navigated.length) + ' of ' + driven.length
        + ' action(s) fired nac:action:succeeded. The other ' + navSilent.length
        + ' are plain links whose side effect is a navigation, and no element can emit a completion'
        + ' event after its own unload, so this requirement has no outcome a tool can record for them'
        + ' (audit N-38): ' + navSilent.slice(0, 4).map((r) => r.id).join(', ')
        + (navSilent.length > 4 ? ', ...' : ''));
    }
    if (navigated.length) {
      /* Not a pass. The event may well have fired; the page went away
         before anything could watch it, and "probably fired" is not a
         measurement. */
      return unverified((driven.length - navigated.length) + ' of ' + driven.length
        + ' action(s) fired nac:action:succeeded, and ' + navigated.length
        + ' navigated the page away before the event could be observed: '
        + navigated.slice(0, 4).map((r) => r.id).join(', ') + (navigated.length > 4 ? ', ...' : ''));
    }
    return pass('all ' + driven.length + ' advertised action(s) fired nac:action:succeeded');
  },

  click_resolves_and_lands(ctx) {
    /* Resolution is decidable by reading; that a click LANDS is not.
       So the unresolved half is reported even without --drive, because
       an advertised id that does not resolve is already a definite
       no -- a validator that stayed silent about it until someone
       passed a flag would be hiding a measured failure. */
    const unresolved = ctx.obs.advertised.filter((a) => !ctx.domIds.has(a.nac_id));
    if (!ctx.obs.advertised.length) return failV('the page advertises no id at all');
    if (unresolved.length) {
      return failV(unresolved.length + ' of ' + ctx.obs.advertised.length
        + ' advertised id(s) do not resolve in the DOM: '
        + unresolved.slice(0, 4).map((a) => a.nac_id).join(', ') + (unresolved.length > 4 ? ', ...' : '')
        + ' (finding codes missing_in_dom / plugin_not_mounted)');
    }
    if (!ctx.drive) {
      return unverified('all ' + ctx.obs.advertised.length
        + ' advertised id(s) resolve in the DOM; whether a click LANDS is behavioural and needs --drive');
    }
    /* The same distinction as above: a click on a plain link LANDED --
       it would have navigated -- and timed out only because nothing
       can report a completion after unload. Counting that as "the
       click did not work" would blame the page for a hole in the
       requirement (audit N-38). */
    const navTimeout = ctx.driveResults.filter((r) => r.click_error && r.nav_link);
    const bad = ctx.driveResults.filter((r) => r.click_error && !r.nav_link);
    const navigated = ctx.driveResults.filter((r) => r.navigated).length;
    const scope = ctx.driveResults.length + ' of ' + ctx.obs.advertised.length
      + ' advertised id(s) clicked (the rest carry roles with no completion event, so a click on them cannot be observed)'
      + (navigated ? '; ' + navigated + ' of those navigated the page, which is a side effect landing, not a failure' : '');
    if (bad.length) {
      return failV(bad.length + ' click(s) did not land: '
        + bad.slice(0, 4).map((r) => r.id + ' -> ' + r.click_error).join(', ')
        + (bad.length > 4 ? ', ...' : '') + '; ' + scope);
    }
    if (navTimeout.length) {
      return unverified('every advertised id resolves, and ' + scope
        + '. ' + navTimeout.length + ' of the clicks timed out waiting for a completion event because'
        + ' the element is a plain link: the click landed, and nothing can report it after unload'
        + ' (audit N-38)');
    }
    return pass('every advertised id resolves, and ' + scope);
  },
};

export const IMPLEMENTED_DECIDERS = Object.keys(DECIDERS).sort();

/* ---- the report ------------------------------------------------------ */

function decideAll(levels, ctx) {
  const out = [];
  for (const lv of levels.levels) {
    for (const r of lv.requirements) {
      let v;
      if (!r.machine_checkable) {
        v = unverified('not decidable by a tool: ' + (r.note || 'no tool can decide this'));
      } else if (!DECIDERS[r.decider]) {
        /* Cannot happen through the build gate; kept because a
           published contract outlives the binary that read it, and a
           validator that silently skipped a requirement would report a
           level it never measured. */
        v = unverified('this build implements no decider named "' + r.decider + '"');
      } else {
        v = DECIDERS[r.decider](ctx);
      }
      out.push({
        level: lv.level,
        level_id: lv.id,
        requirement_id: r.id,
        text: r.text,
        machine_checkable: r.machine_checkable,
        check: r.check,
        decider: r.decider,
        verdict: v.verdict,
        detail: v.detail,
      });
    }
  }
  return out;
}

/* The published rule (levels.json .reporting): a level may be reported
   only when every machine_checkable requirement of that level AND of
   every lower level passes; the rest are reported unverified, never
   assumed. The coverage ratio travels with it because the rule alone
   lets a report say "level 1" without saying that three of its four
   requirements were never measured. A level is a measurement, not a
   certificate. */
function reportLevel(levels, verdicts) {
  let reached = null;
  for (const lv of levels.levels) {
    const upto = verdicts.filter((v) => v.level <= lv.level && v.machine_checkable);
    if (upto.length && upto.every((v) => v.verdict === 'pass')) reached = lv;
    else break;
  }
  const at = reached ? verdicts.filter((v) => v.level === reached.level) : [];
  return {
    level: reached ? reached.level : null,
    level_id: reached ? reached.id : null,
    display_name: reached ? reached.display_name : null,
    legacy_display_name: reached ? reached.legacy_display_name : null,
    decided: at.filter((v) => v.verdict !== 'unverified').length,
    total: at.length,
    undecided: at.filter((v) => v.verdict === 'unverified').map((v) => v.requirement_id),
    /* Why no level, when there is none: the first machine-checkable
       requirement that failed. Pointing at it is the difference
       between a verdict and a shrug. */
    blocked_by: reached ? [] : verdicts.filter((v) => v.machine_checkable && v.verdict === 'fail')
      .map((v) => v.requirement_id),
    blocked_by_unverified: reached ? [] : verdicts.filter((v) => v.machine_checkable && v.verdict === 'unverified')
      .map((v) => v.requirement_id),
  };
}

export async function validateUrl(url, opts = {}) {
  const {
    drive = false,
    driveRoles = ['action'],
    timeoutMs = 30000,
    settleMs = 400,
    perActionMs = 250,
    driveLimit = 0,
    onProgress = () => {},
  } = opts;

  const levels = loadLevels();
  const { chromium, from } = await resolveChromium();

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  let obs = null;
  let driveResults = [];
  let settled = null;

  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String((e && e.message) || e)));

    onProgress('loading ' + url);
    /* domcontentloaded, not load: a real page with web fonts, an
       analytics beacon or a lazy iframe can leave the load event
       pending for the whole budget, and a validator that timed out on
       a page the browser had already rendered would be reporting about
       the network. The registry settle below is the signal that
       matters -- it waits for the thing being measured. */
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    try {
      await page.waitForFunction(() => !!window.NAC, null, { timeout: timeoutMs });
    } catch (_) {
      return {
        url, nac: false, playwright_from: from, console_errors: consoleErrors,
        error: 'the page loaded and never exposed window.NAC, so there is no NAC3 contract to validate',
      };
    }

    settled = await settle(page, { settleMs, timeoutMs });
    onProgress('registry settled at ' + settled.plugins + ' plugin(s)'
      + (settled.settled ? '' : ' (still moving when the clock ran out)'));
    obs = await page.evaluate(pageObservation);

    if (drive) {
      const roles = driveRoles.indexOf('all') >= 0
        ? Object.keys(levels.click_observable_roles)
        : driveRoles;
      let ids = obs.advertised.filter((a) => roles.indexOf(a.role) >= 0).map((a) => a.nac_id);
      if (driveLimit > 0) ids = ids.slice(0, driveLimit);

      /* A popup does not destroy the page, but it does leave a browser
         window nobody closes and it hides the side effect from the
         listener. Neutralised and treated as the click having landed.

         Aborting the NAVIGATIONS was the first thing tried here and it
         is the wrong tool: Chromium commits an error page, the
         execution context dies anyway, and the abort also catches the
         validator's own recovery navigation. So navigations are
         allowed to happen and the loop restores the page after each
         one -- the honest shape, since a link that navigates has
         performed its side effect. */
      /* Keep the page under the validator's feet.

         A NAC action is very often a plain anchor with an href, and
         clicking one navigates: the execution context dies, the
         completion event becomes unobservable, and every id after it
         would be measured on a different page.

         What works is cancelling the DEFAULT action in the bubble
         phase at window: by then every handler the page installed has
         already run -- so the side effect under test happens and the
         completion event fires -- and the browser has not yet followed
         the link. What does NOT work, tried and measured here, is
         aborting the navigation REQUEST: Chromium commits an error
         page, the context dies anyway, and the abort also catches the
         validator's own recovery navigation, so the run died on the
         first CTA. The restore loop below stays as the backstop for
         the programmatic navigations this cannot reach. */
      await page.addInitScript(() => {
        window.open = function () { return null; };
        window.addEventListener('click', function (e) {
          const t = e.target;
          const a = t && t.closest ? t.closest('a[href]') : null;
          if (a) e.preventDefault();
        }, false);
        window.addEventListener('submit', function (e) { e.preventDefault(); }, false);
      });
      /* The init script only applies to documents loaded AFTER it is
         installed, and this page is already loaded, so the same guard
         is installed once directly for the current document. */
      await page.evaluate(() => {
        window.open = function () { return null; };
        window.addEventListener('click', function (e) {
          const t = e.target;
          const a = t && t.closest ? t.closest('a[href]') : null;
          if (a) e.preventDefault();
        }, false);
        window.addEventListener('submit', function (e) { e.preventDefault(); }, false);
      });

      onProgress('driving ' + ids.length + ' id(s) of role ' + roles.join('/'));
      const startUrl = obs.url || url;
      for (const id of ids) {
        const r = await driveOne(page, id, { perActionMs });
        driveResults.push(r);
        if (r.navigated || page.url() !== startUrl) {
          /* Put the page back before the next id. Measuring id number
             two on whatever page id number one navigated to would be
             reporting about a page nobody asked about. Retried,
             because a navigation already in flight can interrupt the
             restore -- and a validator that gave up there would blame
             the page for the browser being mid-redirect. */
          onProgress('the page navigated on ' + id + '; restoring it');
          let restored = false;
          for (let attempt = 0; attempt < 3 && !restored; attempt += 1) {
            try {
              await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
              restored = true;
            } catch (e) {
              await new Promise((res) => setTimeout(res, 200));
            }
          }
          if (!restored) {
            r.restore_failed = true;
            onProgress('could not restore the page after ' + id + '; stopping the drive here');
            break;
          }
          await settle(page, { settleMs, timeoutMs });
        }
      }
    }
  } finally {
    await browser.close();
  }

  const ctx = {
    obs,
    levels,
    drive,
    driveResults,
    domIds: new Set(obs.dom_id_list),
    actionIds: obs.advertised.filter((a) => a.role === 'action').map((a) => a.nac_id),
  };

  const verdicts = decideAll(levels, ctx);

  /* A warning ABOUT THE INSTRUMENT ON THE PAGE, not about the page.
     Audit N-33: before 2.5.0, validate_global() read only the legacy
     manifest groups, so against a manifest written the documented way
     it reported total_ids = 0 and called every declared element an
     orphan -- and then answered ok = true. A validator that relayed
     that flood of phantom findings without naming the cause would
     hand somebody a page that looks broken and is not. The signature
     is unmistakable: manifests registered, ids in the DOM, and the
     runtime claiming it knows of no declared id. */
  const warnings = [];
  if (obs.plugin_count >= 1 && obs.total_ids === 0 && obs.dom_ids > 0) {
    warnings.push('THE RUNTIME ON THIS PAGE CANNOT SEE ITS OWN MANIFESTS. It reports '
      + obs.plugin_count + ' registered manifest(s), ' + obs.dom_ids + ' ids in the DOM and 0 declared ids, '
      + 'which is the signature of audit N-33 -- a validator blind to the canonical elements[] manifest shape. '
      + 'Every orphan finding below is a false positive produced by that blindness, and the level verdicts that '
      + 'depend on validate_global are measuring the instrument, not the page. Serve a runtime at 2.5.0 or later.');
  }
  if (obs.version && levels.version && obs.version !== levels.version) {
    warnings.push('the page serves runtime ' + obs.version + ' and this validator was built for '
      + levels.version + '; where they disagree, the page is what an adopter actually gets');
  }

  return {
    url: obs.url || url,
    warnings,
    nac: true,
    playwright_from: from,
    runtime_version: obs.version,
    spec_version: obs.spec_version,
    conformance_tier: obs.conformance_tier,
    strict_versioning: obs.strict_versioning,
    validator_version: levels.version,
    validator_spec_version: levels.spec_version,
    settled,
    plugin_count: obs.plugin_count,
    declared_ids: obs.total_ids,
    dom_ids: obs.dom_ids,
    findings: obs.findings,
    tolerated_count: obs.tolerated_count,
    console_errors: consoleErrors,
    drive,
    drive_results: driveResults,
    verdicts,
    report: reportLevel(levels, verdicts),
    reporting_rule: levels.reporting,
  };
}
