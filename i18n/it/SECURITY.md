---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: it
translation_date: 2026-05-11T12:56:52.028522+00:00
---

# NAC3 -- modello di sicurezza

**Versione spec:** 2.2 stable (+ anteprima interop v2.3).

## Modello delle minacce

NAC3 si interpone tra gli agenti e la tua UI. È un livello contrattuale, non un livello di autenticazione. Esistono diversi confini di fiducia distinti; questo documento li elenca in modo che tu possa ragionare chiaramente su quali NAC3 protegge e quali no.

### Confine A: Utente -> UI

Fuori dallo scope di NAC. Usa il tuo sistema di autenticazione esistente (sessioni, OAuth, SSO, MFA). Una volta che l'utente è autenticato, NAC3 assume che qualsiasi azione che l'utente può compiere nella UI sia consentita.

### Confine B: Agente controllato dall'utente -> UI

Un utente concede a un agente il permesso di pilotare la propria sessione browser. Esempi: un assistente vocale, uno screen reader, un client di chat LLM incorporato nella stessa pagina. Il ruolo di NAC3 in questo caso:

1. Fornire all'agente nomi di elementi stabili in modo che possa agire senza dover ricavare coordinate tramite scraping.
2. Esporre `event.isTrusted` affinché l'host possa rifiutare click sintetici per azioni sensibili dal punto di vista della sicurezza (pagamenti, eliminazioni, assegnazione di ruoli). L'agente non può falsificare `isTrusted=true`; solo un gesto reale dell'utente lo imposta.
3. Fornire ack a livello di evento affinché l'agente sappia cosa è stato completato senza dover rileggere il DOM.

NAC3 NON protegge contro un agente che l'utente ha esplicitamente autorizzato e che abusa di tale fiducia. Si tratta di un problema di esperienza utente (prompt di consenso prima delle azioni sensibili) gestito dalla tua applicazione, non da NAC.

### Confine C: Servizio esterno -> UI (intermediario LLM)

Se il prompt vocale di un utente viene inviato a un LLM remoto che restituisce azioni NAC3, l'LLM diventa un principale di fiducia. Il ruolo di NAC3 in questo caso:

1. L'LLM vede solo ciò che `NAC.describe()` espone (lo snapshot dell'albero + i manifest registrati). Non vede i token di autenticazione dell'utente, i cookie né gli internals del DOM al di là di quanto dichiarato nel manifest.
2. L'LLM non può causare direttamente un click. Restituisce un'azione strutturata; il client di chat la valida (il `nac_id` esiste? il verbo è consentito?) prima di eseguirla.
3. Il client di chat DOVREBBE rifiutare azioni il cui `nac_id` non era presente nello snapshot inviato (previene prompt injection che introduce id arbitrari di contrabbando).

NAC3 NON prescrive il template di prompt dell'LLM, i rate limit né il filtraggio. Consulta `guides/LLM_WIRING.md` per le raccomandazioni.

### Confine D: Tenant -> Tenant (deployment multi-tenant)

SaaS multi-tenant in cui i tenant condividono un runtime ma non i dati. NAC3 protegge questo scenario con manifest firmati tramite HMAC:

1. Ogni tenant distribuisce il proprio manifest con una firma HMAC calcolata su una serializzazione stabile, usando un segreto per-tenant conservato lato server.
2. Il runtime, al momento di `NAC.register()`, ricalcola l'HMAC usando il segreto atteso per il tenant attivo. Se la firma non corrisponde, il manifest viene rifiutato.
3. Un tenant malevolo non può falsificare il manifest di un altro tenant senza il segreto di firma.

NAC3 NON impedisce a un tenant di registrare un manifest eccessivamente grande o malformato al di là di un limite base sulla dimensione; applica rate limiting alla registrazione dei manifest lato server se accetti manifest non attendibili.

### Confine E: Script malevolo -> Pagina

Una pagina che include JS controllato da un attaccante (XSS, compromissione della supply chain) è già compromessa. NAC3 non può essere d'aiuto in questo caso; l'attaccante può chiamare `NAC.click(...)` direttamente. Mitiga tramite CSP, SRI e il tuo consueto stack di sicurezza web.

## Segnali di provenienza

### `is_trusted` negli eventi di successo

Il dettaglio di ogni evento di successo di un'azione contiene `is_trusted: boolean`. Un host può richiederlo per i verbi sensibili:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

La demo di riferimento `example-v20-full.php` include una coppia di pulsanti (`v20_panel.istrusted_real` e `v20_panel.istrusted_fake`) che illustra la distinzione nell'output del pannello.

### Firma HMAC dei manifest

Lato server, genera la firma:

```python
import hmac, hashlib, json
manifest_body = json.dumps(manifest, sort_keys=True, separators=(',', ':'))
sig = hmac.new(
    tenant_secret.encode('utf-8'),
    manifest_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()
manifest['provenance'] = {
    'signed_at': now_iso8601(),
    'signed_by': tenant_slug,
    'signature': sig
}
```

Lato client:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

Il segreto DEVE provenire da una risposta server autenticata; non incorporarlo mai nel sorgente JS. Ruotalo per sessione se il modello delle minacce lo richiede.

## Segnalare una vulnerabilità

Invia un'email a `nac@yujin.dev` con:

1. Descrizione della vulnerabilità.
2. Passi per la riproduzione o proof-of-concept.
3. Versione/i di NAC3 interessata/e.
4. Mitigazione suggerita, se disponibile.

NON aprire una issue pubblica su GitHub. Ci impegniamo a:

- Confermare la ricezione entro 3 giorni lavorativi.
- Fornire una valutazione di triage entro 10 giorni lavorativi.
- Coordinare i tempi di divulgazione con il segnalante.

I problemi critici che riguardano la spec pubblica vengono rilasciati con una patch release entro 30 giorni; quelli di gravità inferiore entro 90.

## Cosa NAC3 esplicitamente NON fa

- Autenticare gli utenti.
- Cifrare i dati in transito (usa TLS).
- Impedire all'utente di fare ciò che gli è consentito fare.
- Isolare gli agenti gli uni dagli altri (girano tutti nella stessa pagina; se vuoi isolamento, usa pagine separate).
- Firmare le singole azioni (solo i manifest). La firma per-azione è tracciata come candidata per la v3.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
