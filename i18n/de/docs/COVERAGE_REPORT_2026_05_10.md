---
translation_source: docs/COVERAGE_REPORT_2026_05_10.md
translation_source_hash: 4da4311e057dd1c23dea9b23a506ada42741d28b05b94709cb5150b1686c51ac
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T14:49:44.182931+00:00
---

# NAC3 Coverage-Bericht -- Nacht vom 2026-05-10 / 11

Erstellt am Ende der Coverage-Nacht auf Branch
`feat/nac-interop-mcp`. Dies ist die ehrliche, fallweise
Dokumentation dessen, was getestet wurde und in welcher Tiefe.

Ersetzt die früheren informellen Angaben „50/50 PASS" /
„5/5 Layer GREEN". Diese Zahlen waren strukturell korrekt,
aber die Tiefe war ungleichmäßig; dieser Bericht stellt das
Bild nach Pipeline-Stufe neu dar.

## Erinnerung: Pipeline-Stufen

```
Comunicacion -> Desambiguacion -> Intencion -> Llamada -> Resultado -> Ack
    (1)              (2)             (3)         (4)        (5)         (6)
```

## Ausgelieferte Suites (dieser Branch)

| Suite | Pfad | Tests |
|-------|------|-------|
| smoke | `packages/nac/test/smoke.mjs` | 36 |
| v22 (constructor strict + bindAction) | `packages/nac/test/v22.mjs` | 14 |
| v23-interop (cross-app MCP) | `packages/nac/test/v23-interop.mjs` | 14 |
| stage1-audio (STT mock + TTS corpus) | `packages/nac/test/stage1-audio.mjs` | 33 |
| stage2-disambiguation | `packages/nac/test/stage2-disambiguation.mjs` | 31 |
| stage3-backend (Live-Aufrufe) | `packages/nac/test/stage3-backend.mjs` | ~80 |
| stage4-calls | `packages/nac/test/stage4-calls.mjs` | 31 |
| stage6-ack | `packages/nac/test/stage6-ack.mjs` | 16 |
| **Gesamt lokal** | | **175+** |

Alle aktuell lokal PASS. Keine GitHub Actions aktiv (kein
Credit-Budget; Tests laufen nur auf Pablos Laptop + auf Anfrage).

## Coverage-Matrix nach Pipeline-Stufe

### Stufe 1 -- Comunicacion (STT + Roheingabe)

| Schicht | Status | Anmerkungen |
|---------|--------|-------------|
| **CAPA A: STT mock + Corpus-Injektion** | PASS (30/30) | `packages/nac/test/stage1-audio.mjs`. Mock `SpeechRecognition` erzeugt ein `result`-Event; NacChat empfängt und dispatcht normal. Prüft, dass Sprach-Traps in der Locale bleiben, Switch-Prompts wechseln und normale Prompts das Backend auslösen. |
| **CAPA B: Corpus-Integrität** | PASS (3/3) | 30 MP3-Dateien generiert via Google Cloud TTS unter `packages/nac/test/fixtures/voice/`. Gesamt 365 KB über 10 Locales. Datei-Präsenz + Mindestgröße als Plausibilitätsprüfung. |
| Browser SpeechRecognition echte Audio-Wiedergabe | ZURÜCKGESTELLT | Web Speech API benötigt einen echten Mikrofon-Stream + Browser. Gehört zu Playwright e2e (in der Warteschlange). |

**Stufe-1-Coverage: ~85%** -- Text-, Corpus- und STT-Mock-Pfade
vollständig abgedeckt. Nur die echte Browser-Audio-Wiedergabe
steht noch aus, die Playwright erfordert.

### Stufe 2 -- Desambiguacion

| Aspekt | Fälle | Ergebnis |
|--------|-------|----------|
| `_detectLangSwitch` False-Positive-Schutz (Bug-Klasse f631d77a) | 12 | PASS -- `cambia de pestana`, `cambia precio de mouse 40`, `borra de la lista`, `pasa de A a B` bleiben KORREKT auf Spanisch. `cambia a aleman`, `switch to english`, `use spanish`, `cambia idioma a de` wechseln korrekt. Same-lang-Noop + leere Eingabe ohne Absturz. |
| `tab_by_label` exakter textContent-Abgleich | 1 | PASS |
| `tab_by_label` Klammer-Stripping (`"Lines (collection)"` trifft `"Lines"`) | 1 | PASS |
| `tab_by_label` i18n-Locale-Abgleich | 1 | PASS |
| `tab_by_label` unbekannt -> not_found | 1 | PASS |
| `snapshotTree` liefert gültige Struktur | 6 | PASS |

**Stufe-2-Coverage: ~95%.** Die Matcher-Verschärfung (Anforderung
cand.length >= 3 für Teilabgleiche) wurde als Nebenfix in
derselben Suite ausgeliefert und schließt das 1-Zeichen-
Füll-Label-False-Positive.

### Stufe 3 -- Intencion

Live-Aufrufe gegen den Produktions-Endpunkt
`https://yujin.app/crm/api/v1/yujin/nac-demo`. Das Yujin-Chat-
Backend (Claude Sonnet) ist der LLM-Intermediär.

| Aspekt | Fälle | Ergebnis |
|--------|-------|----------|
| HTTP 200 + JSON-Antwort pro Prompt | 15 Prompts in 7 Locales (es/en/pt/fr/de/ja + ein spanischer Trap-Prompt) | PASS für alle |
| Antwort enthält `ok`-Boolean | 15 | PASS |
| Bei `ok`: `message`-String + `actions`-Array vorhanden | 15 | PASS |
| Jede Action enthält `kind`-String | 15 | PASS |
| **Anti-Bug-Schutz**: `cambia de pestana` emittiert KEIN `change_locale: 'de'` | 1 | PASS -- der Live-LLM hält die am 2026-05-09 ausgelieferte System-Prompt-Regel ein. |

**Stufe-3-Coverage: ~85%** des Vertragsschemas. Nicht 100%,
da die konkreten Action-Inhalte des LLM nicht deterministisch
sind; es wird nur das Schema + der Anti-Bug-Fall geprüft.

### Stufe 4 -- Llamada (alle öffentlichen NAC.*-Funktionen)

| Funktion | Fälle | Ergebnis |
|----------|-------|----------|
| `NAC.click` | happy / not_found / invalid | 3 PASS |
| `NAC.click_by_verb` | happy / unbekanntes Verb | 2 PASS |
| `NAC.fill` | happy / not_found / Wert im DOM gesetzt | 3 PASS |
| `NAC.select` | happy / not_found | 2 PASS |
| `NAC.tab` | happy / unbekannter Key / Plugin nicht gemountet | 3 PASS |
| `NAC.tab_by_label` | textContent / Klammern / i18n / not_found | 4 PASS (Überschneidung mit Stufe 2) |
| `NAC.go_to_section` | happy / section_not_found | 2 PASS |
| `NAC.set_mode` | gültig / ungültig | 2 PASS |
| `NAC.screenshot` | liefert Data-URL | 1 PASS |
| `NAC.edit_field` (v2.3 Preview) | öffnet / not_found / invalid | 3 PASS |
| `NAC.dt_add_row` | liefert row_id | 1 PASS |
| `NAC.dt_edit_cell` | happy / weist Ungültiges ab | 2 PASS |
| `NAC.dt_remove_row` | dekrementiert State | 1 PASS |
| `NAC.dt_commit` | liefert final_state | 1 PASS |
| `NAC.dt_discard` | setzt nicht committete Änderungen zurück | 1 PASS |
| `NAC.dt_read_aggregate` | Summen-Aggregat | 1 PASS |
| `NAC.bindAction` | Handler feuert + Unbinder funktioniert | 2 PASS |

**Stufe-4-Coverage: ~95%** der öffentlichen Schreibfläche. Fehlend:
`drag_drop` (noch kein Shim-Coverage), v1.3 Toast / Banner /
Confirm-Dialog-Primitive (niedrige Priorität für v2.x).

### Stufe 5 -- Resultado (DOM-Seiteneffekte)

| Aspekt | Status |
|--------|--------|
| `fill` aktualisiert input.value | PASS (T6 Stufe 4 verifiziert) |
| `select` aktualisiert Select-Element | PASS (T8 Stufe 4) |
| `dt_*`-Mutationen spiegeln sich in `dt_state()` | PASS (T24-T30 Stufe 4) |
| `edit_field`-Modal wird gemountet | PASS (T21 Stufe 4) |
| Vollständige Playwright-DOM-Verifikation | ZURÜCKGESTELLT -- erfordert echten Browser + Vite/ng-build-Schritte |

**Stufe-5-Coverage: ~70%** auf Unit-Ebene. Vollständige DOM-
Verifikation in der Warteschlange.

### Stufe 6 -- Ack-Event-Familie

| Familie | Fälle | Ergebnis |
|---------|-------|----------|
| `nac:action:succeeded`-Schema (plugin + action_id + is_trusted) | 4 | PASS |
| `nac:field:changed`-Schema | 3 | PASS |
| `nac:tab:activated`-Schema | 2 | PASS |
| `nac:action:failed` bei Handler-Ausnahme | 2 | PASS |
| `bindAction` async-resolve-Pfad | 1 | PASS |
| Click-to-resolve-Timing < 200ms | 1 | PASS |
| Kanonisches Detail-Schema über alle Familien | 3 | PASS |

**Stufe-6-Coverage: ~95%.** Fehlend: die Long-Tail-Event-
Familien (`nac:breadcrumb:navigated`, `nac:accordion:expanded`,
`nac:step:advanced`, `nac:table:sort_changed`,
`nac:table:filter_changed`, `nac:confirm:resolved`). Das Muster
ist identisch; deren Abdeckung wäre rein mechanisch.

### Querschnitt: Interop (v2.3 Preview)

| Aspekt | Fälle | Ergebnis |
|--------|-------|----------|
| `export_tree`-Schema + Scope + Locale-Filter | 7 | PASS |
| `import_remote_tree` validiert Verbindung + registriert Namespace-Plugins + spiegelt sich in der Liste | 5 | PASS |
| Proxy-Dispatch für `click` + `fill` | 4 | PASS |
| Lokaler Ack-Spiegel mit `via_interop:true` | 1 | PASS |
| Peer-Fehlercode wird weitergeleitet | 1 | PASS |
| `disconnect_remote` + Ablehnung nach Trennung | 2 | PASS |
| Lokale Klicks werden NICHT proxied | 1 | PASS |

**Interop-Coverage: 100%** der v2.3-Preview-Oberfläche.

## Coverage-Zusammenfassung -- gewichtete Pipeline

| Stufe | Coverage | Bewertung |
|-------|----------|-----------|
| 1 Comunicacion | **85%** | STT mock + TTS corpus PASS. Nur echte Browser-Audio-Wiedergabe ausstehend. |
| 2 Desambiguacion | 95% | Solide. Bug-Klasse verifiziert. |
| 3 Intencion | 85% | Live-Backend-Schema abgedeckt. |
| 4 Llamada | 95% | Jede öffentliche Schreib-API getestet. |
| 5 Resultado | 70% | Größtenteils Unit-Ebene. Playwright ausstehend. |
| 6 Ack | 95% | Kern-Familien abgedeckt; Long-Tail mechanisch. |
| Interop | 100% | Vollständige v2.3-Preview-Oberfläche. |
| **Gewichteter Durchschnitt** | **~90%** | |

## Was sich im Runtime dadurch geändert hat

Die Tests haben zwei echte Probleme aufgedeckt, die im selben
Branch behoben wurden:

1. **`tab_by_label`-Matcher zu tolerant bei 1-Zeichen-Labels.**
   Behoben in `js/nac.js` Zeile 2264 durch Anforderung von
   `cand.length >= 3` für bidirektionalen Teilabgleich. Exakte
   Gleichheit ist immer erlaubt. Entdeckt durch Stufe-2-Test B4
   (unbekanntes Label wurde durchgelassen).

2. **`NAC.list_registered_plugins()`-Introspektions-Helper
   fehlte.** In `js/nac.js` für die `export_tree`-Funktion der
   Interop-Schicht hinzugefügt, um registrierte Manifeste
   unabhängig vom DOM-Mount-Status zu iterieren. Entdeckt beim
   Schreiben der v23-Interop-Suite.

Beide sind wertvoll -- die Tests haben echte Bugs aus dem
Runtime gezogen, was der eigentliche Zweck ist.

## Was noch vor dem Merge in main erledigt werden muss

| Aufgabe | Priorität | Aufwand |
|---------|-----------|---------|
| Playwright e2e auf den 6 Live-Demos | hoch | 1h |
| Playwright auf React + Angular Study Cases (Dev-Server) | hoch | 30min |
| TTS-Corpus-Generierung (Google Cloud, 30 Prompts) | mittel | 20min |
| STT mock + Corpus-Injektionstest | mittel | 30min |
| `drag_drop`-Unit-Test | niedrig | 10min |
| Long-Tail-Ack-Familien-Tests (breadcrumb, accordion, step usw.) | niedrig | 30min |
| Cherry-pick `yujin.app/nac-spec/demos/` + Landing zu main | blockierend | 2min |
| E-Mail-Umstellung auf Pablo | blockierend | 5min |

Geschätzter Restaufwand: **~3h Sumi-Zeit** bis >= 90%
gewichteter Durchschnitt + sauberer Cherry-pick zu main.

## Testlaufzeiten (Laptop, kalt)

| Suite | Zeit |
|-------|------|
| smoke | < 1s |
| v22 | < 1s |
| v23-interop | < 2s |
| stage2 | < 1s |
| stage3 (Live-Backend) | ~60s (15 Prompts x ~4s Durchschnitt + 500ms Pacing) |
| stage4 | ~2s (Modal + dt-Setup) |
| stage6 | < 1s |
| **Gesamt** | **~75s** |

`tools/nac/test-launch.sh` (das Harness) muss um Stufen 2–6 +
Interop erweitert werden; steht noch aus.

## Audit-Trail

| Commit | Inhalt |
|--------|--------|
| `5b06ae3f` | Demos kompiliert + deployed + Stufe 2 |
| `632aa1f6` | Stufen 2+4 + Landing Use Cases |
| (ausstehend) | Stufen 3+6 + dieser Bericht |

---

*Dieses Dokument ist der kanonische Coverage-Nachweis für den
v2.3-Interop-Branch + den v2.2-Runtime-Stand vom 2026-05-11
00:50 UTC-3. Aktualisierungen folgen mit dem Ausliefern neuer
Suites.*

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/COVERAGE_REPORT_2026_05_10.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
