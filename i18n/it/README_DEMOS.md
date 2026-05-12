---
translation_source: README_DEMOS.md
translation_source_hash: 0f488dd749283f4f2e03f0e431de47d7007818c6745ce1ce993014bdf9839480
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T12:57:12.538260+00:00
---

# Demo live di NAC3 su yujin.app/nac-spec/

**Versione spec:** 2.2 stable (+ anteprima interop v2.3).

**NAC3** = **Native Agent Contract**. La spec che consente alle UI web di essere
pilotate da assistenti AI, voice runner e strumenti di accessibilità
senza codice di collegamento specifico per ogni app.

Tre demo attive in parallelo. Ciascuna ha uno scopo distinto; non confondetele.

| File | Versione | Scopo |
|---|---|---|
| `example.php` | v1.9 stable | La demo canonica per NAC3 v1.9. 27 widget (chat, calendario, autopilot, modal, tab, grafici, ecc.). Mostra l'intera superficie funzionale v1.9 in una UI di forma produttiva. **Invariata.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Showcase didattico** degli 8 primitivi v2.0 + HMAC + isTrusted + contratto i18n. 8 sezioni, una per primitivo. Utile per revisori e adottanti che vogliono comprendere ogni nuovo primitivo in isolamento. **NON è una migrazione di example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Migrazione brownfield** di `example.php` a NAC3 v2.0 strict. Stessi 27 widget, stesso HTML, stessi handler -- con il layer v2.0 applicato sopra tramite ~80 righe di codice di setup. Dimostra che l'adozione nel mondo reale NON richiede la riscrittura di ogni widget. |

## Confronto affiancato

Apri `example.php` e `example-v20-full.php` in due tab.

### Cosa è identico

- Markup HTML (ogni `<article data-nac-plugin="X">`, ogni
  `data-nac-id`, ogni riferimento al catalogo i18n, ogni handler)
- Aspetto visivo (stesso layout, stessi widget, stesse interazioni)
- Runtime di riferimento v1.9 (`js/nac.js`) caricato nello stesso modo
- Riferimenti al catalogo `data-i18n-key` esistenti

### Cosa cambia nella versione v2.0-full

1. **Docstring nell'intestazione** che spiega esplicitamente che si tratta di uno
   showcase di migrazione brownfield.
2. **Un tag script aggiuntivo**: `js/nac-v2-extensions.js` caricato
   dopo `nac.js` e prima di `example.js`.
3. **Un blocco di setup aggiuntivo** (~80 righe in fondo alla
   pagina) che:
   - Costruisce un albero di scope gerarchico dagli attributi
     `data-nac-plugin` esistenti (ogni plugin diventa uno scope
     sotto `demo.shell`).
   - Chiama `NAC.set_provenance_secret()` per abilitare la firma HMAC.
   - Chiama `NAC.setTenantPrefix('demo')` per dimostrare il multi-tenant.
   - Avvia il ring buffer `NAC.captureEphemeral()` per i toast.
   - Chiama `NAC.autoRegister.watch()` sul contenitore delle card.
4. **Un pannello UI aggiuntivo** (`#v20-panel`, fisso in basso a destra)
   che espone `describe_v2()`, `validate_global_v2()`, la demo di firma HMAC
   e il pulsante per la distinzione isTrusted, tutti in tempo reale.

Questo è l'intero delta. Gli adottanti reali possono riutilizzare questo pattern alla lettera.

## Come valutare

Se sei un revisore peer di NAC3 v2.0:

1. Apri prima `example.php`. Verifica che la demo v1.9 funzioni come prima.
2. Apri `example-v20-full.php`. Verifica che funzioni IN MODO IDENTICO per
   le funzionalità v1.9 (chat, calendario, autopilot, ecc.).
3. Apri il pannello v2.0 (angolo in basso a destra). Clicca ogni pulsante:
   - `describe_v2()` -- visualizza l'albero di scope costruito dagli
     attributi plugin brownfield.
   - `validate_global_v2()` -- visualizza i risultati (probabilmente solo avvisi
     se il catalogo i18n ha lacune).
   - `sign as agent` -- visualizza la firma HMAC prodotta.
   - `click=trusted` / `.click()=fake` -- osserva la distinzione isTrusted
     in azione.

Se sei un adottante:

Usa il blocco di setup di `example-v20-full.php` come template. Adatta
l'albero di scope alla struttura dei plugin della tua app. La maggior parte del lavoro
consiste nell'identificare la gerarchia degli scope; il resto è meccanico.

## Link correlati

- Spec NAC3: https://github.com/pkuschnirof/nac-spec
- Release v1.9: tag `v1.9.0`
- Release candidate v2.0: `2.0.0-rc4` su `main`
- Traccia della revisione peer Round 3: `docs/PEER_REVIEW.md`

---

*This is a machine translation of the canonical English
version at `/nac-spec/README_DEMOS.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
