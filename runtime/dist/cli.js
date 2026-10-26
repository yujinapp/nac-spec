#!/usr/bin/env node
/* =====================================================================
   NAC CLI v2.5.1 -- the entry point.

   Two modes, and they do not pretend to be each other:

     URL        loads the page in a real browser, asks the runtime what
                it registered, and REPORTS A CONFORMANCE LEVEL against
                the identifiers published in levels.json. Needs
                Playwright, which is optional and resolved at call
                time. Add --drive to let it click, which is what
                decides the two behavioural requirements of level 1.

     directory  static lint of HTML/PHP files for data-nac-id /
                data-nac-role coherence. It CANNOT decide a level --
                not one requirement of section 8 is decidable from
                files on disk -- and it says so instead of printing a
                number nobody measured.

   Audit N-18: before 2.5.0 the URL mode aborted with exit 2 and no
   mode ever printed a level, while SPEC.md section 8 promised this
   command "reports the highest level a page reaches".

   The version in the banner is substituted by runtime/build.mjs from
   the authoritative constant in js/nac.js. Do not type it here: that
   is audit N-17, and scripts/check-version-coherence.mjs refuses it.

   ASCII only.
   ===================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { staticLint } from './cli-lint.mjs';

const VERSION = '2.5.1';
const SPEC_VERSION = '2.5';

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name) {
  return args.indexOf('--' + name) >= 0;
}
function opt(name, dflt) {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : dflt;
}

function showHelp() {
  console.log('NAC CLI v' + VERSION);
  console.log('');
  console.log('Usage:');
  console.log('  nac validate <url> [options]      load the page and report a conformance level');
  console.log('  nac validate <dir> [options]      static lint of files (cannot decide a level)');
  console.log('  nac --version');
  console.log('  nac --help');
  console.log('');
  console.log('Options:');
  console.log('  --severity=error|warn|info  lowest severity that fails the exit code (default error)');
  console.log('  --drive                     CLICK the advertised controls. Decides the two');
  console.log('                              behavioural requirements of level 1. NOT read-only:');
  console.log('                              never point it at a production page you care about.');
  console.log('  --drive-roles=a,b | all     which roles to click (default action)');
  console.log('  --drive-limit=N             click at most N ids (default 0 = all)');
  console.log('  --timeout=MS                page load / settle budget (default 30000)');
  console.log('  --json                      emit the whole report as JSON instead of prose');
  console.log('');
  console.log('URL mode needs Playwright, which is NOT a dependency of this package:');
  console.log('  npm i -D playwright && npx playwright install chromium');
}

function showVersion() {
  console.log('@nac3/runtime CLI ' + VERSION + ' (Native Agent Contract v' + SPEC_VERSION + ')');
}

if (!cmd || cmd === '--help' || cmd === '-h') { showHelp(); process.exit(0); }
if (cmd === '--version' || cmd === '-v') { showVersion(); process.exit(0); }

if (cmd !== 'validate') {
  console.error('error: unknown command: ' + cmd);
  showHelp();
  process.exit(2);
}

const target = args[1];
if (!target || target.startsWith('--')) {
  console.error('error: validate requires a URL or directory argument');
  process.exit(2);
}

const sevRank = { info: 0, warn: 1, error: 2 };
const minSev = opt('severity', 'error');
if (!(minSev in sevRank)) {
  console.error('error: --severity must be one of error, warn, info (got "' + minSev + '")');
  process.exit(2);
}

/* ---- URL mode ------------------------------------------------------- */

function verdictTag(v) {
  if (v === 'pass') return 'PASS';
  if (v === 'fail') return 'FAIL';
  return 'UNVERIFIED';
}

async function runUrl(url) {
  const mod = await import('./cli-url.mjs');
  let report;
  try {
    report = await mod.validateUrl(url, {
      drive: flag('drive'),
      driveRoles: opt('drive-roles', 'action').split(',').map((s) => s.trim()).filter(Boolean),
      driveLimit: Number(opt('drive-limit', '0')) || 0,
      timeoutMs: Number(opt('timeout', '30000')) || 30000,
      onProgress: (m) => { if (!flag('json')) console.error('  ... ' + m); },
    });
  } catch (e) {
    if (e instanceof mod.PlaywrightMissing) {
      console.error('error: URL mode needs a Playwright chromium launcher and none resolved.');
      for (const t of (e.tried || [])) console.error('  tried ' + t);
      console.error('');
      console.error('Playwright is deliberately NOT a dependency of @nac3/runtime: a runtime that');
      console.error('pulled a browser into every install would charge every adopter for a tool most');
      console.error('of them never run. Install it where you need it:');
      console.error('  npm i -D playwright');
      console.error('  npx playwright install chromium');
      console.error('');
      console.error('Static lint of a directory needs nothing and works now:  nac validate <dir>');
      process.exit(3);
    }
    console.error('error: ' + ((e && e.message) || e));
    process.exit(2);
  }

  if (flag('json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printUrlReport(report);
  }

  if (!report.nac) process.exit(1);
  /* What the exit code means, stated once so nobody has to infer it:
     a page AT level N necessarily fails something at level N+1 -- that
     is what "level N" means. So a failing requirement above the level
     reported is the expected shape of a pass, not an error. Exit 1 is
     for a page that reaches no level at all, for a requirement failing
     at or below the level claimed, and for findings at or above the
     severity threshold the caller asked about. */
  const level = report.report.level;
  const failing = report.findings.filter(
    (f) => (sevRank[f.severity] === undefined ? 2 : sevRank[f.severity]) >= sevRank[minSev]);
  const failedAtOrBelow = report.verdicts.filter(
    (v) => v.verdict === 'fail' && level !== null && v.level <= level);
  process.exit(level === null || failing.length > 0 || failedAtOrBelow.length > 0 ? 1 : 0);
}

function printUrlReport(r) {
  console.log('');
  console.log('NAC3 validation -- ' + r.url);
  if (!r.nac) {
    console.log('  ' + r.error);
    if (r.console_errors.length) {
      console.log('  console errors: ' + r.console_errors.length);
      for (const c of r.console_errors.slice(0, 5)) console.log('    ' + c);
    }
    return;
  }
  console.log('  runtime on the page   ' + r.runtime_version + '  (spec v' + r.spec_version + ')');
  console.log('  validator             ' + r.validator_version + '  (spec v' + r.validator_spec_version + ')');
  /* A tier is not a level, and the only way a reader stops conflating
     them is to see them labelled differently in the same breath
     (audit N-29). */
  console.log('  conformance_tier      ' + r.conformance_tier + '   [tier != level: the tier is what the RUNTIME implements]');
  console.log('  manifests registered  ' + r.plugin_count
    + ' | ids declared ' + r.declared_ids + ' | ids in the DOM ' + r.dom_ids);
  if (r.console_errors.length) {
    console.log('  console errors        ' + r.console_errors.length + ' (first: ' + r.console_errors[0] + ')');
  }

  if (r.warnings && r.warnings.length) {
    console.log('');
    for (const w of r.warnings) {
      console.log('WARNING: ' + w);
    }
  }

  console.log('');
  console.log('Requirements (SPEC.md section 8, as published in levels.json)');
  let lastLevel = null;
  for (const v of r.verdicts) {
    if (v.level !== lastLevel) {
      lastLevel = v.level;
      console.log('  -- nac3-conformance-level-' + v.level + ' --');
    }
    console.log('  [' + verdictTag(v.verdict).padEnd(10) + '] ' + v.requirement_id
      + (v.machine_checkable ? '' : ' (human)'));
    console.log('               ' + v.text);
    console.log('               ' + v.detail);
  }

  console.log('');
  const rep = r.report;
  if (rep.level === null) {
    console.log('Conformance level: NONE ASSERTED');
    if (rep.blocked_by.length) {
      console.log('  measured and failing: ' + rep.blocked_by.join(', '));
    }
    if (rep.blocked_by_unverified.length) {
      console.log('  not measured: ' + rep.blocked_by_unverified.join(', ')
        + (r.drive ? '' : '  (add --drive to decide the behavioural ones)'));
    }
  } else {
    console.log('Conformance level: ' + rep.level_id);
    console.log('  display name: ' + rep.display_name
      + '  (pre-2.5.0 alias: ' + rep.legacy_display_name + ')');
    console.log('  asserted on ' + rep.decided + ' of ' + rep.total + ' requirements at this level');
    if (rep.undecided.length) {
      console.log('  NOT decided by this tool: ' + rep.undecided.join(', '));
    }
    console.log('  This is a MEASUREMENT, not a certification. ' + rep.undecided.length
      + ' requirement(s) at this level were not decided by any tool.');
  }
  if (!r.drive) {
    console.log('');
    console.log('  Read-only run: nothing on the page was clicked. The two behavioural');
    console.log('  requirements of level 1 stay unverified until you add --drive.');
  } else {
    console.log('');
    console.log('  Driven run: ' + r.drive_results.length + ' id(s) clicked.');
  }
}

/* ---- directory mode ------------------------------------------------- */

function runDir(dir) {
  if (!fs.existsSync(dir)) { console.error('error: not found: ' + dir); process.exit(2); }
  const findings = staticLint(dir);
  const min = sevRank[minSev];
  const failing = findings.filter((f) => (sevRank[f.severity] ?? 2) >= min);
  for (const f of findings) {
    console.log('[' + f.severity.toUpperCase() + ']', f.code, '--', f.message, f.file ? '(' + f.file + ')' : '');
  }
  console.log('');
  console.log('Total findings:', findings.length, '|', 'Failing at severity >=', minSev + ':', failing.length);
  console.log('');
  /* Saying this out loud is the point. The old CLI printed a finding
     count and stopped, and a reader could reasonably take a clean lint
     for a conformance result. Not one requirement of section 8 is
     decidable from files on disk: three of the eleven need the page
     driven, and the rest need the runtime's own view of what it
     registered. */
  console.log('Conformance level: NOT DECIDABLE IN THIS MODE');
  console.log('  A static lint reads files; every requirement of SPEC.md section 8 is about');
  console.log('  what the RUNTIME registered and what the page DOES. Point this at a URL to');
  console.log('  get a level:   nac validate <url> --drive');
  process.exit(failing.length > 0 ? 1 : 0);
}

/* ---- dispatch ------------------------------------------------------- */

if (/^https?:\/\//.test(target)) {
  runUrl(target);
} else {
  runDir(path.resolve(target));
}
