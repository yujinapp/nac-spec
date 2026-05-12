---
translation_source: ABOUT.md
translation_source_hash: 4ab5d9a2ad96ee42811299474895d9836adc1ca93ea37726806f190f59646484
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T12:59:30.056964+00:00
---

# Über NAC3

**Spec-Version:** 2.2 stable (+ v2.3 Interop-Vorschau).

**NAC3** = **Native Agent Contract**.

Eine kompakte, öffentliche Spec, die es ermöglicht, Web-UIs durch KI-Agenten, Voice-Runner und Barrierefreiheits-Tools so zu steuern, wie sie heute von Menschen gesteuert werden: durch Klicken, Tippen und Lesen – aber mit Namen, die Maschinen auflösen können, Events, auf die Maschinen warten können, und einer Herkunftskette, die echte Nutzer von synthetischen Aufrufern unterscheidet.

NAC3 ergänzt ARIA, ersetzt es nicht. So wie ARIA den **Accessibility-Tree** standardisiert hat, damit Screenreader und Switch-Geräte dieselbe UI bedienen können wie ein sehender Nutzer, standardisiert NAC3 den **Agent-Tree**, damit ein Sprachbefehl, ein LLM-Intermediär oder ein RPA-Bot dasselbe tun kann – ohne app-spezifischen Glue-Code.

## Was man schreibt

Eine Handvoll HTML-Attribute (`data-nac-id`, `data-nac-role`,
`data-nac-action`, `data-nac-plugin`) sowie ein optionales JS-Manifest, das die Elemente der Seite und die darauf anwendbaren Verben benennt. Die Runtime löst Namen zu Elementen auf und leitet Aufrufe an sie weiter.

## Was man bekommt

- Eine Seite, die auf `NAC.click('deals.create')` von beliebigen Aufrufern reagiert – einem Voice-Runner, einer Playwright-Spec, einem LLM-Intermediär, einem Tastatur-Makro oder einem Barrierefreiheits-Tool.
- Eine Seite, die eine deterministische Event-Familie ausgibt
  (`nac:action:succeeded`, `nac:tab:activated`, `nac:field:changed`,
  ...), sodass der Aufrufer weiß, wann jeder Schritt abgeschlossen ist.
- Eine Seite, deren Automatisierung auf Element-Identitäten statt auf Koordinaten basiert – sodass ein UI-Redesign die Automatisierung nicht bricht.
- Eine Herkunftsschicht (`isTrusted`, HMAC-signierte Manifeste), die einem nachgelagerten System mitteilt, ob ein Klick von einem echten Nutzer oder von einem Agenten stammt.

## Was NAC3 nicht ist

- Kein UI-Framework. React / Vue / Vanilla / PHP / was auch immer bleibt erhalten. NAC3 ist ein dünner Contract, der über dem bereits gerenderten Output liegt.
- Kein LLM. Das LLM, das „click the save button" zu `NAC.click('deals.save')` auflöst, ist Ihre Aufgabe (oder die Ihres Anbieters); siehe `guides/LLM_WIRING.md` als Referenz.
- Kein Ersatz für Barrierefreiheit. ARIA-Rollen bleiben bestehen. NAC3 fügt eine parallele Schicht hinzu; viele Anwender haben am Ende sowohl `role="button"` als auch `data-nac-role="action"` auf demselben Element.

## Status

- **v1.9** – stabil. 27 Widgets, 9 Event-Familien, HMAC + isTrusted, i18n Strict Mode, Validator. Produktionsreferenz: `example.php`.
- **v2.0** – liefert eine Brownfield-Migrationsstory (bestehende Seiten werden über ~80 Zeilen Setup NAC-gesteuert). Referenz: `example-v20-full.php`.
- **v2.1** – fügt das Data-Table-Primitiv hinzu (`collection`,
  `matrix`, `matrix-singletree` Subkinds; `dt_add_row`, `dt_edit_cell`,
  Aggregate, transaktionales Commit). Referenz:
  `example-v21-data-table.php`.
- **v2.2** – VERÖFFENTLICHT 2026-05-10. `NAC.register` ist jetzt ein strikter Validator (`manifest_role_unknown`, `tab_id_manifest_role_drift`,
  `manifest_dom_role_mismatch`). Neuer Helfer `NAC.bindAction(el, handler,
  ctx)` verankert den `nac:action:succeeded`-Contract in der Runtime. Neues Flag `NAC.STRICT_VALIDATION` schaltet Befunde zwischen nur-Warnung (Standard in 2.2) und Ausnahme-Werfen (Standard in 2.3) um. **Das ist der aktuelle Stand von `npm install @nac3/runtime`.**
  Siehe `docs/NAC_V22_ROADMAP.md` für das vollständige Changelog.
- **v2.3** – in Planung. `STRICT_VALIDATION`-Standard wechselt zu `true`. `NAC.bindTab(el, handler, ctx)` als Pendant für Tab-Widgets. Optionales Opt-in: Streaming-Chat-Dispatch.

## Einstieg

- Demos unter `yujin.app/nac-spec/` ausführen (jeder Browser, jedes Gerät).
- `SPEC.md` für den vollständigen Contract lesen.
- `guides/REACT.md` lesen, wenn Sie von React aus einsteigen.
- `guides/LLM_WIRING.md` lesen, wenn Sie einen eigenen LLM-Intermediär einbinden.
- `SECURITY.md` lesen, bevor Sie NAC3 in einem Mandanten-Kontext einsetzen.

## Governance

NAC3 wird derzeit von Yujin betreut. Die Spec steht unter Apache 2.0; die Referenz-Runtime unter MIT. Yujin verpflichtet sich, NAC3 in eine neutrale Stiftung (W3C Community Group, Linux Foundation oder vergleichbarer Industrieverband) zu überführen, sobald die Verbreitung eine neutrale Governance rechtfertigt. Bis dahin folgen Spec-Änderungen dem RFC-Prozess in `CONTRIBUTING.md` mit einer öffentlichen Kommentarfrist von mindestens 14 Tagen für jede Änderung an der öffentlichen API oder dem Wire-Format.

Die Apache-2.0- und MIT-Lizenzierung stellt sicher, dass Spec und Runtime jede Änderung im Unternehmensstatus von Yujin überdauern. Anwender können beides forken, betreiben und ausliefern – heute und nachdem Yujin nicht mehr existiert.

## Autorenschaft

NAC3 wurde von Yujin (yujin.app) verfasst und wird dort gepflegt.
Apache-2.0. Beiträge sind willkommen – siehe `CONTRIBUTING.md`.

---

*This is a machine translation of the canonical English
version at `/nac-spec/ABOUT.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
