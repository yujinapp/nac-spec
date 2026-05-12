---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T12:56:29.155318+00:00
---

# Contribuire a NAC3

**Versione spec:** 2.2 stabile (+ anteprima interoperabilità v2.3).

## Governance

NAC3 è attualmente gestito da Yujin. La spec è rilasciata sotto Apache 2.0;
il runtime di riferimento è MIT. Yujin si impegna a trasferire NAC3 a
una fondazione neutrale (W3C community group, Linux Foundation, o
equivalente) qualora l'adozione giustifichi una governance neutrale.
Nel frattempo, le modifiche alla spec seguono il processo RFC descritto
di seguito, con almeno 14 giorni di commento pubblico per qualsiasi
modifica alle API pubbliche o ai formati wire.

La doppia licenza Apache 2.0 + MIT garantisce che la spec e il runtime
sopravvivano a qualsiasi cambiamento nello stato societario di Yujin.
I fork sono esplicitamente benvenuti sotto entrambe le licenze.

---

Grazie per aver considerato un contributo. NAC3 è una spec pubblica
accompagnata da un'implementazione di riferimento; entrambe accettano contributi.

## Tre tipi di contributo

### 1. Modifica alla spec (RFC obbligatoria)

Le modifiche a `SPEC.md`, `ABOUT.md` o `docs/NAC_V*_ROADMAP.md` sono
considerate modifiche alla spec. Prima di aprire una PR:

1. Apri una issue su GitHub con titolo `RFC: <sommario in una riga>`.
2. Descrivi la classe del problema (quale bug o limitazione risolve,
   idealmente con una riproduzione concreta).
3. Descrivi la modifica contrattuale proposta.
4. Descrivi il percorso di migrazione per gli adottanti esistenti.
5. Attendi almeno una risposta da un maintainer sulla issue prima
   di aprire la PR.

Le PR alla spec che arrivano senza una issue RFC associata verranno chiuse
con un rimando a questa sezione.

### 2. Modifica al runtime di riferimento

Modifiche a `js/nac.js`, `js/nac-v2-extensions.js` o
`js/nac-chat-client.js`. Le PR sono benvenute senza RFC se:

- La modifica è una correzione di bug che allinea il runtime alla
  spec corrente.
- La modifica è un miglioramento delle prestazioni senza variazioni
  comportamentali.
- La modifica riguarda documentazione, tipi o copertura dei test.

Le PR che modificano il comportamento del runtime in modo da influire sul
contratto della spec DEVONO essere accompagnate da una RFC alla spec.

### 3. Demo, strumenti o miglioramenti alla documentazione

Modifiche a `example*.php`, `tools/`, `guides/` o qualsiasi markdown
non relativo alla spec. PR diretta. Mantieni le modifiche minimali;
preferiamo dieci PR piccole a una grande.

## Stile del codice

- File sorgente solo ASCII (il progetto è distribuito su GoDaddy; PHP
  8.3 rifiuta caratteri non-ASCII anche nei commenti). Usa `--` per i
  trattini lunghi, non `--`.
- JS: niente transpiler, niente bundler, nessun passaggio di build sui
  file del runtime. ES2018+ puro. Il pacchetto npm aggiunge un wrapper
  ESM/CJS attorno alla stessa sorgente.
- PHP: mantieni gli heredoc semplici (solo `{$var}`, niente espressioni).
- Commenti: spiega il PERCHÉ, non il COSA. Il diff mostra già il cosa.
- Test: ogni modifica comportamentale deve essere accompagnata da un test
  che fallisce prima e passa dopo. Esegui `make test-launch` dalla root
  del repository prima di fare push.

## Stile dei commit

- Oggetto sotto i 70 caratteri, imperativo al presente.
  "fix(nac): treat tab role drift as register-time error", non
  "Fixed tab thing".
- Il corpo spiega il problema, la causa e la soluzione. Cita
  i commit correlati tramite SHA abbreviato.
- Il trailer Co-author per i commit assistiti da AI è accettato;
  non nascondiamo gli strumenti utilizzati.

## Revisione

- PR di bugfix: 1 approvatore, merge.
- PR al runtime/spec: 1 approvatore + CI verde, merge.
- PR di modifica alla spec: issue RFC associata con discussione + 1 approvatore
  + CI verde + finestra di commento di 7 giorni dopo l'apertura della PR.

## Licenza

Inviando una PR, rilasci il tuo contributo sotto Apache-2.0
in linea con il progetto. Il template della PR include una casella da spuntare;
selezionala.

## Codice di condotta

Sii tecnicamente corretto, conciso e rispettoso. Il disaccordo è benvenuto;
gli attacchi personali no. I maintainer possono chiudere thread o revocare
l'accesso ai commit in caso di violazioni ripetute.

## Dove fare domande

- GitHub Discussions per domande di design, "dovrei usare NAC3 per
  questo?" e showcase.
- GitHub Issues per segnalazioni di bug.
- `nac@yujin.dev` per segnalazioni di sicurezza (vedi `SECURITY.md`).

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
