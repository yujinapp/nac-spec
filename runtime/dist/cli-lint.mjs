// Static lint helper for NAC CLI.
// Plain regex-based; intentionally tolerant of malformed input.

import fs from 'node:fs';
import path from 'node:path';

const CANONICAL_ROLES = new Set([
  'plugin','section','region','action','field','option','tab',
  'breadcrumb-item','accordion-toggle','step','pagination-item',
  'confirm-button','sort-control','filter-control','data-table',
  'navigation','confirm-dialog','button'
]);

function walk(dir, exts) {
  const out = [];
  function rec(p) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(p)) rec(path.join(p, e));
    } else if (exts.some(x => p.endsWith(x))) {
      out.push(p);
    }
  }
  rec(dir);
  return out;
}

function extractDomPairs(content) {
  // Match every (data-nac-id="X", data-nac-role="Y") pair within an
  // attribute-soup window. The naive approach: for each id match, look
  // back/forward 240 chars for a role match on the same element.
  const out = [];
  const idRx = /data-nac-id="([^"]+)"/g;
  let m;
  while ((m = idRx.exec(content)) !== null) {
    const id = m[1];
    const start = Math.max(0, m.index - 240);
    const end   = Math.min(content.length, m.index + m[0].length + 240);
    const window = content.slice(start, end);
    // Only accept role matches inside the same element tag (between
    // the closest '<' before the id and the closest '>' after).
    const tagOpen  = content.lastIndexOf('<', m.index);
    const tagClose = content.indexOf('>', m.index);
    let role = null;
    if (tagOpen >= 0 && tagClose >= 0) {
      const tagStr = content.slice(tagOpen, tagClose + 1);
      const rm = /data-nac-role="([^"]+)"/.exec(tagStr);
      if (rm) role = rm[1];
    }
    out.push({ id, role });
  }
  return out;
}

function extractManifestEntries(content) {
  // Best-effort: find NAC.register({ ... }) and extract elements[].id
  // + role. Tolerant of multi-line.
  const out = [];
  const rx = /NAC\.register\s*\(\s*\{[\s\S]*?\}\s*\)/g;
  let m;
  while ((m = rx.exec(content)) !== null) {
    const block = m[0];
    const slugM = /plugin_slug\s*:\s*['"]([^'"]+)['"]/.exec(block);
    const plugin = slugM ? slugM[1] : '<unknown>';
    // Each element entry: { id: 'X', role: 'Y', ... }
    const elRx = /\{[^{}]*?id\s*:\s*['"]([^'"]+)['"][^{}]*?role\s*:\s*['"]([^'"]+)['"][^{}]*?\}/g;
    let em;
    while ((em = elRx.exec(block)) !== null) {
      out.push({ plugin, id: em[1], role: em[2] });
    }
  }
  return out;
}

export function staticLint(dir) {
  const findings = [];
  const files = walk(dir, ['.html', '.htm', '.php']);
  for (const file of files) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); }
    catch (_) { continue; }
    const rel = path.relative(dir, file);

    const domPairs = extractDomPairs(content);
    const manifestEntries = extractManifestEntries(content);

    // Rule 1: tab_role_drift -- DOM id like tab.X must have role 'tab'.
    for (const p of domPairs) {
      if (/^tab\./.test(p.id) && p.role !== 'tab') {
        findings.push({
          severity: 'error',
          code: 'tab_role_drift',
          file: rel,
          message: 'data-nac-id="' + p.id + '" should have data-nac-role="tab" (got ' +
                   (p.role === null ? 'null' : '"' + p.role + '"') + ')'
        });
      }
    }

    // Rule 2: manifest_role_unknown -- manifest element role outside canonical set.
    for (const e of manifestEntries) {
      if (!CANONICAL_ROLES.has(e.role)) {
        findings.push({
          severity: 'error',
          code: 'manifest_role_unknown',
          file: rel,
          message: 'plugin "' + e.plugin + '" element id="' + e.id + '" has unknown role="' + e.role + '"'
        });
      }
    }

    // Rule 3: manifest_dom_role_mismatch -- manifest says X, DOM says Y for same id.
    const domByLastSeg = new Map();
    for (const p of domPairs) domByLastSeg.set(p.id, p.role);
    for (const e of manifestEntries) {
      const domRole = domByLastSeg.get(e.id);
      if (domRole && domRole !== e.role) {
        findings.push({
          severity: 'error',
          code: 'manifest_dom_role_mismatch',
          file: rel,
          message: 'plugin "' + e.plugin + '" id="' + e.id + '": manifest says role="' + e.role +
                   '" but DOM says role="' + domRole + '"'
        });
      }
    }

    // Rule 4: tab id with manifest role !== 'tab'.
    for (const e of manifestEntries) {
      if (/^tab\./.test(e.id) && e.role !== 'tab') {
        findings.push({
          severity: 'error',
          code: 'tab_id_manifest_role_drift',
          file: rel,
          message: 'plugin "' + e.plugin + '" id="' + e.id + '" looks like a tab but manifest role="' +
                   e.role + '" (NAC.tab() will not find it)'
        });
      }
    }
  }
  return findings;
}
