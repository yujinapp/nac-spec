---
translation_source: docs/CASE_STUDIES_DISCOVERY.md
translation_source_hash: 59b940d486104c6a9b42d59c1ee6f16c25eb01c0c08b8b98458c68ef4312ed77
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T14:12:07.835971+00:00
---

# Études de cas -- bugs découverts de manière autonome

Bugs trouvés par le sweep Playwright de diagnostic sur
`yujin.app/nac-spec/demos/react/` et `/demos/angular/`. Pablo
m'a demandé le 2026-05-11 de découvrir + documenter + corriger
sans qu'il nomme les symptômes. Ce fichier retrace le processus
de découverte et les corrections apportées.

---

## Bug #1 (HAUTE PRIORITÉ) -- L'intermédiaire LLM ne voit pas le manifest de l'application

**Démos concernées :** React + Angular.

**Symptôme (observable) :** Quand l'utilisateur tape "hola" dans
le panneau de chat de la démo React ou Angular, le chat répond
avec un message générique "How can I help you with this page?" --
sans savoir qu'il s'agit d'une application de todos. Quand
l'utilisateur dit "agrega tomar agua", le LLM ne peut pas
dispatcher `click_by_verb('todos', 'add_todo')` car il ne sait
pas que ce plugin existe.

**Méthode de découverte.** La spec de diagnostic capture chaque
message `page.console` pendant l'interaction avec le chat. Le
client de chat journalise :

```
[nac-chat] snapshot plugins (1): chat
[nac-chat] backend response: message="Hi! How can I help you with this page?" actions=[]
```

`snapshot plugins (1): chat` est le signe révélateur -- un seul
plugin apparaît dans le snapshot envoyé au LLM, le plugin `chat`.
Le plugin `todos` -- que la démo enregistre via
`NAC.register(TODOS_MANIFEST)` -- est absent.

**Cause racine.** `NAC.describe()` énumère les plugins en
parcourant le DOM à la recherche d'éléments `[data-nac-plugin="..."]`
(ligne ~1557 de `yujin.app/nac-spec/js/nac.js`). Le
`<aside class="chat" data-nac-plugin="chat">` du panneau de chat
possède l'attribut ; la région todos de l'application n'en a PAS.
Le runtime ne voit jamais la région todos comme une portée de
plugin, et donc ni `describe()`, ni `snapshotTree()`, ni le LLM
ne la voient.

L'enregistrement du manifest via `NAC.register(...)` alimente la
map interne `_manifests` mais n'attache PAS automatiquement un
attribut `data-nac-plugin` au DOM. C'est la responsabilité de
l'appelant.

**Correction.** Ajouter `data-nac-plugin="todos"` au conteneur
principal de l'application dans les deux démos :

- React : `<div className="app">` -> `<div className="app" data-nac-plugin="todos">`
- Angular : `<div class="app">` dans le template -> `<div class="app" data-nac-plugin="todos">`

Après la correction, `NAC.describe()` retourne 2 plugins (`todos` +
`chat`), le snapshot transporte les deux manifests, et le LLM peut
dispatcher des actions basées sur les verbes contre `todos.*`.

**Leçon pour le manuel.** Le contrat NAC3 exige LES DEUX :
1. `NAC.register(manifest)` pour déclarer le schéma.
2. `data-nac-plugin="<slug>"` sur une racine DOM pour inscrire le
   plugin dans l'arbre de portée.

Les guides d'adoption et le NAC_TEST_MANUAL doivent le mentionner
explicitement. Une erreur courante des adoptants est d'enregistrer
le manifest en oubliant l'attribut DOM, ce qui produit exactement
le symptôme "LLM aveugle" décrit ci-dessus. Ajouter dans
`stage2-disambiguation.mjs` un test de régression : le snapshot
doit inclure TOUS les plugins enregistrés, sinon signaler un
problème.

---

## Bug #2 (PRIORITÉ MOYENNE) -- Les handlers `onChatAction` de React capturent un état périmé

**Démo concernée :** React uniquement. Les signals Angular et
`update()` rendent cette catégorie de problème inapplicable.

**Symptôme (observable) :** Après déploiement du correctif #1, le
dispatch de verbes piloté par le chat n'ajoute toujours pas de
todos. Envoyer "agrega leche" ne crée aucun nouveau todo. Le LLM
émet correctement la séquence de deux actions (`fill todos.input "leche"`
+ `click_by_verb todos add_todo`), mais le handler `add_todo` voit
`input.trim() === ''` et retourne silencieusement sans appeler
`addTodo()`.

**Méthode de découverte.** Le sweep Playwright de découverte
approfondie (round 2) capture les comptages de lignes avant/après
lors d'un ajout piloté par le chat. Résultats :

```
[WARN] chat.dispatch: [react] chat "agrega leche" did not add a
todo (before=3, after=3). May be LLM hallucination or dispatch
broken.
```

**Cause racine.** Le `useEffect` de `App.tsx` pour l'enregistrement
des handlers de chat a pour dépendances `[input, todos]`. Les
handlers capturent les valeurs d'état React AU MOMENT DE
L'ENREGISTREMENT. Quand le LLM envoie `actions[]` de manière
synchrone, le client de chat dispatche :
1. `fill todos.input "leche"` -> `setInput('leche')` met en file
   d'attente un re-rendu.
2. `click_by_verb todos add_todo` -> s'exécute IMMÉDIATEMENT, dans
   la même tâche JS. React n'a pas encore re-rendu. La fermeture
   du handler a toujours `input === ''`. La garde `input.trim()`
   échoue ; `addTodo()` ne s'exécute jamais.

C'est le problème classique de fermeture sur état périmé en React.

**Correction.** Utiliser un `useRef` qui reflète `input` ; le
handler lit depuis la ref (valeur toujours à jour) plutôt que
depuis la fermeture. Même pattern pour `todos` au cas où de futurs
verbes en auraient besoin.

```ts
const inputRef = useRef(input);
useEffect(() => { inputRef.current = input; }, [input]);

useEffect(() => {
  if (!window.NacChat) return;
  window.NacChat.onAction('click_by_verb', (a) => {
    if (a.plugin === 'todos' && a.verb === 'add_todo') {
      const text = (a as any).args?.text || inputRef.current.trim();
      if (text) {
        addTodoFromText(text);
        return { ok: true };
      }
    }
    ...
  });
}, []); // register once
```

Bonus : accepter également que le LLM passe le texte directement
dans `args.text`, afin que même les applications qui ne font pas
fill-then-click fonctionnent.

**Leçon pour le manuel.** Lors du câblage de verbes NAC3 pilotés
par le chat en React, ne JAMAIS capturer les handlers directement
sur l'état. Utiliser des refs ou le pattern de setter fonctionnel.
Ajouter dans le guide d'adoption React (`guides/REACT.md`) et dans
le manuel de test une section "pièges courants".

---

## Bug #3 (À DÉTERMINER)

En attente du round 3 de diagnostic.

---

## Journal des itérations

| Round | Quand | Erreurs React | Erreurs Angular | Bugs signalés |
|-------|-------|---------------|-----------------|---------------|
| 1 | 2026-05-11 02:10 | 0 au scan de surface | 0 au scan de surface | #1 (couverture manifest) trouvé via analyse de la console |

Les vérifications structurelles de la spec de diagnostic (NAC
monté, validate_global propre, manifests dans le registre, CRUD
todos fonctionnel, bascule du chat fonctionnelle) passent toutes
au vert. Les bugs apparaissent dans des sémantiques plus profondes
comme "le LLM voit-il réellement ce que nous avons enregistré ?".
Les prochains rounds de diagnostic ajouteront : forme des actions
post-réponse-LLM, vérification du déclenchement du dispatch,
vérification de la propagation des mutations `dt_state` à travers
l'état du framework, vérification de la complétion de toutes les
étapes par l'autopilote, vérification du changement de locale
depuis le chat.

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/CASE_STUDIES_DISCOVERY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
