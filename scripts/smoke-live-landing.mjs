/*
 * smoke-live-landing.mjs -- the no-browser half of the post-deploy smoke
 * check for the landing page.
 *
 * It answers one question: did the host receive and serve THIS tree?
 * Every expectation is DERIVED from the repository being deployed -- the
 * version, the version badge, the SRI tags, the immutable runtime path,
 * the ids the limits section declares, the two licenses it names, and
 * the link back to Urazuke. Nothing is typed in here.
 *
 * Why it exists. The deploy workflow used to inline these assertions as
 * grep literals, including the exact markup
 *     <h2>What NAC3 does not cover</h2>
 * The landing rewrite reworded that heading and moved it behind
 * data-i18n, so the step would have rsynced the whole tree and THEN gone
 * red, on a deploy that was otherwise correct. That is the N-17 shape --
 * a consumer holding a hand-typed copy of something it does not own --
 * applied to the deploy gate itself. A literal inside YAML also cannot
 * be tested, which is why nobody noticed; this file can be, and
 * --selftest proves it goes red on each regression it claims to guard.
 *
 * A derived expectation brings its own failure mode: derive nothing,
 * assert nothing, pass. Every derivation below is floored, and an empty
 * one is a refusal rather than a green.
 *
 * Run:
 *   node scripts/smoke-live-landing.mjs --base https://yujin.app/nac-spec/
 *   node scripts/smoke-live-landing.mjs            (serves this repository)
 *   node scripts/smoke-live-landing.mjs --selftest (the red cases)
 *
 * --base is an argument and not only an env var on purpose: the env-var
 * form does not reach the process on cmd.exe, and a check that silently
 * falls back to the local copy reports green about the repository while
 * the operator believes it measured the site. A receipt that names the
 * wrong subject is worse than no receipt. Same lesson, same shape, as
 * e2e/landing-limits-check.mjs.
 *
 * ASCII-only.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let ANNOTATE = !!process.env.GITHUB_ACTIONS;

/* The floors. A derivation that comes back under its floor is a broken
   tree, not a passing check. */
const MIN_LIMIT_IDS = 13; /* 8 limits + the section + 4 nature/license anchors */
const MIN_SRI_TAGS = 3;   /* runtime, extensions, chat client */

function annotate(msg) {
  if (ANNOTATE) console.log('::error::' + msg);
}

/* ---------- derive what the server is supposed to be serving ---------- */
function derive(indexHtmlOverride) {
  const html = indexHtmlOverride !== undefined
    ? indexHtmlOverride
    : readFileSync(join(ROOT, 'index.html'), 'utf8');
  const receipt = JSON.parse(readFileSync(join(ROOT, 'js', 'integrity.json'), 'utf8'));
  const problems = [];

  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/) || [])[1];
  if (!title) problems.push('index.html declares no <title> to assert');

  /* The version badge is the human-visible claim about which release
     this is. Taken verbatim from the page rather than reassembled here,
     so a reworded channel travels on its own. */
  const badge = (html.match(/class="vbadge"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/) || [])[1];
  if (!badge) {
    problems.push('index.html paints no version badge (.vbadge > span) to assert');
  } else if (!badge.includes(receipt.version)) {
    problems.push('the version badge "' + badge + '" does not name the version being shipped ('
      + receipt.version + ')');
  }

  /* Every script that ships with an integrity attribute, src and hash
     together: the pair is what the browser enforces, so the pair is what
     the host has to be serving. */
  const sri = [];
  const tagRe = /<script\b[^>]*\bsrc="([^"]+)"[^>]*\bintegrity="(sha384-[^"]+)"[^>]*>/g;
  for (let m; (m = tagRe.exec(html)) !== null;) sri.push({ src: m[1], integrity: m[2] });
  if (sri.length < MIN_SRI_TAGS) {
    problems.push('index.html carries ' + sri.length
      + ' SRI-pinned script tags, expected at least ' + MIN_SRI_TAGS);
  }

  /* The limits section, by the ids it DECLARES. The owner approved those
     limits as addressable data and not only as prose (D-04 / N-09), and
     an id is the one part of the section that survives a rewording and
     reads identically in all ten locales -- which is exactly what the
     old literal heading check could not say.
     Collected, and later asserted, as the data-nac-id ATTRIBUTE rather
     than as a bare substring. The bare form looked equivalent and was
     not: every one of these ids is also named in the page's own manifest
     block and in a narration string, so a host that stripped the markup
     and left the script behind satisfied it. The first run of --selftest
     caught that, which is the only reason it is written this way. */
  const idAttr = (id) => 'data-nac-id="' + id + '"';
  const ids = [...new Set(
    [...html.matchAll(
      /data-nac-id="(nac_landing\.(?:section\.limits|limits?\.[a-z0-9_]+))"/g)]
      .map((m) => m[1]),
  )].sort();
  if (ids.length < MIN_LIMIT_IDS) {
    problems.push('index.html declares ' + ids.length + ' limits-section ids, expected at least '
      + MIN_LIMIT_IDS + ' (an empty or thinned derivation is a refusal, not a pass)');
  }

  /* The licenses are the owner's criterion for items 3 and 4 of the
     verification block: the page names its own license and the method's,
     next to each other. Read the link texts instead of retyping them. */
  const licenses = [];
  const licRe = /<a\b[^>]*data-nac-id="nac_landing\.limits\.(?:license_nac3|urazuke)"[^>]*>([^<]+)<\/a>/g;
  for (let m; (m = licRe.exec(html)) !== null;) licenses.push(m[1].trim());
  if (licenses.length < 2) {
    problems.push('index.html names ' + licenses.length
      + ' of the 2 licenses in the limits section');
  }

  /* The link back to the method, read off the footer anchor that owns it. */
  const urazuke = (html.match(
    /<a\b[^>]*href="([^"]+)"[^>]*data-nac-id="nac_landing\.footer\.urazuke"/) || [])[1];
  if (!urazuke) problems.push('index.html has no footer link back to Urazuke to assert (N-15)');

  return {
    version: receipt.version,
    immutable: receipt.immutable_path,
    title,
    badge,
    sri,
    ids,
    idAttr,
    licenses,
    urazuke,
    problems,
  };
}

/* ---------- assert it against a base URL ---------- */
async function verify(base, expect, log) {
  const failures = [];
  const root = base.endsWith('/') ? base : base + '/';
  const pass = (name, ok, detail) => {
    log((ok ? 'OK    ' : 'FAIL  ') + name + (detail ? '  ' + detail : ''));
    if (!ok) {
      const line = name + (detail ? ': ' + detail : '');
      failures.push(line);
      annotate(line);
    }
  };

  for (const p of expect.problems) pass('the tree being deployed is assertable', false, p);

  let body = '';
  try {
    const res = await fetch(root, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    body = await res.text();
  } catch (err) {
    pass('the landing page responds', false, root + ' -- ' + err.message);
    return failures;
  }
  pass('the landing page responds', true, root + ' (' + body.length + ' bytes)');

  pass('the served page is this page', body.includes(expect.title),
    JSON.stringify(expect.title));

  pass('the served page announces the version being shipped',
    body.includes(expect.badge), JSON.stringify(expect.badge));

  for (const tag of expect.sri) {
    pass('the served page pins ' + tag.src,
      body.includes('src="' + tag.src + '"') && body.includes('integrity="' + tag.integrity + '"'),
      tag.integrity.slice(0, 20) + '...');
  }

  pass('the served page offers the immutable runtime path',
    body.includes(expect.immutable), expect.immutable);

  try {
    const res = await fetch(root + expect.immutable, { redirect: 'follow' });
    pass('the immutable runtime path is being served', res.ok, 'HTTP ' + res.status);
    if (res.body) await res.arrayBuffer();
  } catch (err) {
    pass('the immutable runtime path is being served', false, err.message);
  }

  const missing = expect.ids.filter((id) => !body.includes(expect.idAttr(id)));
  pass('the served page declares all ' + expect.ids.length + ' limits-section ids',
    missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : '');

  for (const lic of expect.licenses) {
    pass('the served page names the license ' + JSON.stringify(lic), body.includes(lic));
  }

  pass('the served page links back to the method',
    body.includes(expect.urazuke), expect.urazuke);

  return failures;
}

/* ---------- a local server over the tree, with an in-memory overlay so
              the red cases need no copy of the repository ---------- */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function serve(overlay = {}) {
  const server = createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const key = urlPath.replace(/^\/+/, '');
    if (Object.prototype.hasOwnProperty.call(overlay, key)) {
      const v = overlay[key];
      if (v === null) {
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('gone');
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(key)] || 'application/octet-stream' });
      res.end(v);
      return;
    }
    const file = join(ROOT, key);
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({
    server,
    base: 'http://127.0.0.1:' + server.address().port + '/',
  })));
}

/* ---------- the red cases ---------- */
async function selftest() {
  /* The red cases ARE refusals, so they must not reach the workflow log
     as ::error:: annotations. Letting them through made the first green
     deploy of this check read as a run with eleven errors in it, which
     is how a reader learns to ignore errors. Same mistake the retry
     path was already written to avoid, in the one place it was not. */
  ANNOTATE = false;
  const quiet = () => {};
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const receipt = JSON.parse(readFileSync(join(ROOT, 'js', 'integrity.json'), 'utf8'));
  const pristine = derive();
  const results = [];

  const run = async (label, expectRed, overlay, expectation) => {
    const { server, base } = await serve(overlay);
    let failures;
    try {
      failures = await verify(base, expectation || pristine, quiet);
    } finally {
      server.close();
    }
    const red = failures.length > 0;
    const good = expectRed ? red : !red;
    results.push({ label, good, red, failures });
    console.log((good ? (expectRed ? 'RED-OK   ' : 'GREEN-OK ') : 'BROKEN   ') + label
      + (red ? '  [' + failures.length + ' refusal(s): ' + failures[0] + ']' : ''));
  };

  await run('the committed tree, served as it will be deployed, passes', false, {});

  await run('a host that drops the limits section is refused', true, {
    'index.html': html.replace(/<section id="limits"[\s\S]*?<\/section>/, '<section></section>'),
  });

  await run('a host that drops one declared limit is refused', true, {
    'index.html': html.replace('data-nac-id="nac_landing.limit.shadow"', 'data-nac-id="x"'),
  });

  await run('a host still serving the previous version badge is refused', true, {
    'index.html': html.replace(/class="vbadge"([^>]*)>\s*<span([^>]*)>[^<]+<\/span>/,
      'class="vbadge"$1><span$2>v0.0.0 &middot; stable</span>'),
  });

  await run('a host that rewrites an SRI hash is refused', true, {
    'index.html': html.replace(/integrity="sha384-[^"]+"/,
      'integrity="sha384-' + 'A'.repeat(64) + '"'),
  });

  await run('a host that is not serving the immutable runtime path is refused', true, {
    [receipt.immutable_path]: null,
  });

  await run('a host that drops the method license is refused', true, {
    'index.html': html.replace(
      /(data-nac-id="nac_landing\.limits\.urazuke"[^>]*>)[^<]+/, '$1Urazuke'),
  });

  await run('a host that drops the link back to the method is refused', true, {
    'index.html': html.split(pristine.urazuke).join('https://example.invalid/'),
  });

  /* The trap a derived check brings with it: derive nothing, assert
     nothing, pass. Here the TREE is what is tampered with, not the host,
     so the refusal has to come out of derive() itself. */
  const blind = derive(html.replace(
    /nac_landing\.(section\.limits|limits?\.[a-z0-9_]+)/g, 'blinded.$1'));
  await run('a tree whose limits section declares no ids is refused, not passed over',
    true, {}, blind);

  /* And the behavioural guard for the line above, because a comment is
     not a lock: run this same selftest as a child with the CI variable
     set and assert that not one annotation comes out of a green run.
     The child skips this case, so there is no recursion. */
  if (!process.env.SMOKE_SELFTEST_CHILD) {
    let out = '';
    let childFailed = false;
    try {
      out = execFileSync(process.execPath, [process.argv[1], '--selftest'], {
        env: { ...process.env, GITHUB_ACTIONS: 'true', SMOKE_SELFTEST_CHILD: '1' },
        encoding: 'utf8',
      });
    } catch (err) {
      out = (err.stdout || '') + (err.stderr || '');
      childFailed = true;
    }
    const annotations = (out.match(/::error::/g) || []).length;
    const good = !childFailed && annotations === 0;
    results.push({ label: 'a green selftest annotates nothing in CI', good, red: false, failures: [] });
    console.log((good ? 'GREEN-OK ' : 'BROKEN   ')
      + 'a green selftest annotates nothing in CI'
      + (good ? '' : '  [' + annotations + ' annotation(s)'
        + (childFailed ? ', and the child run itself failed' : '') + ']'));
  }

  const broken = results.filter((r) => !r.good);
  console.log('');
  console.log((results.length - broken.length) + ' passed, ' + broken.length + ' failed');
  if (broken.length) {
    for (const b of broken) console.log('  BROKEN: ' + b.label);
    process.exit(1);
  }
  console.log('The live-landing smoke check refuses every regression it claims to guard.');
}

/* ---------- entry ---------- */
const argv = process.argv.slice(2);
const baseFlag = (() => {
  const i = argv.indexOf('--base');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith('--base='));
  return inline ? inline.slice('--base='.length) : null;
})();

if (argv.includes('--selftest')) {
  await selftest();
} else {
  const expect = derive();
  let server = null;
  let base = baseFlag || process.env.N0_BASE || null;
  if (!base) {
    const local = await serve();
    server = local.server;
    base = local.base;
  }
  console.log('smoke-live-landing -- base: ' + base
    + (server ? ' (served from this repository)' : ' (external)'));
  console.log('version under test: ' + expect.version);

  /* A freshly uploaded tree can take a moment to come out the other side
     of the host cache, so the external form gets a few attempts. Only the
     last one annotates: a retry that later succeeds must not leave an
     ::error:: behind, or the run reads red while being green. */
  const retries = (() => {
    const i = argv.indexOf('--retries');
    if (i >= 0 && argv[i + 1]) return Math.max(1, parseInt(argv[i + 1], 10) || 1);
    return 1;
  })();
  const waitMs = 10000;

  let failures = [];
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const last = attempt === retries;
    ANNOTATE = ANNOTATE && last;
    if (retries > 1) console.log('');
    if (retries > 1) console.log('attempt ' + attempt + ' of ' + retries);
    failures = await verify(base, expect, (l) => console.log(l));
    if (!failures.length) break;
    if (!last) {
      console.log(failures.length + ' assertion(s) failed, retrying in '
        + (waitMs / 1000) + 's in case the host is still serving a cached copy.');
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  if (server) server.close();
  console.log('');
  if (failures.length) {
    console.log(failures.length + ' assertion(s) failed.');
    process.exit(1);
  }
  console.log('The host is serving this tree.');
}
