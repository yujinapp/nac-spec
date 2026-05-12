---
translation_source: guides/IMPACT_TESTING.md
translation_source_hash: d69b8343b9c3e6a8ba3e22f198a9a6646d800f3f32a2f0446a506cb44f9e664b
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T13:54:51.209728+00:00
---

# Impatto di NAC3 su Testing e QA

**Versione NAC3:** 2.2 stable.
**Destinatari:** Ingegneri di test, responsabili QA, SDET, CTO che valutano il costo a lungo termine della manutenzione dei test dopo l'adozione di NAC3.

## In sintesi

Il codice di test che usa gli id NAC3 sopravvive ai redesign dell'interfaccia. Il codice di test che usa selettori CSS no. Questa singola proprietà cambia l'economia della manutenzione dei test da "lineare con il cambiamento dell'UI" a "lineare con il cambiamento delle funzionalità" -- tipicamente un carico di lavoro 5-10 volte inferiore.

## La matematica della manutenzione oggi

Una suite tipica Selenium / Cypress / Playwright per un'applicazione web non banale contiene centinaia di selettori:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

Questi selettori si rompono quando:

- Il team di design rinomina `.btn-primary` in `.btn-cta`.
- Viene aggiunto un div contenitore per l'accessibilità.
- L'etichetta del pulsante viene internazionalizzata e "Save" diventa "Guardar" nei test del tenant spagnolo.
- Il layout della griglia passa a grid-template-rows.
- Qualsiasi aspetto della pagina che NON riguarda l'intento semantico cambia.

Sondaggi di settore (2024-2025) stimano che **il 30-50% del tempo degli ingegneri QA sia dedicato alla manutenzione dei selettori**. La percentuale peggiora con la crescita dell'applicazione.

## La matematica della manutenzione con NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

Queste chiamate sopravvivono a:

- Rinominazione di classi CSS (i selettori non fanno riferimento al CSS).
- Ristrutturazione dell'albero DOM (i selettori non fanno riferimento alla struttura).
- Modifiche alle etichette I18n (i selettori non fanno riferimento al testo).
- Migrazioni da layout a griglia a layout flex.
- Sostituzione di librerie di componenti.

Si rompono SOLO quando:

- Il team di prodotto rinomina un verbo (`save` -> `commit`).
- Un pulsante viene rimosso completamente.

Questi sono **cambiamenti a livello di funzionalità**, non a livello di UI. Il test deve essere aggiornato per lo stesso motivo per cui il codice di produzione deve essere aggiornato. Questo è il costo corretto da considerare.

## Metriche di impatto concrete

Dai dati interni di Yujin CRM (2025):

| Metrica | Prima di NAC | Dopo NAC | Delta |
|--------|-----------|-----------|-------|
| Righe medie per spec Playwright | 187 | 64 | -66% |
| Manutenzione per spec dopo uno sprint di redesign | 4,2 ore | 0,3 ore | -93% |
| Fallimenti di test legati ai selettori per settimana | 38 | 2 | -95% |
| Tempo di onboarding per un nuovo ingegnere QA | 3 settimane | 1 settimana | -67% |
| Test ancora validi 6 mesi dopo la scrittura, senza modifiche | 31% | 89% | +180% |

Il dato dell'89% è quello decisivo. **La grande maggioranza dei test NAC3 continua a funzionare durante la normale evoluzione del prodotto**, mentre gli equivalenti basati su selettori si degradano.

## Cosa abilita NAC3 per l'automazione dei test

### 1. Corpus di test stabile

Un test scritto nel 2024 su `NAC.click('invoice.save')` funziona ancora nel 2026 se il verbo `save` sopravvive alla roadmap del prodotto. Il DOM attorno al pulsante può essere stato ricostruito tre volte.

### 2. Cross-browser senza cambi di modalità dei selettori

I selettori CSS si comportano in modo diverso tra Chromium / Firefox / WebKit per i casi limite (pseudo-elementi, focus ring, shadow DOM). NAC3 esegue il dispatch tramite il resolver del runtime -- lo stesso percorso di codice indipendentemente dal browser.

### 3. Test agnostici rispetto all'I18n

In un'applicazione multi-locale: la suite di test attuale richiede esecuzioni per ogni locale perché "Save" / "Guardar" / "Speichern" sono tutti lo stesso pulsante. Con NAC3 il test chiama l'id; il runtime risolve tra i vari locale. **Si scrive 1 test, viene eseguito su 10 locale** (uno per ).

### 4. Authoring di test assistito da LLM

Un LLM che vede `NAC.describe()` può produrre una spec di test completa a partire da una descrizione in linguaggio naturale: "Verifica che aggiungendo una riga e poi eliminandola la tabella torni allo stato iniziale." L'LLM emette chiamate NAC.*; si revisiona e si fa il commit. Yujin CRM ha ~250 spec create in questo modo e revisionate prima del merge.

### 5. Test auto-riparanti tramite discovery

Quando un test fallisce perché un id è stato rinominato:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

Il `click_by_verb` del runtime fornisce un fallback auto-riparante che segnala "questo test va aggiornato, ma l'azione funziona ancora" -- una modalità di fallimento molto più utile di "selettore non trovato, punto".

### 6. Generazione di test dai manifest

`NAC.validate_global({probe: true})` sintetizza un click su ogni elemento `role="action"` e verifica che emetta l'evento ack canonico entro 5 secondi. **Questo è uno smoke test auto-generato per l'intera superficie cliccabile dell'applicazione**. Eseguirlo in CI intercetta qualsiasi pulsante che viene montato senza la corretta emissione dell'ack.

### 7. Copertura della pipeline per fase

La suite di test di riferimento di Yujin (NAC_TEST_MANUAL.md) organizza i test per fase della pipeline NAC3:

- Fase 1 (input STT)
- Fase 2 (Disambiguazione)
- Fase 3 (intermediario LLM)
- Fase 4 (chiamate NAC.*)
- Fase 5 (effetto collaterale sul DOM)
- Fase 6 (evento Ack)

La copertura viene misurata **per fase**, non solo per riga di codice. Il riferimento Yujin riporta una media ponderata di ~95% su tutte le fasi. Adottare questo schema fornisce uno scorecard di copertura che si mappa direttamente sul contratto.

## Impatto sui framework di test esistenti

### Playwright

Integrazione diretta. `page.evaluate()` invoca le chiamate `NAC.*`. I selettori rimangono come fallback per le asserzioni sul layout. Il riferimento Yujin include 16 spec Playwright in `tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. Stesso schema. I comandi personalizzati wrappano le chiamate NAC: `cy.nacClick('invoice.save')`.

### Selenium

JavaScript executor: `driver.execute_script('return window.NAC.click(arguments[0])', 'invoice.save')`.

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 si affianca a React Testing Library, non si contrappone ad essa.

### Karma / Jasmine / runner più datati

Iniezione diretta tramite `window.NAC`. Qualsiasi runner in grado di eseguire JavaScript in un contesto browser funziona.

## Costo di adozione

### Applicazione esistente

Secondo il [playbook di migrazione](AI_PLAYBOOK_MIGRATION.md), si stima:

- ~1 giorno per schermata per la decorazione e il manifest.
- ~1 giorno per schermata per la migrazione del corpus di test.
- Totale per un'applicazione da 20 schermate: ~6 settimane di lavoro di un ingegnere, ammortizzate dai risparmi sulla manutenzione entro 3-4 mesi.

### Nuova applicazione

Integrato nativamente. Il playbook greenfield tratta gli attributi NAC3 come un elemento di prima classe. Nessun costo di retrofit.

## Rischi e mitigazione

### Rischio -- "non ci fidiamo dei test generati da LLM"

Legittimo. L'LLM produce un candidato; un essere umano lo revisiona e fa il commit. Stesso flusso di lavoro di Copilot. Il corpus che viene rilasciato è esattamente quello approvato dal team, non quello scritto dall'LLM.

### Rischio -- "gli id NAC diventano debito tecnico nel tempo"

Vero, se li si lascia degradare. Trattare gli id NAC come i nomi delle colonne di un database: rinominare tramite migrazione, non eliminare mai in-flight. La CLI `@nac3/runtime` individua gli id orfani tramite lint statico.

### Rischio -- "e se l'adozione di NAC si blocca?"

La spec è Apache-2.0. Il runtime è < 200KB. Nel caso peggiore: si possiede l'artefatto, gli id rimangono stabili. Il caso peggiore è comunque migliore dei selettori CSS.

## Vedi anche

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- il playbook di test standardizzato che questa analisi di impatto supporta.
- [RPA_UIPATH.md](RPA_UIPATH.md) / [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) / [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- applicazioni adiacenti dello stesso contratto.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md) -- i numeri di copertura del riferimento Yujin.

## Licenza

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/IMPACT_TESTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
