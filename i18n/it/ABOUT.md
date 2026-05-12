---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T12:56:11.997082+00:00
---

# Informazioni su NAC3

**Versione della specifica:** 2.2 stabile (+ anteprima interoperabilità v2.3).

**NAC3** = **Native Agent Contract**.

Una specifica pubblica e compatta che consente alle interfacce web di essere gestite da agenti AI, runner vocali e strumenti di accessibilità nello stesso modo in cui vengono gestite dagli utenti umani: tramite clic, digitazione e lettura -- ma con nomi che le macchine possono risolvere, eventi su cui le macchine possono attendere e una traccia di provenienza che distingue un utente reale da un chiamante sintetico.

NAC3 si affianca ad ARIA, non si sovrappone ad essa. Così come ARIA ha standardizzato l'**albero di accessibilità** per consentire a screen reader e dispositivi switch di operare sulla stessa UI che vede un utente vedente, NAC3 standardizza l'**albero degli agenti** in modo che un comando vocale, un intermediario LLM o un bot RPA possano fare la stessa cosa senza codice di collegamento specifico per ogni applicazione.

## Cosa si scrive

Un insieme di attributi HTML (`data-nac-id`, `data-nac-role`, `data-nac-action`, `data-nac-plugin`) più un manifest JS opzionale che assegna un nome agli elementi della pagina e ai verbi che accettano. Il runtime risolve i nomi negli elementi e li invia a destinazione.

## Cosa si ottiene

- Una pagina che risponde a `NAC.click('deals.create')` da qualsiasi chiamante -- un runner vocale, una specifica Playwright, un intermediario LLM, una macro da tastiera, uno strumento di accessibilità.
- Una pagina che emette una famiglia di eventi deterministica (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`, ...) in modo che il chiamante sappia quando ogni passaggio è completato.
- Una pagina in cui sono le identità degli elementi, non le coordinate, a guidare il contratto -- così una riprogettazione dell'interfaccia non rompe l'automazione.
- Un livello di provenienza (`isTrusted`, manifest firmati con HMAC) che indica a un sistema a valle se un clic proviene da un utente reale o da un altro agente.

## Cosa NAC3 non è

- Non è un framework UI. Si continua a usare React / Vue / vanilla / PHP / qualsiasi altra cosa. NAC3 è un contratto sottile sovrapposto a qualunque cosa si stia già renderizzando.
- Non è un LLM. L'LLM che traduce "clicca il pulsante salva" in `NAC.click('deals.save')` è un problema tuo (o del tuo fornitore); vedi `guides/LLM_WIRING.md` per un riferimento.
- Non è un sostituto dell'accessibilità. Mantieni i tuoi ruoli ARIA. NAC3 aggiunge un livello parallelo; molti adottanti finiscono per avere sia `role="button"` che `data-nac-role="action"` sullo stesso elemento.

## Stato

- **v1.9** -- stabile. 27 widget coperti, 9 famiglie di eventi, HMAC + isTrusted, modalità strict i18n, validatore. Il riferimento di produzione è `example.php`.
- **v2.0** -- introduce la migrazione brownfield (le pagine esistenti diventano NAC-driven con circa 80 righe di configurazione). Riferimento: `example-v20-full.php`.
- **v2.1** -- aggiunge la primitiva data-table (`collection`, `matrix`, `matrix-singletree` come sottotipi; `dt_add_row`, `dt_edit_cell`, aggregati, commit transazionale). Riferimento: `example-v21-data-table.php`.
- **v2.2** -- RILASCIATA il 2026-05-10. `NAC.register` è ora un validatore strict (`manifest_role_unknown`, `tab_id_manifest_role_drift`, `manifest_dom_role_mismatch`). Nuovo helper `NAC.bindAction(el, handler, ctx)` che incorpora il contratto `nac:action:succeeded` nel runtime. Nuovo flag `NAC.STRICT_VALIDATION` che alterna i risultati tra solo-avviso (predefinito in 2.2) e lancio di eccezione (predefinito in 2.3). **Questa è la versione distribuita oggi da `npm install @nac3/runtime`.** Vedi `docs/NAC_V22_ROADMAP.md` per il changelog completo.
- **v2.3** -- in pianificazione. Il valore predefinito di `STRICT_VALIDATION` passa a `true`. Companion `NAC.bindTab(el, handler, ctx)` per i widget a schede. Opt-in opzionale: dispatch di chat in streaming.

## Da dove iniziare

- Esegui le demo su `yujin.app/nac-spec/` (qualsiasi browser, qualsiasi dispositivo).
- Leggi `SPEC.md` per il contratto completo.
- Leggi `guides/REACT.md` se adotti NAC3 con React.
- Leggi `guides/LLM_WIRING.md` se colleghi il tuo intermediario LLM.
- Leggi `SECURITY.md` prima di distribuire NAC3 in un contesto multi-tenant.

## Governance

NAC3 è attualmente gestito da Yujin. La specifica è rilasciata sotto licenza Apache 2.0; il runtime di riferimento è MIT. Yujin si impegna a trasferire NAC3 a una fondazione neutrale (gruppo comunitario W3C, Linux Foundation o organismo di settore equivalente) qualora e quando l'adozione giustifichi una governance neutrale. Nel frattempo, le modifiche alla specifica seguono il processo RFC in `CONTRIBUTING.md` con un periodo di commento pubblico di almeno 14 giorni per qualsiasi modifica all'API pubblica o al formato wire.

La doppia licenza Apache 2.0 + MIT garantisce che la specifica e il runtime sopravvivano a qualsiasi cambiamento nello stato societario di Yujin. Gli adottanti possono fare fork di entrambi, eseguirli ed includerli nei propri prodotti, oggi e anche dopo che Yujin non esisterà più.

## Autori

NAC3 è scritto e mantenuto da Yujin (yujin.app). Apache-2.0. I contributi sono benvenuti -- vedi `CONTRIBUTING.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
