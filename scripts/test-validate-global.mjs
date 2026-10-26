/*
 * test-validate-global.mjs -- the lock on the global validator.
 *
 * Audit N-14 (the buckets carried no code) and audit N-33 (the id collector
 * could not see a manifest written the way the SPEC documents, so the
 * validator reported total_ids = 0, called every declared element an orphan,
 * and still answered ok = true).
 *
 * Two halves, and the second is the one that matters:
 *   GREEN  -- what the validator says about a fixture that provokes all five
 *             buckets on purpose.
 *   RED-OK -- the same assertions against a runtime with the defect planted
 *             back in, in memory. A lock that was never seen failing is not a
 *             lock, it is a ceremony.
 *
 * ASCII-only. Run: node scripts/test-validate-global.mjs
 */
import { loadRuntimeInFixtureDom, FIXTURE_BUCKETS } from './fixture-dom.mjs';

let passed = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { passed++; console.log('OK        ' + name); return; }
  failures.push(name + (detail ? ' -- ' + detail : ''));
  console.log('FAIL      ' + name + (detail ? ' -- ' + detail : ''));
}

function redOk(name, cond, detail) {
  if (cond) { passed++; console.log('RED-OK    ' + name); return; }
  failures.push('[red case] ' + name + (detail ? ' -- ' + detail : ''));
  console.log('FAIL(red) ' + name + (detail ? ' -- ' + detail : ''));
}

/*
 * Plants a defect and hands back the report, or hands back the reason it could
 * not. Two worlds have to end cleanly here:
 *   - on HEAD, a mutation anchor that rotted must come out as a NAMED failure,
 *     because a silently skipped red case is a lock that stopped locking;
 *   - at a base ref that predates the fix the anchors do not exist at all, and
 *     this suite is run there on purpose to prove it goes red. A crash in the
 *     middle would hide every case after it, so the reason is reported and the
 *     run continues.
 */
function planted(mutate) {
  try {
    return { result: loadRuntimeInFixtureDom({ mutate }).result };
  } catch (e) {
    return { unavailable: String((e && e.message) || e) };
  }
}


/* ------------------------------------------------------------------ GREEN */

const { result } = loadRuntimeInFixtureDom();

ok('the validator returns named buckets, not a flat array',
  !Array.isArray(result) && typeof result === 'object');

ok('a manifest in the canonical elements[] shape is seen at all',
  result.total_ids > 0, 'total_ids = ' + result.total_ids);

ok('the canonical ids are all counted (4 from alpha, 1 shared, 1 legacy)',
  result.total_ids === 5, 'total_ids = ' + result.total_ids);

ok('a manifest in the legacy nac_id shape is still read',
  result.unmounted.some((i) => i.nac_id === 'legacy.old_style'));

ok('a DECLARED element that is mounted is not reported as an orphan',
  !result.orphans.some((i) => i.nac_id === 'alpha.ok'),
  result.orphans.map((i) => i.nac_id).join(', '));

ok('the only orphan is the one painted in the DOM and declared nowhere',
  result.orphans.length === 1 && result.orphans[0].nac_id === 'nobody.declares.me',
  result.orphans.map((i) => i.nac_id).join(', '));

for (const bucket of FIXTURE_BUCKETS) {
  const items = result[bucket] || [];
  ok('bucket ' + bucket + ' fires on the fixture', items.length > 0,
    items.length + ' items');
  ok('every item of ' + bucket + ' carries a code',
    items.length > 0 && items.every((i) => typeof i.code === 'string' && i.code),
    JSON.stringify(items.map((i) => i.code)));
  ok('every item of ' + bucket + ' carries a severity',
    items.length > 0 && items.every((i) => i.severity === 'error' || i.severity === 'warn' || i.severity === 'info'),
    JSON.stringify(items.map((i) => i.severity)));
}

ok('the duplicate names both plugins that declared it',
  result.duplicates.length === 1
  && result.duplicates[0].nac_id === 'shared.collision'
  && result.duplicates[0].plugins.join(',') === 'alpha,beta');

ok('a duplicate across plugins is an error, and the result says so',
  result.has_errors === true && result.ok === false);

/* Indexing is guarded on purpose: against a runtime with the defect planted
   back in, some buckets are EMPTY, and a lock that crashes instead of failing
   is a worse witness than one that says which assertion broke. */
const firstCodes = FIXTURE_BUCKETS.map((b) => ((result[b] || [])[0] || {}).code || null);
ok('each bucket uses its own code, never another condition\'s',
  new Set(firstCodes).size === FIXTURE_BUCKETS.length && firstCodes.every(Boolean),
  FIXTURE_BUCKETS.map((b, i) => b + '=' + firstCodes[i]).join(' '));

/* -------------------------------------------------------------- RED CASES */

/* 1. The N-33 defect itself: the collector stops reading elements[]. */
{
  const run = planted((src) => src.replace(
    "    const elems = (m && m.elements) || [];",
    "    const elems = [];"));
  const broken = run.result || {};
  if (run.unavailable) {
    redOk('the N-33 defect could not be planted', false, run.unavailable);
  }
  /* 5 ids down to 1: only the legacy-shaped manifest survives, which is
     exactly the asymmetry N-33 was -- the documented shape invisible, the
     legacy one fine. */
  redOk('a collector blind to elements[] is refused: only the legacy id survives',
    broken.total_ids === 1 && result.total_ids === 5,
    'total_ids = ' + broken.total_ids + ' (whole runtime: ' + result.total_ids + ')');
  redOk('a collector blind to elements[] is refused: declared ids turn into orphans',
    (broken.orphans || []).some((i) => i.nac_id === 'alpha.ok'));
  redOk('a collector blind to elements[] is refused: duplicates can no longer fire',
    (broken.duplicates || []).length === 0 && broken.has_errors === false);
}

/* 2. A bucket losing its code -- the N-14 state, one bucket at a time. */
for (const [code, bucket] of [
  ['nac_id_duplicate_across_plugins', 'duplicates'],
  ['nac_id_orphan_in_dom', 'orphans'],
  ['nac_id_declared_not_mounted', 'unmounted'],
  ['nac_id_missing_plugin_prefix', 'convention_violations'],
]) {
  const run = planted((src) => src.replace("code:     '" + code + "',", ''));
  const broken = run.result || {};
  redOk('an uncoded ' + bucket + ' item is refused',
    !run.unavailable
      && (broken[bucket] || []).length > 0
      && broken[bucket].every((i) => !i.code),
    run.unavailable || JSON.stringify((broken[bucket] || []).map((i) => i.code)));
}

/* 3. A code reused for a different condition -- promise 4 of section 12. */
{
  const run = planted((src) => src.replace(
    "code:     'nac_id_orphan_in_dom',",
    "code:     'nac_id_duplicate_across_plugins',"));
  const broken = run.result || {};
  const codes = FIXTURE_BUCKETS.map((b) => ((broken[b] || [])[0] || {}).code || null);
  redOk('a code reused by two buckets is refused',
    !run.unavailable && new Set(codes).size < FIXTURE_BUCKETS.length,
    run.unavailable || codes.join(', '));
}

/* 4. The mutation harness itself must fail loudly on a stale pattern. */
{
  let threw = false;
  try {
    loadRuntimeInFixtureDom({ mutate: (src) => src.replace('a pattern that is not in the runtime', 'x') });
  } catch (e) { threw = /matched nothing/.test(String(e.message)); }
  redOk('a mutation that matches nothing is refused instead of passing green', threw);
}

console.log('');
if (failures.length) {
  console.log(passed + ' passed, ' + failures.length + ' failed');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
console.log(passed + ' passed, 0 failed');
