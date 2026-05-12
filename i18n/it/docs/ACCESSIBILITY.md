---
translation_source: docs/ACCESSIBILITY.md
translation_source_hash: 615f9c5a447d95c7aee985d926f7b29377bed44dc959fd07a966fd41fa86a03b
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T14:25:36.412611+00:00
---

# NAC3 -- Impegno per l'accessibilità

**Versione spec:** 2.2 stabile (+ anteprima interoperabilità v2.3).
**Ultima revisione:** 2026-05-11.

NAC3 è stato progettato per rendere le interfacce web indirizzabili dalle macchine. La stessa proprietà che rende un'interfaccia navigabile da un agente AI la rende navigabile da uno screen reader, un dispositivo switch, un eye tracker e un utente vocale. NAC3 è, per costruzione, un primitivo di accessibilità -- e Yujin si impegna a mantenerlo tale.

---

## L'impegno

1. **Conformità WCAG 2.1 Livello AA** come requisito minimo per ogni prodotto Yujin basato su NAC3 (`yujin-pilot`, `yujin-forge`, le demo di riferimento su yujin.app/nac-spec/, yujin.app/registry).
2. **AAA dove possibile** per le superfici in cui l'accessibilità è più critica: pannello chat, attivazione vocale, onboarding iniziale, messaggi di errore.
3. **Nessuna "edizione accessibile" separata**. L'accessibilità è inclusa nel prodotto principale, allo stesso prezzo, con la stessa cadenza di rilascio. Le edizioni separate stigmatizzano gli utenti e degradano nel tempo.
4. **Nessun "accessibile in seguito"**. Ogni rilascio è condizionato ai controlli di accessibilità documentati nella sezione 8.6 di [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) e nella nuova sezione di smoke test per screen reader (Track G7).

---

## Tecnologie assistive supportate

Le implementazioni di riferimento sono testate con:

| Categoria AT | Strumenti verificati |
|-------------|----------------|
| Screen reader | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Controllo vocale | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Accesso switch | iOS Switch Control, Android Switch Access |
| Eye tracking | Tobii Dynavox |
| Ingrandimento | Zoom del browser fino al 200%, ZoomText, macOS Zoom |
| Solo tastiera | Navigazione completa da tastiera, focus visibile, nessun limite di tempo |

Qualsiasi AT che utilizza l'albero di accessibilità standard (ARIA, accessibilityRole, accessibilityLabel) beneficia di NAC3, poiché gli elementi NAC3 portano le stesse informazioni semantiche utilizzate dal livello AT.

---

## Contributo di NAC3 all'accessibilità (meccanismo)

- **Identificatori stabili (`data-nac-id`)**: gli screen reader e i dispositivi switch non dipendono dalla posizione visiva. L'identificatore sopravvive ai redesign, quindi anche la memoria muscolare degli utenti AT rimane valida.
- **Ruoli canonici (`data-nac-role`)**: l'enumerazione dei ruoli (action, field, tab, ecc.) mappa 1:1 con i ruoli ARIA. Gli utenti AT ricevono annunci semanticamente corretti.
- **Verbi del manifest (`label_i18n`)**: ogni azione ha un'etichetta localizzata in 10 lingue. Gli utenti del controllo vocale pronunciano il verbo; il manifest lo risolve.
- **Eventi ack deterministici (`nac:action:succeeded`)**: gli utenti AT ricevono conferma che un'azione è stata completata, non un'ipotesi basata sull'animazione dell'interfaccia.
- **Validazione rigorosa (v2.2)**: rileva le discrepanze tra manifest e DOM prima che raggiungano gli utenti AT.

---

## Cosa NAC3 NON risolve

- **Applicazioni native iOS/Android**: la spec v2.2 copre solo web + WebView. Il mobile nativo è nella roadmap v3.0.
- **Presentazione visiva**: NAC3 è strutturale. Contrasto, dimensione del testo e indicatori di focus sono responsabilità dell'implementazione (i token Yujin coprono questo aspetto nelle nostre implementazioni di riferimento).
- **Carico cognitivo di flussi complessi**: gli id NAC3 non semplificano un flusso di lavoro mal progettato. Una buona architettura informativa e testi in linguaggio semplice fanno la differenza.
- **Sottotitolazione di contenuti multimediali**: le risorse audio/video devono essere sottotitolate dall'editore. NAC3 fornisce gli hook, ma non il contenuto.

---

## Segnalare un problema di accessibilità

Scrivi a `accessibility@yujin.app` (o all'indirizzo che viene inoltrato al maintainer). SLA di risposta: 5 giorni lavorativi per il triage, nessun SLA sulla correzione perché ogni caso è diverso. I problemi sono tracciati pubblicamente nel repository `nac-spec` con l'etichetta `a11y`.

Per problemi sensibili alla sicurezza (ad es. bypass AT delle finestre di conferma), segui `SECURITY.md`.

---

## Roadmap

| Track | Descrizione | Target |
|-------|-------------|--------|
| G1 | Audit WCAG 2.1 AA + remediation (Forge + Pilot UI) | Pre Forge/Pilot v1 |
| G2 | Procedura guidata di configurazione voice-first (Forge + Pilot first-run) | Forge/Pilot v1 |
| G3 | Conformità NAC3 in ogni pagina della documentazione | Lancio NAC3 v2.2 |
| G4 | Versione audio (.mp3) di ogni guida | NAC3 v2.3 |
| G5 | Tutorial conversazionale su yujin.app/learn | NAC3 v2.3 |
| G6 | Versione parallela in linguaggio semplice delle guide principali | NAC3 v2.3 |
| G7 | Smoke test per screen reader in HUMAN_OK_CHECKLIST | Lancio NAC3 v2.2 |
| G8 | Programma beta con utenti reali con disabilità | Pre Forge/Pilot v1 |
| G9 | Questa dichiarazione, pubblica e collegata da ogni pagina | Lancio NAC3 v2.2 |
| G10 | Audit certificato esterno | Pre Forge/Pilot 1.0 commerciale |

---

## Perché pubblichiamo questo

Due ragioni pratiche, oltre all'etica:

1. **EU Accessibility Act (EAA)** è entrato in vigore a giugno 2025 per i servizi B2C. Le app realizzate con Forge sono conformi a NAC3 per impostazione predefinita e partono già più vicine alla conformità EAA rispetto ai concorrenti.
2. **Le cause ADA Title III negli USA relative alle web app** sono cresciute del 320% anno su anno. Gli acquirenti enterprise se ne preoccupano. NAC3 + la postura di conformità Yujin riduce la loro esposizione legale.

NAC3 non è uno "standard aperto con l'accessibilità come bonus". NAC3 è "l'unico contratto di automazione web general-purpose che è nativamente accessibile per costruzione". Lo manterremo tale.

---

## Vedi anche

- [SPEC.md](../SPEC.md) -- il contratto canonico.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- include la sezione di smoke test per screen reader.
- [SECURITY.md](../SECURITY.md) -- modello di sicurezza, include le problematiche legate agli AT.

## Licenza

Questo documento è rilasciato sotto Apache-2.0. Le implementazioni a cui si impegna sono MIT (runtime) / Apache-2.0 (spec) / proprietarie (Forge, Pilot).

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/ACCESSIBILITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
