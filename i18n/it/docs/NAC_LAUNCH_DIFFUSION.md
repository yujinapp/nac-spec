---
translation_source: docs/NAC_LAUNCH_DIFFUSION.md
translation_source_hash: cbdf7b9e5ec3ed43a39111aab16fbe59c222a05a835429ea43148036320fc5cf
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:36:44.000349+00:00
---

# Piano di diffusione per il lancio di NAC3

Un playbook pratico per portare NAC3 all'attenzione delle persone che
dovrebbero usarlo. Scritto il 2026-05-10 per il lancio di v2.2 / v2.3-preview.

## Cosa stiamo rilasciando

- **Spec:** v2.2 stabile, v2.3 preview (primitiva field editor).
- **Runtime:** `@nac3/runtime@2.2.0` su npm (ESM + CJS + d.ts + CLI).
- **Demo:** quattro demo live su yujin.app/nac-spec/.
- **Guide all'adozione:** React + Angular + integrazione con LLM.
- **Casi studio:** app funzionanti con Vite + React 18 e Angular 17 in
  `packages/nac-react-demo` + `packages/nac-angular-demo`.
- **Storia di migrazione brownfield:** il CRM Yujin stesso, documentato
  in pkuschnirof/yujin docs/MIGRATION_FROM_RPAFORCE.md.
- **Conformità NAC-3:** la landing page stessa è conforme a NAC-3
  (manifest + chat + autopilot + isTrusted-aware).

## Messaggi chiave

### Frase sintetica

> **NAC3 -- la piccola spec pubblica che permette alle UI web di essere
> guidate da agenti AI, runner vocali e strumenti di accessibilità
> senza codice di collegamento specifico per ogni app.**

### Tre righe

> NAC3 è quello che ARIA sarebbe stato se fosse stato progettato nel
> 2026 tenendo conto degli LLM. Decora la tua UI esistente con tre
> attributi HTML; il runtime risolve i nomi, invia i click, emette
> eventi di completamento, gestisce la localizzazione e fornisce
> la provenienza. Apache-2.0, npm install, nessuna modifica al processo
> di build.

### Pitch da 30 secondi

> Gli assistenti vocali, gli agenti chat basati su LLM e gli strumenti
> di accessibilità affrontano tutti lo stesso problema: hanno bisogno
> di nomi stabili per gli elementi su cui vogliono agire. I selettori
> CSS si rompono. ARIA si ferma a "questo è un pulsante". Ogni team
> costruisce da zero la stessa infrastruttura di base.
>
> NAC3 è il piccolo contratto che risolve questo problema. Aggiungi
> `data-nac-id`, `data-nac-role`, `data-nac-action` agli elementi che
> un agente deve pilotare; il runtime si occupa del resto. Esiste una
> spec v2.2 funzionante, un pacchetto npm stabile, guide per React +
> Angular, e quattro demo live tra cui una collegata end-to-end a un
> backend chat Claude Sonnet con cui puoi parlare adesso.
>
> È Apache-2.0. L'abbiamo creato perché gestiamo un CRM che ne aveva
> bisogno. Ora puoi usarlo anche tu.

## Pubblici di riferimento

| Pubblico | Canale | Aggancio |
|----------|--------|----------|
| Sviluppatori React + Vue + Svelte + Angular | dev.to, Hashnode, r/javascript, r/webdev | "Pilota la tua app React esistente con la voce in 80 righe" |
| Sviluppatori di agenti vocali | r/LocalLLaMA, r/ChatGPTCoding, Discord per sviluppatori di agenti | "Uno standard che mancava al lato utente delle app vocali" |
| Esperti di accessibilità | r/Accessibility, mailing list a11y, speaker di meetup A11y | "ARIA progettato nel 2026 con gli LLM in mente" |
| Ingegneri di test/QA | r/qualityassurance, community Selenium / Playwright | "Selettori stabili che sopravvivono ai redesign della UI" |
| HN | news.ycombinator.com | il canonico Show HN |
| Tech lead + CTO | LinkedIn, Mastodon | l'angolazione "lo aggiungerai comunque tra 12 mesi" |
| Utenti del CRM Yujin | email diretta + banner in-product | "il tuo CRM parla NAC3; ecco cosa significa" |

## Canali e post di esempio

### Show HN

- **Titolo:** `Show HN: NAC -- a small public spec that lets web UIs be driven by AI agents`
- **Prima riga:** "We made this while building Yujin CRM and realised every team trying to ship voice/agent UI rebuilds the same plumbing."
- **Corpo:** spiegare il contratto (3 attributi + manifest + eventi), linkare la demo live, la spec, il pacchetto npm e il caso studio React. Mantenerlo sotto le 200 parole. I thread di commenti attirano più attenzione dei post lunghi.
- **Giorno:** martedì o mercoledì mattina (ora US). Evitare lunedì e venerdì.
- **Follow-up:** essere nei commenti per almeno 4 ore; rispondere a ogni domanda tecnica; non rispondere alle provocazioni.

### r/javascript

- **Titolo:** `[Showoff] NAC: drive your React app with voice + chat using 3 HTML attributes`
- **Corpo:** concentrarsi su "cosa fa chi adotta React" -- esempi di codice da `guides/REACT.md`. Linkare la directory GitHub del caso studio.

### r/Accessibility

- **Titolo:** `NAC: a parallel layer to ARIA for AI-agent-driven UI`
- **Corpo:** iniziare con "questo NON è un sostituto di ARIA, è un complemento" -- gli esperti di accessibilità sono protettivi, giustamente. Mostrare come `data-nac-role="action"` e `role="button"` coesistono.

### dev.to

- **Titolo:** `Drive any web UI by voice with @nac3/runtime`
- **Aggancio:** il repo del caso studio React. Screenshot/gif inline del pannello chat e del tour autopilot.
- **Lunghezza:** 1500-2000 parole. Passo dopo passo.

### Twitter / X

Un thread da 6 tweet:

1. "Abbiamo appena rilasciato NAC3 v2.2 -- una spec pubblica + pacchetto npm che permette alle UI web di essere guidate da agenti AI. Apache-2.0. (gif della demo)"
2. "Perché: ogni team che costruisce UX vocale/agente ricostruisce la stessa infrastruttura di base. I selettori CSS si rompono. ARIA non è pensato per gli agenti. Avevamo bisogno di un piccolo contratto."
3. "Quanto è piccolo: 3 attributi HTML per elemento. (screenshot del codice)"
4. "Cosa ottieni: nomi stabili, eventi di completamento deterministici, i18n in 10 lingue out of the box, provenienza tramite HMAC + isTrusted, validazione automatica."
5. "Demo live su yujin.app/nac-spec -- quattro demo, una collegata a un backend chat Claude Sonnet. Parlagli."
6. "Guide all'adozione per React + Angular + casi studio funzionanti su github.com/yujinapp/nac-spec. Spec su yujin.app/nac-spec/SPEC.md."

### LinkedIn

Post in formato lungo (~600 parole). Puntare sull'angolazione "lo aggiungerai comunque tra 12 mesi"; rivolgersi ai CTO che stanno valutando la propria strategia per gli agenti. Includere uno screenshot del tour autopilot in stile BPMN.

### Mastodon

Ricondividere il thread Twitter, mantenerlo conciso. Includere alt-text su ogni immagine (è importante lì).

## Piano per gif/video della demo

### Gif (15 secondi, in loop)

Scena 1 (4s): l'utente digita "agrega tomar agua" nell'input chat
della demo React.
Scena 2 (3s): l'LLM risolve; il todo viene aggiunto con un
flash di evidenziazione.
Scena 3 (4s): l'utente clicca "tour"; l'autopilot percorre la pagina
narrandola.
Scena 4 (4s): l'utente tiene premuto il microfono, dice "remove all done", i todo si cancellano.

Ospitato come MP4 da 8MB + fallback WebP da 4MB su
`yujin.app/nac-spec/assets/demo.{mp4,webp}`. Usato come gif hero del README, immagine OG, Twitter card, intestazione dev.to.

### Video (90 secondi, con voiceover)

Pubblicato su YouTube + Vimeo.
- 0:00-0:10 -- il problema ("voce + agenti hanno bisogno di nomi stabili").
- 0:10-0:25 -- il contratto (3 attributi).
- 0:25-0:45 -- demo di adozione (caso studio React, 5 righe aggiunte).
- 0:45-1:05 -- pilotaggio tramite chat + voce + autopilot.
- 1:05-1:20 -- esempio brownfield del CRM Yujin.
- 1:20-1:30 -- "Apache-2.0, npm install @nac3/runtime, link qui sotto."

## Cadenza di follow-up

| Tempo | Azione |
|-------|--------|
| Giorno 0 | Show HN + r/javascript + thread Twitter + articolo dev.to. Rispondere ai commenti per 4-8 ore. |
| Giorno 1 | Post LinkedIn. Rispondere ai commenti su dev.to. Aggiungere al backlog GitHub i problemi semplici sollevati. |
| Giorno 3 | Post su r/Accessibility + ricondivisione su Mastodon. |
| Giorno 7 | Post sul blog "riflessione della settimana 1": feedback ricevuto, cosa abbiamo cambiato, principali issue GitHub aperte. |
| Giorno 14 | Contattare con un DM "vuoi fare una chiacchierata?" le persone del mondo accessibilità / sviluppo agenti che hanno interagito il giorno 0. |
| Giorno 30 | Rilascio di una patch v2.2.x con le correzioni più richieste dalla community. Post di annuncio: "cosa 30 giorni ci hanno insegnato su NAC3". |
| Giorno 90 | NAC3 v2.3 rilasciato (field editor canonico, STRICT_VALIDATION default true). Nuovo impulso di lancio, impatto ridotto. |

## Metriche da monitorare

- Download settimanali di `@nac3/runtime` su npm.
- Stelle e fork GitHub su `yujinapp/nac-spec` e
  `pkuschnirof/yujin`.
- Visualizzazioni della pagina demo su yujin.app/nac-spec/ (log di accesso al server).
- Numero di issue GitHub aperte (indicatore di coinvolgimento).
- Numero di commentatori unici su tutti i canali sopra indicati.
- Tendenza di ricerca per "Native Agent Contract" (Google Trends).

Obiettivi, settimana 1:
- 200 download npm
- 100 stelle GitHub tra i due repo
- 5000 visualizzazioni della pagina demo
- 10 issue / discussioni aperte
- 1 post sul blog non sollecitato da un utente esterno

Se mancassimo questi obiettivi del 50%+, il messaggio va rivisto; iterare il testo del post LinkedIn + dev.to e riprovare al giorno 14.

## Checklist pre-lancio (prima di pubblicare)

- [ ] `npm publish @nac3/runtime@2.2.0` completato (operazione **manuale**;
      richiede il token npm del proprietario).
- [ ] `npm install @nac3/runtime` funziona da una directory tmp pulita.
- [ ] Le demo live si caricano senza errori in console su Chrome + Firefox + Safari.
- [ ] `validate_global({probe: true})` restituisce `[]` sulla landing.
- [ ] La gif della demo viene renderizzata correttamente nelle anteprime di dev.to + Twitter.
- [ ] `LICENSE`, `CONTRIBUTING`, `SECURITY` tutti presenti.
- [ ] Almeno una issue GitHub aperta con etichetta "good first issue"
      così i contributori che arrivano il giorno 1 hanno da dove iniziare.
- [ ] Pablo è sveglio e pronto a rispondere ai commenti per 4 ore.

## Anti-obiettivi

Cosa NON faremo:

- Pagare per pubblicità (almeno fino a quando non avremo le metriche della settimana 4).
- Parlare male di ARIA, Selenium, Playwright o di qualsiasi vendor di agenti.
  NAC3 è additivo, non avversariale.
- Promettere contratti di supporto enterprise al lancio (quelli arrivano
  dopo aver capito il carico di supporto).
- Fare open-source washing: il codice È Apache-2.0, E lo è anche
  l'implementazione di riferimento del backend chat. Non separiamo le
  funzionalità "core" da quelle "premium" come barriera competitiva --
  la barriera è hosting + crediti LLM + operations.

## Playbook del giorno del lancio

Ottimizzato per il fatto che Pablo lo gestisce da solo:

| Orario | Azione |
|--------|--------|
| 06:00 (US ET) | Smoke test finale: `npm test` + `npx @nac3/runtime validate yujin.app/nac-spec/` + aprire tutte le demo in incognito. Correggere eventuali problemi. |
| 09:00 | Show HN pubblicato. |
| 09:05 | Thread Twitter pubblicato. |
| 09:15 | Post su r/javascript pubblicato. |
| 09:30 | Articolo dev.to pubblicato. |
| 09:30-13:30 | Attivo nei commenti HN. Fissare un commento in cima con link rapidi. |
| 14:00 | Post LinkedIn. |
| 14:00-18:00 | Attivo nei commenti dev.to + menzioni Twitter. |
| 18:00 | Stop. Decomprimere. |
| Giorno 1 09:00 | r/Accessibility + Mastodon. Triage delle issue GitHub. |

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_LAUNCH_DIFFUSION.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
