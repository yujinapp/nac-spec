---
translation_source: CONTRIBUTING.md
translation_source_hash: 15fa7e8a34cc86e6193de8cd9826a9bd98d4b3ac1c72a43646521d75f88f9a26
translation_quality: machine_v1
translation_lang: de
translation_date: 2026-05-11T12:59:53.526254+00:00
---

# Beitrag zu NAC3

**Spec-Version:** 2.2 stable (+ v2.3 Interop-Vorschau).

## Governance

NAC3 wird derzeit von Yujin betreut. Die Spec steht unter Apache 2.0;
die Referenz-Runtime unter MIT. Yujin verpflichtet sich, NAC3 in eine
neutrale Stiftung (W3C Community Group, Linux Foundation oder
vergleichbar) zu überführen, sobald die Verbreitung eine neutrale
Governance rechtfertigt. Bis dahin folgen Spec-Änderungen dem unten
beschriebenen RFC-Prozess mit mindestens 14 Tagen öffentlicher
Kommentierungsfrist für jede Änderung an der öffentlichen API oder
den Wire-Formaten.

Die Apache-2.0- und MIT-Lizenzierung stellt sicher, dass Spec und
Runtime jede Änderung im Unternehmensstatus von Yujin überdauern.
Forks sind unter beiden Lizenzen ausdrücklich willkommen.

---

Danke, dass du einen Beitrag in Betracht ziehst. NAC3 ist eine
öffentliche Spec plus eine Referenzimplementierung; beide nehmen
Beiträge entgegen.

## Drei Arten von Beiträgen

### 1. Spec-Änderung (RFC erforderlich)

Änderungen an `SPEC.md`, `ABOUT.md` oder `docs/NAC_V*_ROADMAP.md`
sind Spec-Änderungen. Vor dem Öffnen eines PR:

1. Öffne ein GitHub-Issue mit dem Titel `RFC: <einzeilige Zusammenfassung>`.
2. Beschreibe die Problemklasse (welchen Fehler oder welche
   Einschränkung es behebt, idealerweise mit einer konkreten
   Reproduktion).
3. Beschreibe die vorgeschlagene Vertragsänderung.
4. Beschreibe den Migrationspfad für bestehende Nutzer.
5. Warte auf mindestens eine Antwort eines Maintainers auf das Issue,
   bevor du den PR öffnest.

Spec-PRs ohne zugehöriges RFC-Issue werden mit einem Verweis auf
diesen Abschnitt geschlossen.

### 2. Referenz-Runtime-Änderung

Änderungen an `js/nac.js`, `js/nac-v2-extensions.js` oder
`js/nac-chat-client.js`. PRs sind ohne RFC willkommen, wenn:

- Die Änderung ein Bugfix ist, der die Runtime mit der aktuellen
  Spec in Einklang bringt.
- Die Änderung eine Leistungsverbesserung ohne Verhaltensänderung
  ist.
- Die Änderung Dokumentation, Typen oder Testabdeckung betrifft.

PRs, die das Laufzeitverhalten so ändern, dass der Spec-Vertrag
betroffen ist, MÜSSEN zuerst mit einem Spec-RFC verknüpft werden.

### 3. Demo-, Tooling- oder Dokumentationsverbesserung

Änderungen an `example*.php`, `tools/`, `guides/` oder beliebigem
Nicht-Spec-Markdown. PR direkt einreichen. Änderungen möglichst
klein halten; wir bevorzugen zehn kleine PRs gegenüber einem großen.

## Code-Stil

- Nur ASCII in Quelldateien (das Projekt wird über GoDaddy
  bereitgestellt; PHP 8.3 lehnt Nicht-ASCII auch in Kommentaren ab).
  Verwende `--` für Gedankenstriche, nicht `–`.
- JS: kein Transpiler, kein Bundler, kein Build-Schritt für die
  Runtime-Dateien. Reines ES2018+. Das npm-Paket fügt einen
  ESM/CJS-Wrapper um dieselbe Quelle hinzu.
- PHP: Heredocs einfach halten (nur `{$var}`, keine Ausdrücke).
- Kommentare: das WARUM erklären, nicht das WAS. Der Diff zeigt
  das Was bereits.
- Tests: Jede Verhaltensänderung wird mit einem Test ausgeliefert,
  der vorher fehlschlägt und danach besteht. Vor dem Push
  `make test-launch` im Repository-Wurzelverzeichnis ausführen.

## Commit-Stil

- Betreff unter 70 Zeichen, Imperativ im Präsens.
  „fix(nac): treat tab role drift as register-time error", nicht
  „Fixed tab thing".
- Der Body erklärt das Problem, die Ursache und die Lösung.
  Verwandte Commits per Kurz-SHA referenzieren.
- Co-Author-Trailer für KI-unterstützte Commits ist in Ordnung;
  wir verbergen keine Werkzeuge.

## Review

- Bugfix-PRs: 1 Genehmiger, Merge.
- Runtime-/Spec-PRs: 1 Genehmiger + grünes CI, Merge.
- Spec-Änderungs-PRs: zugehöriges RFC-Issue mit Diskussion +
  1 Genehmiger + grünes CI + 7-tägiges Kommentarfenster nach
  Öffnen des PR.

## Lizenzierung

Mit dem Einreichen eines PR lizenzierst du deinen Beitrag unter
Apache-2.0, passend zum Projekt. Die PR-Vorlage enthält eine
Checkbox; bitte ankreuzen.

## Verhaltenskodex

Sei fachlich korrekt, präzise und freundlich. Sachliche
Meinungsverschiedenheiten sind willkommen; persönliche Angriffe
nicht. Maintainer können Threads schließen oder den Commit-Zugang
bei wiederholten Verstößen entziehen.

## Fragen stellen

- GitHub Discussions für Designfragen, „Sollte ich NAC3 dafür
  verwenden?" und Showcases.
- GitHub Issues für Fehlerberichte.
- `nac@yujin.dev` für Sicherheitsmeldungen (siehe `SECURITY.md`).

---

*This is a machine translation of the canonical English
version at `/nac-spec/CONTRIBUTING.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
