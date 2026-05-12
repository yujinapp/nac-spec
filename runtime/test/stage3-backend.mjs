/**
 * Stage 3 (Intencion) -- backend smoke against the live Yujin
 * chat intermediary at /crm/api/v1/yujin/nac-demo.
 *
 * Sends 15 canonical prompts with a hand-crafted minimal NAC
 * snapshot. Asserts the response shape (ok + message string +
 * actions array). Does NOT assert specific action contents
 * because the LLM is non-deterministic.
 *
 * Local-only test: hits the production endpoint but uses an
 * isolated session_id so it doesn't pollute usage counters too
 * much. Requires the api_key from crm_desa/config/config.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import url  from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ENDPOINT  = 'https://yujin.app/crm/api/v1/yujin/nac-demo';
const CONFIG    = path.resolve(__dirname, '..', '..', '..',
  'crm_desa', 'config', 'config.json');

let failures = 0;
function assert(name, ok, detail) {
  if (ok) console.log('PASS', name);
  else { failures++; console.error('FAIL', name, detail || ''); }
}

/* ---------- Read API key (NEVER printed) ---------- */
/* The config.json may have trailing comments or be otherwise
   not strict-JSON. Grep the api_key line directly. */
let apiKey = null;
try {
  const raw = fs.readFileSync(CONFIG, 'utf8');
  const m = raw.match(/"api_key"\s*:\s*"([^"]+)"/);
  if (m) apiKey = m[1];
} catch (e) {
  console.error('[stage3] cannot read config.json:', e.message);
  process.exit(2);
}
if (!apiKey || apiKey.length < 20) {
  console.error('[stage3] api_key missing or too short');
  process.exit(2);
}

/* ---------- Canonical minimal snapshot ---------- */
const SNAPSHOT = {
  active: 'demo_app',
  plugins: [
    {
      plugin: 'demo_app',
      state: 'active',
      elements: [
        { nac_id: 'demo_app.save',   role: 'action' },
        { nac_id: 'demo_app.cancel', role: 'action' },
        { nac_id: 'demo_app.name',   role: 'field'  },
        { nac_id: 'tab.lines',       role: 'tab'    },
        { nac_id: 'tab.permissions', role: 'tab'    }
      ],
      manifest: {
        plugin_slug: 'demo_app',
        nac_version: '2.2',
        elements: [
          {
            id: 'demo_app.save', role: 'action',
            actions: [{
              verb: 'save',
              label_i18n: {
                es: 'Guardar', en: 'Save', pt: 'Salvar', fr: 'Sauver',
                it: 'Salva',   de: 'Speichern', ja: '保存',
                zh: '保存',   hi: 'sahejna', ar: 'حفظ'
              }
            }],
            label_i18n: { es:'a',en:'a',pt:'a',fr:'a',it:'a',de:'a',ja:'a',zh:'a',hi:'a',ar:'a' }
          },
          {
            id: 'demo_app.cancel', role: 'action',
            actions: [{
              verb: 'cancel',
              label_i18n: {
                es: 'Cancelar', en: 'Cancel', pt: 'Cancelar',
                fr: 'Annuler',  it: 'Annulla', de: 'Abbrechen',
                ja: 'キャンセル', zh: '取消', hi: 'cancel', ar: 'إلغاء'
              }
            }],
            label_i18n: { es:'a',en:'a',pt:'a',fr:'a',it:'a',de:'a',ja:'a',zh:'a',hi:'a',ar:'a' }
          },
          {
            id: 'demo_app.name', role: 'field',
            label_i18n: {
              es: 'Nombre', en: 'Name', pt: 'Nome', fr: 'Nom',
              it: 'Nome',   de: 'Name',  ja: '名前', zh: '名字',
              hi: 'naam',   ar: 'الاسم'
            }
          },
          {
            id: 'tab.lines', role: 'tab',
            label_i18n: { es:'Lineas',en:'Lines',pt:'Linhas',fr:'Lignes',
                          it:'Linee', de:'Zeilen',ja:'行', zh:'行', hi:'lines',ar:'سطور' }
          },
          {
            id: 'tab.permissions', role: 'tab',
            label_i18n: { es:'Permisos',en:'Permissions',pt:'Permissoes',
                          fr:'Permissions',it:'Permessi',de:'Berechtigungen',
                          ja:'権限',zh:'权限',hi:'permissions',ar:'صلاحيات' }
          }
        ]
      }
    }
  ]
};

/* ---------- Prompts across ALL 10 supported locales --------------
   Each locale gets 3-7 prompts covering save / cancel / tab /
   fill / language-trap. ~45 prompts total. Exercises the LLM's
   resolution against the full label_i18n surface. */
const PROMPTS = [
  /* es -- 7 prompts including the bug-class trap. */
  { lang: 'es', text: 'guarda',                       label: 'es-save' },
  { lang: 'es', text: 'guarda la pagina',             label: 'es-save-obj' },
  { lang: 'es', text: 'cancela',                      label: 'es-cancel' },
  { lang: 'es', text: 've a permisos',                label: 'es-tab-perm' },
  { lang: 'es', text: 've a lineas',                  label: 'es-tab-lines' },
  { lang: 'es', text: 'cambia de pestana',            label: 'es-bug-trap (must NOT switch to de)' },
  { lang: 'es', text: 'pone juan en el nombre',       label: 'es-fill-name' },

  /* en -- 5 prompts. */
  { lang: 'en', text: 'save',                         label: 'en-save' },
  { lang: 'en', text: 'go to permissions',            label: 'en-tab-perm' },
  { lang: 'en', text: 'cancel',                       label: 'en-cancel' },
  { lang: 'en', text: 'set name to alice',            label: 'en-fill-name' },
  { lang: 'en', text: 'go to the lines tab',          label: 'en-tab-lines' },

  /* pt -- 4 prompts. */
  { lang: 'pt', text: 'salvar',                       label: 'pt-save' },
  { lang: 'pt', text: 'cancelar',                     label: 'pt-cancel' },
  { lang: 'pt', text: 'ir para permissoes',           label: 'pt-tab-perm' },
  { lang: 'pt', text: 'colocar maria no nome',        label: 'pt-fill-name' },

  /* fr -- 4 prompts. */
  { lang: 'fr', text: 'enregistre',                   label: 'fr-save' },
  { lang: 'fr', text: 'annuler',                      label: 'fr-cancel' },
  { lang: 'fr', text: 'aller aux permissions',        label: 'fr-tab-perm' },
  { lang: 'fr', text: 'mettre pierre dans le nom',    label: 'fr-fill-name' },

  /* it -- 4 prompts. */
  { lang: 'it', text: 'salva',                        label: 'it-save' },
  { lang: 'it', text: 'annulla',                      label: 'it-cancel' },
  { lang: 'it', text: 'vai ai permessi',              label: 'it-tab-perm' },
  { lang: 'it', text: 'metti luigi nel nome',         label: 'it-fill-name' },

  /* de -- 4 prompts. */
  { lang: 'de', text: 'speichern',                    label: 'de-save' },
  { lang: 'de', text: 'abbrechen',                    label: 'de-cancel' },
  { lang: 'de', text: 'gehe zu berechtigungen',       label: 'de-tab-perm' },
  { lang: 'de', text: 'name auf hans setzen',         label: 'de-fill-name' },

  /* ja -- 4 prompts. */
  { lang: 'ja', text: '保存',                          label: 'ja-save' },
  { lang: 'ja', text: 'キャンセル',                      label: 'ja-cancel' },
  { lang: 'ja', text: '権限タブへ',                      label: 'ja-tab-perm' },
  { lang: 'ja', text: '名前を太郎に設定',                  label: 'ja-fill-name' },

  /* zh -- 4 prompts. */
  { lang: 'zh', text: '保存',                          label: 'zh-save' },
  { lang: 'zh', text: '取消',                          label: 'zh-cancel' },
  { lang: 'zh', text: '去权限',                        label: 'zh-tab-perm' },
  { lang: 'zh', text: '将名字设为小明',                  label: 'zh-fill-name' },

  /* hi -- 4 prompts (transliterated, the realistic input shape). */
  { lang: 'hi', text: 'sahej do',                     label: 'hi-save' },
  { lang: 'hi', text: 'cancel karo',                  label: 'hi-cancel' },
  { lang: 'hi', text: 'permissions tab par jao',      label: 'hi-tab-perm' },
  { lang: 'hi', text: 'naam ko ravi karo',            label: 'hi-fill-name' },

  /* ar -- 4 prompts. */
  { lang: 'ar', text: 'احفظ',                          label: 'ar-save' },
  { lang: 'ar', text: 'إلغاء',                         label: 'ar-cancel' },
  { lang: 'ar', text: 'اذهب إلى الصلاحيات',            label: 'ar-tab-perm' },
  { lang: 'ar', text: 'ضع علي في الاسم',               label: 'ar-fill-name' }
];

async function callBackend(prompt) {
  const body = {
    session_id: 'stage3-' + Math.random().toString(36).slice(2, 10),
    prompt:     prompt.text,
    lang:       prompt.lang,
    history:    [],
    nac_tree:   SNAPSHOT
  };
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key':    apiKey
    },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); }
  catch (e) {
    return { ok: false, http: resp.status, error: 'non-json: ' + text.slice(0, 200) };
  }
  return { http: resp.status, body: json };
}

console.log('[stage3] hitting', ENDPOINT, 'with', PROMPTS.length, 'prompts');
console.log('');

for (const p of PROMPTS) {
  let res;
  try {
    res = await callBackend(p);
  } catch (e) {
    failures++;
    console.error('FAIL [' + p.label + '] network error:', e.message);
    continue;
  }
  /* HTTP success. */
  assert('[' + p.label + '] HTTP 200', res.http === 200,
    'got HTTP ' + res.http);
  /* Response is JSON with ok flag. */
  const b = res.body || {};
  assert('[' + p.label + '] response has ok', typeof b.ok === 'boolean');
  /* If ok, must have message string + actions array. */
  if (b.ok) {
    assert('[' + p.label + '] message is string',
      typeof b.message === 'string' && b.message.length > 0);
    assert('[' + p.label + '] actions is array',
      Array.isArray(b.actions));
    /* If actions present, each must have kind. */
    if (Array.isArray(b.actions) && b.actions.length > 0) {
      const allWellFormed = b.actions.every(a => a && typeof a.kind === 'string');
      assert('[' + p.label + '] actions[*].kind present',
        allWellFormed,
        'first action: ' + JSON.stringify(b.actions[0]).slice(0, 100));
    }
  } else {
    /* Error path -- backend rejected the request. Note the error
       code, don't fail the test (some prompts may legitimately
       not parse). */
    console.log('  (info) backend ok=false for "' + p.label + '":',
      b.error || 'unknown');
  }
  /* Small delay between calls to be polite to the rate limiter. */
  await new Promise(r => setTimeout(r, 500));
}

/* Specific anti-bug check: 'cambia de pestana' MUST NOT return
   a change_locale action targeting 'de'. */
console.log('');
console.log('[stage3] anti-bug check: cambia de pestana stays in Spanish');
const antibug = await callBackend({ lang: 'es', text: 'cambia de pestana', label: 'antibug' });
const acts = (antibug.body && antibug.body.actions) || [];
const switchesToDe = acts.some(a => a.kind === 'change_locale' && a.locale === 'de');
assert('antibug: no change_locale->de from "cambia de pestana"', !switchesToDe);

console.log('');
if (failures === 0) console.log('STAGE-3 PASS');
else                console.error('STAGE-3 FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
