---
translation_source: docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md
translation_source_hash: 1c92bf209ccbc809e9d43062cc65ea0594983593f9e93293ae2912837f639f8d
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T14:25:00.017870+00:00
---

# Analyse des erreurs -- session voix+chat 2026-05-09

> Session de test de Pablo sur `example-v20-full.php` avec voix +
> chat. Ce document isole les défauts observés, les classe
> par cause racine, et propose une correction concrète pour
> chacun. ASCII uniquement.
>
> **STATUS 2026-05-09 (fin de journée) :** les 8 correctifs du
> roadmap sont implémentés (C1..C8). Voir section 7 en fin de
> document avec le récapitulatif des changements + localisation dans le code.

---

## 1. Résumé exécutif

7 catégories de défauts détectées. 4 sont des **bugs reproductibles**
avec cause racine identifiée dans le code ; 2 sont des **limitations
de conception du pipeline voix** qui nécessitent un changement
d'architecture ; 1 est un **bloqueur UX** (le modal bloque le chat).

Sévérité :

| Catégorie | Sévérité | Type | Priorité |
|---|---|---|---|
| C1. Feedback loop TTS -> STT | **CRITICAL** | architecture | immédiate |
| C2. Matcher par sous-chaîne déclenche des commandes | **HIGH** | bug | immédiate |
| C3. Modal de confirmation bloque le chat | **HIGH** | UX | haute |
| C4. v20_panel.X non résolu par chat | **MEDIUM** | bug | moyenne |
| C5. Fragments STT exécutés comme commandes | **MEDIUM** | architecture | moyenne |
| C6. "show" en anglais mal mappé quand v20_panel absent | dérivé de C4 | -- | résolu en fermant C4 |
| C7. "cambia idioma" incohérent | **LOW** | bug | basse |

---

## 2. Journal des commandes (entrée -> sortie -> diagnostic)

| # | Entrée voix / chat | Réponse du bot | Diagnostic |
|---|---|---|---|
| 1 | "apreta describe_v20" | "No encuentro esa accion. Lo mas parecido: Correr el self-test, Ver capacidades, Ver mapa del sistema." | **C4** -- le manifeste v20_panel n'est pas dans l'arbre reçu par le backend. Le bot cherche dans l'arbre qu'il voit et le top-3 correspond aux slugs réellement présents. |
| 2 | "pulsa boton show" | "Mostrando el mapa del sistema." | **C6** = conséquence de C4. Le mot "show" en anglais devrait matcher `v20_panel.toggle` (label EN "Toggle panel"), mais comme ce plugin n'est pas dans l'arbre, le matcher tombe sur `navmap.fetch_map` (label "Show the system map"). |
| 3 | "ve a NAC3 v2.0 layer y pulsa el boton mostrar" | "No veo una capa v2.0 ni un boton 'mostrar'. Lo mas cercano: Ver mapa, Ver capacidades, Listar secciones." | **C4** -- cohérent avec #1. Si le v20_panel est dans l'arbre, le bot trouve `v20_panel.toggle`. Sinon, non. |
| 4 | "cambia a ingles" | "No encuentro un control de idioma en esta pagina..." | **C7** -- incohérent : la commande #16 (identique) a fonctionné. |
| 5 | "pulsa system map" | "Pulsando NAC.system_map()." | OK (succès). Le slug `navmap.fetch_map` est dans l'arbre. |
| 6 | "pulsa capacidades" | "Pulsando NAC.capabilities()." | OK. Slug `navmap.caps`. |
| 7 | "pulsa ver capacidades" | "Pulsando Ver capacidades." | OK. Même slug. |
| 8 | "filtra por ricardo" | "Filtrando la tabla por 'ricardo'." | OK. Tableau avec filtre live. |
| 9 | "pon brasil" | "Pongo Brasil en el campo Pais." | OK. Datalist autocomplete. |
| 10 | "sube volumen a 80" | "Subiendo volumen a 80%." | OK. Slider. |
| 11 | "Porqué no me iluminas mostrándome el monte" | "Te muestro el Monte Fuji." | OK. Phrase longue + indirecte -- le LLM mappe correctement vers l'icône `art.fuji`. |
| 12 | "secretísimo" | "Abriendo el modal secreto." | OK. |
| 13 | "elimina factura" | "Eliminando la factura." | **C3** -- l'action est destructive mais aucune confirmation n'est interposée avant le déclenchement ; le modal apparaît APRÈS mais le chat reste bloqué (voir C3). |
| 14 | "Voz activada" (était du TTS du bot) | "Eliminando la factura." | **C1** -- feedback loop. Le TTS a dit "Voz activada" et le STT l'a capté. "Voz activada" ne devrait matcher aucune commande, mais via C2 "activada" s'associe à une commande d'élimination présente dans le buffer. |
| 15 | "voz activada" (écho) | "Eliminando la factura." | **C1** + **C2** -- le cycle se répète. |
| 16 | "eliminatorias" | "Eliminando la factura." | **C2** -- le matcher opère par sous-chaîne : le préfixe "elimin" matche "eliminar". Tout mot commençant par "elimina" déclenche l'action. |
| 17 | "Muéstrame factura" | "Previsualizando la factura." | OK. |
| 18 | "Manos libres activado..." (TTS) -> "manos libres activado" (STT) | "Modo manos libres confirmado." | **C1** -- même boucle. |
| 19 | "modo manos libres confirmado Dime cuáles son tus capacidades" | "Mostrando las capacidades del sistema." | L'entrée est la réponse du bot collée à la commande de l'utilisateur. Succès car "capacidades" matche fortement. **C5** partiel. |
| 20 | "del sistema" | "Mostrando el mapa del sistema." | **C5** -- fragment de l'entrée précédente traité comme commande indépendante. |
| 21 | "corre el test" | "Corriendo el self-test de NAC." | OK. |
| 22 | "de nac" | "Corriendo el self-test de NAC." | **C5** -- fragment. |
| 23 | "cambia a inglés" | "Switching to English mode for upcoming replies." | OK. **MAIS** incohérent avec #4 (même entrée, réponse différente). |
| 24 | "cambia el idioma de la página a chino" | "No encuentro un control de idioma en esta página..." | **C7** -- le LLM ne reconnaît pas cette méta-commande comme un changement de langue de session, il la cherche comme un contrôle dans l'arbre. |

---

## 3. Cause racine par catégorie

### C1 -- Feedback loop TTS -> STT (CRITICAL)

**Mécanisme :** le `SpeechSynthesisUtterance` reproduit la
réponse du bot par les haut-parleurs de l'utilisateur. Le
`SpeechRecognition` est actif simultanément (mode mains
libres). Le microphone capte la voix des haut-parleurs, le STT
la transcrit comme entrée utilisateur, le chat la traite, le
bot reparle : cycle infini.

Toute réponse du bot contenant un mot proche d'une commande
(éliminer, afficher, ouvrir, changer) peut déclencher une
autre action. Si le mot est destructif, **cela produit un
dommage réel**.

**Preuves dans le log :**
- "Voz activada" (TTS) -> capté comme entrée -> matché
  contre "elimina" du buffer précédent -> supprime la facture.
- "Manos libres activado. Te escucho de continuo." (TTS) ->
  capté comme "manos libres activado" -> bot répond "Modo
  manos libres confirmado".
- "Modo manos libres confirmado" (TTS) -> capté et collé à
  l'entrée suivante.

**Solutions (par ordre de robustesse) :**

1. **Half-duplex obligatoire** (la correction standard de
   l'industrie) :
   - `recognition.stop()` quand `speechSynthesis.speaking
     === true`.
   - `recognition.start()` reprend à la fin de l'utterance
     (événement `onend` de l'utterance).
   - Coût : l'utilisateur ne peut pas parler PAR-DESSUS le bot.
     Acceptable dans 99 % des cas ; ajoute une latence perçue
     mais évite la boucle.
2. **Filtre par contenu** (défense en profondeur) :
   - Maintenir un buffer circulaire des N derniers (=10)
     `SpeechSynthesisUtterance.text` prononcés par le bot dans
     les 30 dernières secondes.
   - Quand un transcript STT arrive, le normaliser (lowercase,
     sans diacritiques, trim) et le comparer au buffer. S'il
     correspond à >70 % d'un utterance récent, le rejeter
     silencieusement.
3. **Confirmation obligatoire pour les actions destructives**
   (défense de dernier recours) :
   - Toute action avec `data-nac-a11y-hint="destructive"` ou
     marquée `irreversible` exige un second tour de
     confirmation explicite AVANT le déclenchement. NAC3 v1.9
     définit déjà `confirm_action()` pour cela -- le démo ne
     l'utilise pas dans le chemin destructif.

**Recommandation :** implémenter (1) immédiatement + (3) à
court terme. (2) optionnel pour les environnements où
l'utilisateur souhaite pouvoir interrompre le bot.

---

### C2 -- Matcher par sous-chaîne déclenche des commandes (HIGH)

**Mécanisme :** le résolveur d'intent (dans le backend ou dans
le LLM) effectue un match par sous-chaîne. Le mot
"eliminatorias" contient "elimina" comme préfixe, et "elimina"
est le verbe d'une action enregistrée -> l'action se déclenche.

**Preuves :**
- "eliminatorias" -> "Eliminando la factura."

**Solution :** le matcher doit opérer par **token complet**
(ou par stem), et non par sous-chaîne. Implémentation possible :

- Tokeniser l'entrée par espaces + ponctuation.
- Pour chaque token, comparer aux verbes des actions avec
  normalisation de stem espagnol ("elimina/elimino/
  elimine/eliminar" -> stem `elimin`, "eliminatorias" ->
  stem `eliminatori`). Stems différents -> pas de match.
- Maintenir une liste courte de stems "commande" dans le
  system prompt (~30 verbes) pour borner l'heuristique.

Le module `@nac-spec/test-runner/src/lib/matcher.js` effectue
déjà un matching par token complet (`indexOf` sur la phrase
entière, pas par sous-chaîne du slug). Le bug se trouve dans
le backend intermédiaire, pas dans le matcher récent.

**Action concrète :** auditer le system prompt
(`yjNacDemoSystemPrompt` dans `crm_desa/api/v1/yujin.php`) et
ajouter une règle explicite : "les verbes comme `eliminar`,
`borrar`, `cancelar` ne matchent que si le token complet de
l'entrée correspond au verbe conjugué, PAS s'il est préfixe
d'un autre mot."

---

### C3 -- Modal de confirmation bloque le chat (HIGH)

**Mécanisme (signalé par Pablo) :** quand le bot déclenche une
action destructive, un modal apparaît avec les boutons
"Aprobar" / "Cancelar". Le modal utilise `<dialog>` avec focus
trap ou un overlay avec `inert` sur le reste du DOM,
y compris le chat. Le chat devient inaccessible : impossible
d'écrire, de dicter par voix, ou de confirmer par la
conversation.

**Conséquence :** l'utilisateur doit approuver/annuler
manuellement par clic. En mode mains libres, cela rompt le
contrat "opérable par la voix".

**Solution :**

1. Le modal de confirmation doit être **hors du focus trap**
   du chat -- ou équivalemment, le chat doit être **hors du
   trap** du modal. Pratique : déplacer le chat en
   `position: fixed` avec un `z-index` supérieur au modal et
   `inert={false}` quand le modal s'ouvre.
2. Le modal doit déclarer ses boutons avec `data-nac-id`
   (ex. `confirm.approve`, `confirm.cancel`) et les intégrer
   à l'arbre NAC. Le chatbot peut alors dispatcher "approuver"
   ou "annuler" par voix contre le slug correspondant.
3. Le TTS doit lire la question du modal automatiquement
   ("Confirmez-vous la suppression de la facture ? Dites 'oui'
   ou 'non'.") et le STT doit interpréter la réponse
   directement comme confirm/reject.

**Action concrète :** auditer le composant modal-confirm dans
`example-v20-full.php` (s'il existe) ou le hook générique de
`confirm_action()` dans `js/nac.js` pour garantir que le
modal N'enferme PAS le chat dans son arbre de focus.

---

### C4 -- v20_panel.X non résolu par chat (MEDIUM)

**Mécanisme :** le JS de la page appelle
`nacDemoSnapshotTree()` avant chaque tour de chat pour
sérialiser l'arbre NAC. Cette fonction appelle
`NAC.describe()` (v1, pas `describe_v2()`). `NAC.describe()`
n'inclut QUE les plugins déjà enregistrés via `NAC.register()`.

Le v20_panel s'enregistre dans `example-v20-full.php` à
l'intérieur du bloc `<script>` en fin de body, dans la
fonction `bootV20()` qui boucle via `setTimeout(bootV20, 50)`
jusqu'à ce que `NAC.scope` existe. Si :
- le navigateur est lent ou le déploiement du rc5 n'est pas
  encore arrivé (le rpaforce-crm vend sa propre copie de
  `nac-v2-extensions.js`), `NAC.scope` n'existe pas et
  bootV20 ne s'exécute pas,
- ou bien bootV20 s'exécute tard, après que l'utilisateur a
  envoyé le premier message au chat,

alors `NAC.describe()` n'inclut pas le v20_panel et le
backend reçoit un arbre sans ces slugs.

**Preuves :**
- "apreta describe_v20" -> le bot ne trouve pas
  `v20_panel.describe_v2`.
- "pulsa system map" -> le bot TROUVE `navmap.fetch_map`
  (car navmap s'enregistre dans le boot de example.js,
  bien plus tôt).

**Solutions :**

1. **Migrer `nacDemoSnapshotTree` vers `describe_v2()`**
   (quand disponible). `describe_v2()` retourne à la fois les
   v1_plugins (compat) et les v2_scope_entries -- garantit que
   les manifests enregistrés via `NAC.register` ET les scopes
   déclarés via `NAC.scope` parviennent au backend.
2. **Bloquer l'envoi du premier message jusqu'à la fin de
   `bootV20()`.** Le `chat-send` reste disabled jusqu'à
   l'émission de `nac:v2_installed`.
3. **Garantir que `NAC.register({plugin_slug:'v20_panel'})`
   s'exécute AVANT tout appel à `chatSend`.** Déplacer ce
   register dans le boot de `example.js` lui-même (ligne ~30
   où se trouvent les autres manifests) plutôt que de le
   différer dans le script inline en fin de page.

**Recommandation :** combiner (1) + (3). (1) est le correctif
structurel ; (3) élimine la condition de course.

---

### C5 -- Fragments STT exécutés comme commandes (MEDIUM)

**Mécanisme :** la Web Speech API délivre des résultats
partiels (`onresult` avec `interim` à true) et des résultats
finaux. Le chat actuel traite chaque résultat final comme un
message indépendant. Quand l'utilisateur marque une pause
entre "el del sistema" et "muéstrame el mapa", le STT peut
émettre deux résultats finaux : "el del sistema" puis
"muéstrame el mapa", et le bot traite les deux.

De plus, la réponse du bot par TTS (problème C1) peut
s'infiltrer et être traitée comme un fragment.

**Preuves :**
- "del sistema" -> exécute "afficher la carte du système"
  comme si c'était une commande complète.
- "de nac" -> exécute "self-test de NAC3".

**Solution :**

1. **Buffer + debounce avec timeout de silence** :
   - Accumuler les résultats finaux dans un buffer.
   - N'envoyer au backend qu'après 800-1500 ms de silence
     depuis le dernier résultat, OU quand l'utilisateur
     appuie sur "send".
   - Cela regroupe les fragments contigus en une seule
     question.
2. **Filtre de longueur minimale** : ignorer les transcripts
   de moins de 4 caractères significatifs sauf s'ils matchent
   un verbe + objet (regex de phrase courte valide).
3. **Filtre contre C1** : si le transcript matche (>70 %) les
   N derniers utterances du bot, le rejeter.

**Recommandation :** (1) + (3). Standard dans les applications
vocales modernes (Alexa, Google Assistant, Siri).

---

### C6 -- "show" mal mappé quand v20_panel est absent (DÉRIVÉ)

Résolu en fermant C4. Quand le v20_panel est dans l'arbre,
son `label_i18n.en="Toggle panel"` (ou celui retenu) remporte
le match contre "show". Aujourd'hui il n'est pas dans l'arbre
-> le matcher tombe sur `navmap.fetch_map` (label "Show the
system map") car son mot-clé "show" fait un prefix match.

En complément : le label EN du `v20_panel.toggle` devrait
inclure "show / hide" comme synonymes, pas seulement "Toggle
panel". Mettre à jour le manifest :

```js
{ id: 'v20_panel.toggle', role: 'button',
  label_i18n: {
    es: 'Mostrar / ocultar panel',
    en: 'Show or hide panel',  /* avant : 'Toggle panel' */
    ...
  }
}
```

---

### C7 -- "cambia idioma" incohérent (LOW)

**Mécanisme :** le LLM dispose de deux chemins non
déterministes :
- Chemin littéral : chercher un contrôle de langue dans
  l'arbre visible (inexistant -> rejet avec top-3 candidats).
- Chemin méta : reconnaître "cambia a inglés" comme
  méta-commande de session et émettre
  `{kind:'say', text:'Switching to English mode...'}` en
  changeant `currentLang`.

Le chemin emprunté dépend de l'échantillonnage du LLM
(température 0,5-0,7 dans le system prompt actuel).
Résultat : incohérent.

**Solution :** **règle explicite dans le system prompt** :

> "Quand l'utilisateur demande à changer la langue de la
> session (ex. 'cambia a inglés', 'switch to French', 'idioma
> chino'), TOUJOURS répondre avec `{kind:'change_locale',
> locale:'<2-letter>'}` -- NE PAS chercher un contrôle de
> langue dans l'arbre. C'est une méta-commande qui affecte la
> session, pas un clic sur la page."

Et ajouter le kind `change_locale` au vocabulaire accepté du
backend (aux côtés de click / fill / say / etc).

Coût : 1 ligne dans le system prompt + 1 branche dans le
handler backend.

---

## 4. Roadmap de corrections (par ordre d'impact / coût)

| # | Correction | Catégorie | Coût | Impact |
|---|---|---|---|---|
| 1 | TTS/STT half-duplex (micro coupé pendant que le bot parle) | C1 | faible | critique |
| 2 | Confirmer les actions destructives avec `confirm_action()` | C1, C3 | moyen | critique |
| 3 | Modal de confirmation hors du focus trap du chat | C3 | moyen | élevé |
| 4 | Tokenizer par mot complet dans le matcher | C2 | faible | élevé |
| 5 | Migrer `nacDemoSnapshotTree` vers `describe_v2()` | C4 | faible | moyen |
| 6 | Déplacer `NAC.register('v20_panel')` au démarrage anticipé | C4 | trivial | moyen |
| 7 | Buffer + debounce 800-1500ms pour le STT | C5 | faible | moyen |
| 8 | Règle `change_locale` dans le system prompt | C7 | trivial | faible |
| 9 | Synonymes dans `label_i18n` du v20_panel.toggle | C6 | trivial | faible |

Coûts :
- **trivial** : 1 ligne de code + 1 commit.
- **faible** : <30 lignes, 1-2 heures.
- **moyen** : 30-150 lignes, une demi-journée.

---

## 5. Points positifs (ce qui a bien fonctionné)

Documenter également ce qui a bien marché pour ne pas le casser :

- « Porqué no me iluminas mostrándome el monte » -> le LLM mappe
  correctement vers l'icône `art.fuji`. **Résolution d'intent indirect +
  métaphorique** -- c'est exactement ce que nous demandions en sec 16.
- « secretísimo » -> ouvre le modal secret. **Familiarisme
  résolu**.
- « Muéstrame factura » -> prévisualise. **Conjugaison + objet
  différencié de la commande destructive « elimina factura »**.
- « filtra por ricardo » -> filtre en direct. **Action + paramètre
  séparés correctement**.
- « pon brasil » -> Brésil dans le champ pays. **Mapping d'objet
  déclaratif vers `fill`**.
- « sube volumen a 80 » -> slider à 80 %. **Valeur numérique extraite du
  texte + action sur le slider**.
- « corre el test » -> self-test. **Verbe + objet de l'arbre**.

Ces cas valident que le system prompt rc5 (contrat sec 16)
fonctionne lorsque l'arbre est complet et que le matcher
ne se laisse pas piéger par des sous-chaînes.

---

## 6. Prochaine étape

Implémenter les corrections #1, #4, #6 dans le prochain push (les trois
ont un coût faible ou trivial et couvrent les 3 catégories
critiques). Les corrections #2, #3, #5 peuvent faire l'objet d'une PR
séparée de plus grande envergure. Le reste peut être mis en backlog.

Pablo : dis-moi si tu veux que je commence ces corrections maintenant
ou si tu préfères relire le document d'abord.

---

## 7. STATUS d'implémentation (2026-05-09 final)

Pablo a approuvé l'implémentation de **toutes** les corrections avec la
contrainte de **NE PAS casser la résolution d'intent indirect /
métaphorique / familier** qu'a permise le system prompt rc5
(métaphores du type « porqué no me iluminas mostrándome el monte »
-> Mt. Fuji ; familiarismes du type « secretísimo » -> modal
secret). Cette capacité réside dans le LLM, pas dans le matcher local.
Les corrections laissent le LLM intact et affinent : (a) la capture
de l'input en amont du LLM (C1, C5), (b) les règles que le
prompt transmet au LLM (C2, C7, C8), et (c) le dispatch
en aval (C3, C4).

| # | Catégorie | Correction implémentée | Emplacement |
|---|---|---|---|
| C1 | Feedback loop TTS->STT | Half-duplex (STT coupé pendant `speechSynthesis.speaking`) + buffer circulaire des 8 dernières utterances du bot + filtre de contenu (exact / containment / 70%-token-overlap) dans le handler `recognizer.onresult` | `js/example.js` -- `_ttsRecentBuf`, `_sttIsBotEcho`, `_ttsRememberUtterance` ; recognizer.onresult vérifie `speechSynthesis.speaking` avant de traiter |
| C2 | Matcher sous-chaîne | Règle 11 explicite dans le system prompt : « WORD-LEVEL MATCHING -- 'eliminatorias' NO matches 'eliminar'. Conjugated forms or infinitive only. On near-prefix ambiguity, return `{kind:'say'}` for clarification, NEVER the destructive action. » Le `interpret()` local tokenisait déjà correctement depuis le 2026-05-06. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` règle 11 |
| C3 | Modal confirm bloque le chat | (a) CSS : `.ne-side { z-index: 10001 }` sort le chat de l'overlay (z-index 9999). (b) Listener `nac:confirm:requested` qui annonce le prompt + hint localisé par TTS. (c) `_maybeAnswerPendingConfirm()` routé dans `chatSend` et dans `_sttFlush` mappe OUI/NON en 10 langues vers `<id>.confirm`/`.cancel` directement, avant le LLM. | `css/example.css` `.ne-side` ; `js/example.js` `_findPendingConfirm`, `_maybeAnswerPendingConfirm`, listener `nac:confirm:requested` |
| C4 | v20_panel absent du chat | (a) Manifest extrait dans `window.__V20_PANEL_MANIFEST__` et enregistré via `registerV20PanelManifest()` avec polling à 30ms dès que `NAC.register` existe (avant `bootV20`). (b) `nacDemoSnapshotTree` inclut désormais aussi `v2_scope_entries`, `v2_intermediate_scopes`, `sitemap`, `tenant_prefix`, `nac_version_v2` quand `NAC.describe_v2` existe. | `example-v20-full.php` (bloc d'enregistrement anticipé) ; `js/example.js` `nacDemoSnapshotTree` étendu |
| C5 | Fragments STT traités comme commandes | Buffer `_sttBuffer` + `setTimeout(_sttFlush, 1100)`. Chaque résultat STT `final` réarme le timer ; ce n'est qu'après 1100ms de silence que le buffer est envoyé au backend. Vidage du buffer sur le chemin manuel (chatSend / arrêt micro). | `js/example.js` `recognizer.onresult` + `_sttFlush` |
| C6 | « show » mal mappé | Résolu en fermant C4 (v20_panel désormais visible dans l'arbre). En complément : `label_i18n.en` du v20_panel.toggle mis à jour de « Toggle panel » vers « Show or hide v2.0 panel » + 9 nouvelles locales complètes. | `example-v20-full.php` `__V20_PANEL_MANIFEST__` |
| C7 | « cambia idioma » incohérent | (a) Nouveau kind `change_locale` dans le catalogue du system prompt. (b) Règle 13 : « SESSION META-COMMANDS use change_locale -- do NOT search the tree for a 'language control'. » (c) Handler dans `dispatchAgenticAction` qui appelle `applyLangChange(a.locale)`. | `crm_desa/api/v1/yujin.php` (nouveau kind + règle 13) ; `js/example.js` `dispatchAgenticAction` case `change_locale` |
| C8 | Verbe incorrect dans le plugin (warning console « No action with verb=fetch_map found in plugin selftest ») | Règle 12 explicite : « PLUGIN-VERB BINDING is fixed by the manifest. Do NOT guess, do NOT carry the verb to a nearby plugin, do NOT invent a plugin name. » Avec exemples WRONG ↔ RIGHT. | `crm_desa/api/v1/yujin.php` `yjNacDemoSystemPrompt` règle 12 |

### Ce que je n'ai pas touché (intentionnel)

- **System prompt principal (contrat sec 16) :** intact. Seules
  les règles 11, 12, 13 ont été ajoutées à titre d'affinement ; les
  absolues A-F et les règles 1-10 n'ont pas changé.
- **Matcher local `interpret()` :** tokenise déjà par mot complet
  depuis le 2026-05-06. Aucun risque de ce côté.
- **Boîte de dialogue de confirmation (`NAC.confirm_dialog` dans `nac.js`) :** intacte ;
  elle émettait déjà `nac:confirm:requested` et les boutons avaient déjà
  `data-nac-id`. Je l'écoute simplement maintenant.

### Risque résiduel / prochaines étapes

- **C1 niveau 3 (`confirm_action()` pour les actions destructives) :** toujours
  en attente. Aujourd'hui, « elimina factura » déclenche l'action + le
  modal apparaît. Si le LLM venait à se tromper à nouveau malgré la
  règle 11, le fallback devrait être que TOUTE action déclarée
  destructive (`data-nac-a11y-hint=destructive`) PASSE d'abord
  par `confirm_dialog`. Je laisse cela en suivi : cela implique
  d'inspecter manifest.actions[].destructive et, si c'est le cas,
  d'envelopper l'invocation avec `confirm_action()` dans la couche dispatch.
- **Debounce STT (C5) :** les 1100ms sont une valeur empirique.
  Si l'on observe que « le bot tarde à répondre aux commandes courtes »,
  descendre à 800ms et observer.
- **Filtre feedback TTS (C1) -- niveau agressif :** le seuil
  de 70% token-overlap peut bloquer des commandes légitimes de
  l'utilisateur qui coïncident avec des phrases courantes du bot (ex. :
  « muestra capacidades » si le bot vient de dire « estas son
  las capacidades »). Télémétrie future : compter combien de drops
  sont loggés par `[stt] dropping bot-echo` -- si cela dépasse N par session,
  abaisser le seuil à 80 %.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/VOICE_CHAT_ERROR_ANALYSIS_2026_05_09.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
