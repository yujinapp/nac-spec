#!/usr/bin/env node
/**
 * build-sitemap.mjs -- generates sitemap.xml for the public NAC3 site.
 *
 * WHY A GENERATOR AND NOT A HAND-WRITTEN FILE
 * -------------------------------------------
 * The sitemap has to stay in sync with what is actually deployed. A
 * hand-written list drifts silently; this one refuses to emit an entry
 * whose file does not exist on disk, and takes every <lastmod> from git,
 * so no date is ever invented.
 *
 * INCLUSION CRITERIA (curated -- this is not "everything on disk")
 * ---------------------------------------------------------------
 *   - the specification itself (HTML for humans, .md for tools)
 *   - the public site pages (about, security, contributing, demos, peer reviews)
 *   - benchmark and case studies (the evidence pages)
 *   - every runnable demo: demos/, the reference .php demos, ads-demo
 *   - the guides
 *   - reference docs (accessibility, interop/MCP, test manual, coverage, RFC)
 *
 * EXCLUDED ON PURPOSE (tracked as N-10 in PENDING_AUDITORIA_2026-10.md)
 * --------------------------------------------------------------------
 *   - i18n/**            translations are 30-38% of the canonical text (N-19);
 *                        indexing thin duplicates costs more than it earns
 *   - operativo/interno  launch plans, launch posts, diffusion kit, gif scripts,
 *                        tester checklists and the tester admin tool
 *   - PENDING_*.md       not deployed at all (excluded by the deploy workflow)
 *
 * Usage:
 *   node scripts/build-sitemap.mjs          # write sitemap.xml
 *   node scripts/build-sitemap.mjs --check  # validate only, write nothing
 */

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://yujin.app/nac-spec/';

/** group, path (relative, '' = site root), changefreq, priority */
const PAGES = [
  // -- the contract ------------------------------------------------------
  ['core', '', 'weekly', '1.0'],
  ['core', 'SPEC.html', 'weekly', '0.9'],
  ['core', 'SPEC.md', 'weekly', '0.5'],
  // -- public site -------------------------------------------------------
  ['site', 'ABOUT.html', 'monthly', '0.6'],
  ['site', 'SECURITY.html', 'monthly', '0.5'],
  ['site', 'CONTRIBUTING.html', 'monthly', '0.5'],
  ['site', 'README_DEMOS.html', 'monthly', '0.6'],
  ['site', 'peer-reviews.html', 'monthly', '0.7'],
  // -- evidence: benchmark ----------------------------------------------
  ['evidence', 'benchmark/index.html', 'monthly', '0.8'],
  ['evidence', 'benchmark/methodology.html', 'monthly', '0.7'],
  ['evidence', 'benchmark/results.html', 'monthly', '0.8'],
  // -- evidence: case studies -------------------------------------------
  ['evidence', 'conduit/index.html', 'monthly', '0.7'],
  ['evidence', 'migration/index.html', 'monthly', '0.7'],
  ['evidence', 'migration/methodology.html', 'monthly', '0.6'],
  ['evidence', 'migration/results.html', 'monthly', '0.6'],
  ['evidence', 'migration/byte-diff.html', 'monthly', '0.5'],
  // -- demos -------------------------------------------------------------
  ['demo', 'demos/index.html', 'monthly', '0.8'],
  ['demo', 'demos/react/index.html', 'monthly', '0.6'],
  ['demo', 'demos/angular/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v24-01-plugin-id-dedup/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v24-02-sync-plugin/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v24-04-snapshot-versioning/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v24-05-authority-sudo/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v25-02-tree-nav/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v25-03-narrate/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v25-04-expect-diff/index.html', 'monthly', '0.6'],
  ['demo', 'demos/v25-canvas-api/index.html', 'monthly', '0.6'],
  // -- reference demos (.php, served live -- verified 200) --------------
  ['reference', 'example.php', 'monthly', '0.6'],
  ['reference', 'example-v13.php', 'monthly', '0.6'],
  ['reference', 'example-v20-full.php', 'monthly', '0.6'],
  ['reference', 'example-v20-primitives-showcase.php', 'monthly', '0.6'],
  ['reference', 'example-v20-page-a.php', 'monthly', '0.5'],
  ['reference', 'example-v20-page-b.php', 'monthly', '0.5'],
  ['reference', 'example-v21-data-table.php', 'monthly', '0.6'],
  ['reference', 'example-v22-interop.php', 'monthly', '0.6'],
  ['reference', 'example-v23-editor.php', 'monthly', '0.6'],
  ['reference', 'example-v23-shadow-open.php', 'monthly', '0.5'],
  ['reference', 'example-v23-shadow-closed.php', 'monthly', '0.5'],
  ['reference', 'example-v24-disambiguation.php', 'monthly', '0.6'],
  ['reference', 'example-navmap.php', 'monthly', '0.6'],
  ['reference', 'ads-demo/index.html', 'monthly', '0.5'],
  ['reference', 'ads-demo/atlas-pro/index.html', 'monthly', '0.4'],
  // -- guides ------------------------------------------------------------
  ['guide', 'guides/ANGULAR.html', 'monthly', '0.7'],
  ['guide', 'guides/REACT.html', 'monthly', '0.7'],
  ['guide', 'guides/LLM_WIRING.html', 'monthly', '0.7'],
  ['guide', 'guides/AI_PLAYBOOK_MIGRATION.html', 'monthly', '0.7'],
  ['guide', 'guides/AI_PLAYBOOK_NEW_PROJECT.html', 'monthly', '0.7'],
  ['guide', 'guides/IMPACT_RPA.html', 'monthly', '0.6'],
  ['guide', 'guides/IMPACT_TESTING.html', 'monthly', '0.6'],
  ['guide', 'guides/RPA_AUTOMATION_ANYWHERE.html', 'monthly', '0.6'],
  ['guide', 'guides/RPA_BLUE_PRISM.html', 'monthly', '0.6'],
  ['guide', 'guides/RPA_PLAYWRIGHT.html', 'monthly', '0.6'],
  ['guide', 'guides/RPA_UIPATH.html', 'monthly', '0.6'],
  // -- reference docs ----------------------------------------------------
  ['doc', 'docs/ACCESSIBILITY.html', 'monthly', '0.6'],
  ['doc', 'docs/NAC_INTEROP_MCP.html', 'monthly', '0.6'],
  ['doc', 'docs/CASE_STUDIES_DISCOVERY.html', 'monthly', '0.5'],
  ['doc', 'docs/NAC_TEST_MANUAL.html', 'monthly', '0.5'],
  ['doc', 'docs/TEST_COVERAGE_MATRIX.html', 'monthly', '0.5'],
  ['doc', 'docs/RFC_V24-04.html', 'monthly', '0.5'],
  ['doc', 'docs/COVERAGE_REPORT_2026_05_10.html', 'monthly', '0.4'],
  ['doc', 'docs/NAC_V22_ROADMAP.html', 'monthly', '0.4'],
];

/** Last commit date (YYYY-MM-DD) that touched a path, straight from git. */
function gitDate(relPath) {
  const target = relPath === '' ? 'index.html' : relPath;
  const out = spawnSync('git', ['log', '-1', '--format=%cs', '--', target], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (out.status !== 0) return null;
  const date = (out.stdout || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

function urlOf(relPath) {
  return BASE + relPath;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const missing = [];
  const entries = [];

  for (const [group, relPath] of PAGES) {
    const local = join(ROOT, relPath === '' ? 'index.html' : relPath);
    if (!existsSync(local)) {
      missing.push({ group, relPath });
      continue;
    }
    entries.push({ group, relPath, lastmod: gitDate(relPath) });
  }

  if (missing.length) {
    process.stderr.write('sitemap: refusing to emit -- these paths do not exist on disk:\n');
    for (const m of missing) process.stderr.write(`  - ${m.relPath || '(root)'}\n`);
    process.exit(1);
  }

  const seen = new Set();
  const dupes = [];
  for (const e of entries) {
    const u = urlOf(e.relPath);
    if (seen.has(u)) dupes.push(u);
    seen.add(u);
  }
  if (dupes.length) {
    process.stderr.write('sitemap: refusing to emit -- duplicate URLs:\n');
    for (const d of dupes) process.stderr.write(`  - ${d}\n`);
    process.exit(1);
  }

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!--');
  lines.push('  sitemap.xml -- generated by scripts/build-sitemap.mjs. Do not edit by hand.');
  lines.push('');
  lines.push('  Every <lastmod> below is the last commit date of that file in git, not a');
  lines.push('  guessed date. Paths are curated: the specification, the public pages, the');
  lines.push('  evidence (benchmark + case studies), the demos, the guides and the');
  lines.push('  reference docs. Translations under i18n/ are deliberately not indexed');
  lines.push('  while they remain partial.');
  lines.push('');
  lines.push('  Regenerate with:  node scripts/build-sitemap.mjs');
  lines.push('  Validate with:    node scripts/build-sitemap.mjs --check');
  lines.push('-->');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  let lastGroup = null;
  for (const e of entries) {
    if (e.group !== lastGroup) {
      lines.push(`  <!-- ${e.group} -->`);
      lastGroup = e.group;
    }
    const [, , changefreq, priority] = PAGES.find((p) => p[1] === e.relPath);
    lines.push('  <url>');
    lines.push(`    <loc>${urlOf(e.relPath)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  lines.push('');

  const xml = lines.join('\n');
  const withDate = entries.filter((e) => e.lastmod).length;

  if (checkOnly) {
    process.stdout.write(
      `sitemap check OK: ${entries.length} urls, ${withDate} with lastmod, ` +
        `${entries.length - withDate} without git date, 0 missing, 0 duplicate\n`,
    );
    return;
  }

  writeFileSync(join(ROOT, 'sitemap.xml'), xml, 'utf8');
  process.stdout.write(
    `sitemap.xml written: ${entries.length} urls (${withDate} with lastmod from git), ` +
      `${Buffer.byteLength(xml, 'utf8')} bytes\n`,
  );
}

main();
