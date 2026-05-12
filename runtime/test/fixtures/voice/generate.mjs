/**
 * Generate MP3 audio for every prompt in corpus.json using Google
 * Cloud TTS. Run-once script; rerun only if corpus.json changes.
 *
 * Usage:
 *   GOOGLE_TTS_API_KEY=... node generate.mjs
 *
 * Default reads the key from packages/nac/test/fixtures/voice/.key
 * (gitignored) if env not set. NEVER print the key to stdout.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const CORPUS    = JSON.parse(fs.readFileSync(path.join(__dirname, 'corpus.json'), 'utf8'));

let apiKey = process.env.GOOGLE_TTS_API_KEY;
if (!apiKey) {
  const keyPath = path.join(__dirname, '.key');
  if (fs.existsSync(keyPath)) apiKey = fs.readFileSync(keyPath, 'utf8').trim();
}
if (!apiKey) {
  console.error('GOOGLE_TTS_API_KEY missing (env or .key file). Aborting.');
  process.exit(2);
}

const VOICES   = CORPUS._voices;
const PROMPTS  = CORPUS.prompts;
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

let generated = 0;
let skipped   = 0;
let errors    = 0;

for (const p of PROMPTS) {
  const dir = path.join(__dirname, p.locale);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, p.id + '.mp3');
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
    skipped++;
    continue;
  }

  const voice = VOICES[p.locale];
  if (!voice) {
    console.error('no voice for locale', p.locale);
    errors++;
    continue;
  }
  const langCode = voice.includes('-')
    ? voice.slice(0, voice.lastIndexOf('-')).split('-').slice(0, 2).join('-')
    : 'en-US';
  const body = {
    input: { text: p.text },
    voice: { languageCode: langCode, name: voice },
    audioConfig: { audioEncoding: 'MP3' }
  };

  try {
    const resp = await fetch(ENDPOINT + '?key=' + encodeURIComponent(apiKey), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://yujin.app' },
      body:    JSON.stringify(body)
    });
    const json = await resp.json();
    if (!json.audioContent) {
      console.error('FAIL', p.id, json.error ? json.error.message : 'no audioContent');
      errors++;
      continue;
    }
    const buf = Buffer.from(json.audioContent, 'base64');
    fs.writeFileSync(outPath, buf);
    generated++;
    process.stdout.write('.');
  } catch (e) {
    console.error('FAIL', p.id, e.message);
    errors++;
  }

  /* Polite pacing -- 5 calls/sec budget. */
  await new Promise(r => setTimeout(r, 200));
}

console.log('');
console.log('generated:', generated, '| skipped:', skipped, '| errors:', errors);
process.exit(errors === 0 ? 0 : 1);
