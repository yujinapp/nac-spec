/* =====================================================================
   tar.mjs -- the little bit of tar this repository needs, and no more.

   An npm package is a gzipped tar. To compare a PUBLISHED package
   against this tree we have to open one; to prove the gate goes red we
   have to build one that is deliberately wrong. Both directions live
   here so the gate and its red-case suite read the same format code.

   Why not a dependency: the runtime ships with zero of them and the
   tooling has none either. A tamper check that pulls a third-party
   parser to decide whether our own artefact was tampered with widens
   the very surface it is meant to close.

   Scope, stated so nobody expects more: regular files only. Directory
   entries are skipped (npm recreates them from the paths), hard and
   symbolic links are not expected inside a package and are reported as
   unsupported rather than silently dropped. Long names arrive as PAX
   or GNU records and are honoured on read; on write a name over 100
   bytes throws, because splitting it into the ustar prefix field has
   no test here and an untested path in a security check is a lie.

   ASCII only. No dependency beyond node core.
   ===================================================================== */

const BLOCK = 512;

function cstr(buf, start, len) {
  const slice = buf.subarray(start, start + len);
  const end = slice.indexOf(0);
  return slice.subarray(0, end < 0 ? slice.length : end).toString('utf8');
}

function octal(buf, start, len) {
  const raw = cstr(buf, start, len).replace(/[^0-7]/g, '');
  return raw ? parseInt(raw, 8) : 0;
}

/* PAX extended headers are length-prefixed "key=value" records:
   "30 path=package/some/long/name\n". We only want `path`. */
function paxField(data, field) {
  let off = 0;
  const text = data.toString('utf8');
  while (off < text.length) {
    const sp = text.indexOf(' ', off);
    if (sp < 0) break;
    const len = parseInt(text.slice(off, sp), 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const record = text.slice(sp + 1, off + len - 1); /* drop the trailing \n */
    const eq = record.indexOf('=');
    if (eq > 0 && record.slice(0, eq) === field) return record.slice(eq + 1);
    off += len;
  }
  return null;
}

/**
 * Read a tar archive.
 * Returns [{ name, data }] for regular files, in archive order.
 * Throws on an entry type this repository does not expect in a package.
 */
export function readTar(buf) {
  const out = [];
  let off = 0;
  let override = null; /* a pending PAX / GNU long name */

  while (off + BLOCK <= buf.length) {
    const head = buf.subarray(off, off + BLOCK);

    /* Two zero blocks close an archive; one is enough to stop reading. */
    let zero = true;
    for (let i = 0; i < BLOCK; i += 1) {
      if (head[i] !== 0) { zero = false; break; }
    }
    if (zero) break;

    const name = cstr(head, 0, 100);
    const size = octal(head, 124, 12);
    const typeByte = head[156];
    const type = typeByte === 0 ? '0' : String.fromCharCode(typeByte);
    const prefix = cstr(head, 345, 155);

    off += BLOCK;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / BLOCK) * BLOCK;

    if (type === 'x' || type === 'X') { override = paxField(data, 'path'); continue; }
    if (type === 'L') { override = data.toString('utf8').replace(/\0+$/, ''); continue; }
    if (type === 'g' || type === 'K') { continue; }
    if (type === '5') { override = null; continue; } /* directory */

    const full = override || (prefix ? prefix + '/' + name : name);
    override = null;

    if (type === '0') {
      out.push({ name: full, data: Buffer.from(data) });
      continue;
    }
    throw new Error('unsupported tar entry type "' + type + '" for ' + full
      + ' -- a package is expected to contain regular files only');
  }
  return out;
}

/**
 * Write a tar archive from [{ name, data }].
 * Regular files only, 0644, deterministic mtime so two runs over the
 * same input produce the same bytes.
 */
export function writeTar(entries, opts = {}) {
  const mtime = Math.floor((opts.mtime || 0) / 1000);
  const blocks = [];

  for (const entry of entries) {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const name = entry.name;
    if (Buffer.byteLength(name, 'utf8') > 100) {
      throw new Error('tar name longer than 100 bytes is not supported by this writer: ' + name);
    }

    const head = Buffer.alloc(BLOCK);
    head.write(name, 0, 100, 'utf8');
    head.write('0000644\0', 100, 8, 'ascii');                                  /* mode  */
    head.write('0000000\0', 108, 8, 'ascii');                                  /* uid   */
    head.write('0000000\0', 116, 8, 'ascii');                                  /* gid   */
    head.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    head.write(mtime.toString(8).padStart(11, '0') + '\0', 136, 12, 'ascii');
    head.write('        ', 148, 8, 'ascii');                                   /* checksum field, blank while summing */
    head.write('0', 156, 1, 'ascii');                                          /* regular file */
    head.write('ustar\0', 257, 6, 'ascii');
    head.write('00', 263, 2, 'ascii');

    let sum = 0;
    for (let i = 0; i < BLOCK; i += 1) sum += head[i];
    head.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');

    blocks.push(head, data);
    const pad = (BLOCK - (data.length % BLOCK)) % BLOCK;
    if (pad) blocks.push(Buffer.alloc(pad));
  }

  blocks.push(Buffer.alloc(BLOCK * 2)); /* end of archive */
  return Buffer.concat(blocks);
}
