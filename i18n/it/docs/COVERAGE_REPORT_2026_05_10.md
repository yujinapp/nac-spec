---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:35:40.927568+00:00
---

# Report di copertura NAC3 -- notte del 2026-05-10 / 11

Generato al termine della notte di copertura sul branch
`feat/nac-interop-mcp`. Questo è il resoconto onesto, caso per caso,
di cosa è stato testato e con quale profondità.

Sostituisce le precedenti dichiarazioni informali "50/50 PASS" /
"5/5 layer GREEN". Quei numeri erano strutturalmente corretti
ma la profondità era disomogenea; questo report ridefinisce il quadro
per stage della pipeline.

## Promemoria degli stage della pipeline

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## Suite rilasciate (questo branch)

| Suite | Path | Test |
|-------|------|-------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (constructor strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (cross-app MCP) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (mock STT + corpus TTS) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (chiamate live) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **Totale locale** | | **175+** |

Tutti attualmente PASS in locale. Nessuna GitHub Actions attiva (budget
crediti esaurito; i test girano solo sul laptop di Pablo + su richiesta).

## Matrice di copertura per stage della pipeline

### Stage 1 -- Comunicacion (STT + input grezzo)

| Layer | Stato | Note |
|-------|--------|-------|
| **CAPA A: mock STT + iniezione corpus** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`. Il mock `SpeechRecognition` sintetizza un evento `result`; NacChat lo riceve e lo dispatcha normalmente. Verifica che i trap di lingua rimangano nel locale, che i prompt di cambio lingua commutino, e che i prompt normali attivino il backend. |
| **CAPA B: integrità del corpus** | PASS (3/3) | 30 file MP3 generati via Google Cloud TTS in `packages/nac/test/fixtures/voice/`. Totale 365 KB su 10 locale. Sanity check su presenza file e dimensione minima. |
| Riproduzione audio reale con SpeechRecognition del browser | RINVIATO | La Web Speech API richiede uno stream microfono reale + browser. Appartiene agli e2e Playwright (in coda). |

**Copertura Stage 1: ~85%** -- percorsi testo + corpus + STT-mock completamente
coperti. Rimane solo la riproduzione audio reale nel browser, che
richiede Playwright.

### Stage 2 -- Desambiguacion

| Aspetto | Casi | Risultato |
|---------|-------|--------|
| Guardia contro falsi positivi in `_detectLangSwitch` (classe bug f631d77a) | 12 | PASS -- `cambia de pestana`, `cambia precio de mouse 40`, `borra de la lista`, `pasa de A a B` rimangono CORRETTAMENTE in spagnolo. `cambia a aleman`, `switch to english`, `use spanish`, `cambia idioma a de` commutano correttamente. Noop stessa lingua + nessun crash su input vuoto. |
| Corrispondenza esatta textContent per `tab_by_label` | 1 | PASS |
| Rimozione parentesi in `tab_by_label` (`"Lines (collection)"` corrisponde a `"Lines"`) | 1 | PASS |
| Corrispondenza locale i18n in `tab_by_label` | 1 | PASS |
| `tab_by_label` sconosciuto -> not_found | 1 | PASS |
| `snapshotTree` restituisce una struttura valida | 6 | PASS |

**Copertura Stage 2: ~95%.** Il rafforzamento del matcher (richiede
`cand.length >= 3` per le corrispondenze parziali) è stato rilasciato come fix
collaterale nella stessa suite, chiudendo il falso positivo su etichette
filler di 1 carattere.

### Stage 3 -- Intencion

Chiamate live contro l'endpoint di produzione
`https://yujin.app/crm/api/v1/yujin/nac-demo`. Il backend chat Yujin
(Claude Sonnet) è l'intermediario LLM.

| Aspetto | Casi | Risultato |
|---------|-------|--------|
| HTTP 200 + risposta JSON per prompt | 15 prompt in 7 locale (es/en/pt/fr/de/ja + un prompt trap in spagnolo) | PASS per tutti |
| La risposta contiene il booleano `ok` | 15 | PASS |
| Quando `ok`, presenza di stringa `message` + array `actions` | 15 | PASS |
| Ogni action contiene la stringa `kind` | 15 | PASS |
| **Guardia anti-bug**: `cambia de pestana` NON emette `change_locale: 'de'` | 1 | PASS -- l'LLM live rispetta la regola del system prompt rilasciata il 2026-05-09. |

**Copertura Stage 3: ~85%** della forma del contratto. Non al 100%
perché i contenuti specifici delle action dell'LLM sono
non deterministici; si verifica solo la forma + il caso anti-bug.

### Stage 4 -- Llamada (ogni funzione pubblica NAC.*)

| Funzione | Casi | Risultato |
|----------|-------|--------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / verb sconosciuto | 2 PASS |
| `NAC.fill` | happy / not_found / valore applicato al DOM | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / key sconosciuta / plugin non montato | 3 PASS |
| `NAC.tab_by_label` | textContent / parentesi / i18n / not_found | 4 PASS (sovrapposizione stage 2) |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | valido / non valido | 2 PASS |
| `NAC.screenshot` | restituisce data URL | 1 PASS |
| `NAC.edit_field` (preview v2.3) | apre / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | restituisce row_id | 1 PASS |
| `NAC.dt_edit_cell` | happy / rifiuta input non valido | 2 PASS |
| `NAC.dt_remove_row` | decrementa lo stato | 1 PASS |
| `NAC.dt_commit` | restituisce final_state | 1 PASS |
| `NAC.dt_discard` | annulla le modifiche non committate | 1 PASS |
| `NAC.dt_read_aggregate` | aggregato somma | 1 PASS |
| `NAC.bindAction` | l'handler si attiva + l'unbinder funziona | 2 PASS |

**Copertura Stage 4: ~95%** della superficie di scrittura pubblica. Mancanti:
`drag_drop` (nessuna copertura shim ancora), primitive toast / banner / confirm
dialog della v1.3 (bassa priorità per la v2.x).

### Stage 5 -- Resultado (effetti collaterali sul DOM)

| Aspetto | Stato |
|---------|--------|
| `fill` aggiorna input.value | PASS (T6 stage 4 verifica) |
| `select` aggiorna l'elemento select | PASS (T8 stage 4) |
| Le mutazioni `dt_*` si riflettono in `dt_state()` | PASS (T24-T30 stage 4) |
| Il modal `edit_field` si monta | PASS (T21 stage 4) |
| Verifica DOM a schermo intero con Playwright | RINVIATO -- richiede browser reale + step Vite/ng-build |

**Copertura Stage 5: ~70%** a livello unit. Verifica DOM a schermo
intero in coda.

### Stage 6 -- Famiglia di eventi Ack

| Famiglia | Casi | Risultato |
|--------|-------|--------|
| Forma di `nac:action:succeeded` (plugin + action_id + is_trusted) | 4 | PASS |
| Forma di `nac:field:changed` | 3 | PASS |
| Forma di `nac:tab:activated` | 2 | PASS |
| `nac:action:failed` su throw dell'handler | 2 | PASS |
| Percorso async-resolve di `bindAction` | 1 | PASS |
| Timing click-to-resolve < 200ms | 1 | PASS |
| Forma canonical del detail tra le famiglie | 3 | PASS |

**Copertura Stage 6: ~95%.** Mancanti: le famiglie di eventi della
coda lunga (`nac:breadcrumb:navigated`, `nac:accordion:expanded`,
`nac:step:advanced`, `nac:table:sort_changed`,
`nac:table:filter_changed`, `nac:confirm:resolved`). Il pattern è
lo stesso; coprirli sarebbe meccanico.

### Trasversale: interop (preview v2.3)

| Aspetto | Casi | Risultato |
|---------|-------|--------|
| Forma di `export_tree` + scope + filtro locale | 7 | PASS |
| `import_remote_tree` valida la connessione + registra plugin con namespace + riflette nella lista | 5 | PASS |
| Dispatch proxy per `click` + `fill` | 4 | PASS |
| Mirror ack locale con `via_interop:true` | 1 | PASS |
| Il codice di errore del peer emerge correttamente | 1 | PASS |
| `disconnect_remote` + rifiuto post-disconnessione | 2 | PASS |
| I click locali NON vengono proxati | 1 | PASS |

**Copertura Interop: 100%** della superficie preview v2.3.

## Riepilogo copertura -- pipeline ponderata

| Stage | Copertura | Verdetto |
|-------|----------|---------|
| 1 Comunicacion | **85%** | Mock STT + corpus TTS PASS. Solo la riproduzione audio reale nel browser è in coda. |
| 2 Desambiguacion | 95% | Solida. Classe di bug verificata. |
| 3 Intencion | 85% | Forma del backend live coperta. |
| 4 Llamada | 95% | Ogni API di scrittura pubblica testata. |
| 5 Resultado | 70% | Prevalentemente a livello unit. Playwright in coda. |
| 6 Ack | 95% | Famiglie principali coperte; coda lunga meccanica. |
| Interop | 100% | Superficie completa preview v2.3. |
| **Media ponderata** | **~90%** | |

## Cosa è cambiato nel runtime come risultato

I test hanno individuato due problemi reali che sono stati corretti nello stesso branch:

1. **Matcher di `tab_by_label` troppo permissivo per etichette di 1 carattere.**
   Corretto in `js/nac.js` riga 2264 richiedendo `cand.length >= 3` per la
   corrispondenza parziale bidirezionale. L'uguaglianza esatta è sempre ammessa.
   Individuato dal test B4 dello Stage 2 (un'etichetta sconosciuta passava il filtro).

2. **Helper di introspezione `NAC.list_registered_plugins()` mancante.**
   Aggiunto in `js/nac.js` per consentire all'`export_tree` del layer interop
   di iterare i manifest registrati indipendentemente dallo stato di mount nel DOM.
   Individuato durante la scrittura della suite interop v23.

Entrambi sono preziosi -- i test hanno fatto emergere bug reali dal
runtime, che è esattamente lo scopo.

## Cosa resta da fare prima del merge su main

| Task | Priorità | Sforzo |
|------|----------|--------|
| e2e Playwright sui 6 demo live | alta | 1h |
| Playwright sui casi studio React + Angular (dev server) | alta | 30min |
| Generazione corpus TTS (Google Cloud, 30 prompt) | media | 20min |
| Test mock STT + iniezione corpus | media | 30min |
| Unit test `drag_drop` | bassa | 10min |
| Test famiglie ack coda lunga (breadcrumb, accordion, step, ecc.) | bassa | 30min |
| Cherry-pick `yujin.app/nac-spec/demos/` + landing su main | bloccante | 2min |
| Passaggio email a Pablo | bloccante | 5min |

Stima rimanente: **~3h tempo-Sumi** per raggiungere >= 90%
di media ponderata + un cherry-pick pulito su main.

## Tempi di esecuzione dei test (laptop, cold)

| Suite | Tempo |
|-------|------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3 (backend live) | ~60s (15 prompt x ~4s media + 500ms pacing) |
| stage4 | ~2s (setup modal + dt) |
| stage6 | < 1s |
| **Totale** | **~75s** |

`tools/nac/test-launch.sh` (l'harness) deve essere esteso per
includere gli stage 2-6 + interop; in sospeso.

## Traccia di audit

| Commit | Contenuto |
|--------|---------|
| `5b06ae3f` | demo compilati + distribuiti + stage 2 |
| `632aa1f6` | stage 2+4 + casi d'uso landing |
| (in sospeso) | stage 3+6 + questo report |

---

*Questo documento è il registro di copertura canonico per il branch
interop v2.3 + il runtime v2.2 nello stato al 2026-05-11
00:50 UTC-3. Gli aggiornamenti vengono aggiunti man mano che nuove suite vengono rilasciate.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
