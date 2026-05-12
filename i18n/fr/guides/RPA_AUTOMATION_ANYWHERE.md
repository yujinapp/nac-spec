---
translation_source: guides/RPA_AUTOMATION_ANYWHERE.md
translation_source_hash: 165e60e4b3922f8353a3f038d815452ebf9ba7d597cb68f8c313eb47cb416eab
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:46:57.549080+00:00
---

# Guide d'intégration NAC3 + Automation Anywhere

**Version NAC3 :** 2.2 (avec aperçu d'interopérabilité v2.3)
**Testé avec :** Automation Anywhere A2019 + A360.

## Deux approches — choisissez selon votre édition AA

### Approche A — A360 + Web Recorder + Run JavaScript

L'action `Run JavaScript Function` d'AA injecte du code dans l'onglet de navigateur actif.

```js
// payload variable: NAC_ID = "invoice.save"
async function nacClick(id) {
  await window.NAC.click(id);
  return 'ok';
}
return nacClick($NAC_ID$);
```

Liez les variables d'entrée (`$NAC_ID$`, `$VALUE$`) à la conception ; l'action retourne une chaîne sur laquelle le bot effectue des branchements.

### Approche B — A2019 + Object Cloning avec attribut personnalisé

L'`Object Cloning` d'A2019 cible traditionnellement via les propriétés DOM. Configurez le sélecteur de propriété :

```
HTML.Attribute: data-nac-id
Search value: invoice.save
```

Moins robuste que l'approche A (dépend du timing de l'arbre DOM), mais permet aux bots A2019 existants d'adopter NAC3 sans réécrire les flux.

## Modèle de bot canonique en 8 actions

Pour la démo de facturation v21 :

| Étape | Action | Charge utile |
|-------|--------|--------------|
| 1 | Open Browser | https://your-app.example.com/ |
| 2 | Wait | attente de `window.NAC` prêt (interrogation JS) |
| 3 | Loop CSV | lignes |
| 4 | Run JS | `await window.NAC.click_by_verb('invoice','new')` |
| 5 | Run JS | `await window.NAC.fill('invoice.client',$row.client$)` |
| 6 | Run JS | `await window.NAC.fill('invoice.amount',$row.amount$)` |
| 7 | Run JS | `await window.NAC.click_by_verb('invoice','save')` |
| 8 | End Loop | -- |

8 actions quelle que soit la complexité de l'interface. À comparer aux 30 à 60 actions habituelles pour les flux basés sur des sélecteurs CSS.

## Découverte via `NAC.describe()`

```js
return JSON.stringify(window.NAC.describe());
```

Retourne l'arbre du manifeste. AA peut l'analyser avec `JSON Parse` et construire des organigrammes dynamiques.

## Provenance + isTrusted

AA envoie des clics synthétiques. L'application hôte peut refuser les verbes sensibles (suppression, paiement) à moins qu'ils ne soient explicitement mis en liste blanche. Consultez la section « Provenance » de `RPA_UIPATH.md` pour le modèle d'activation côté hôte. Le même principe s'applique à AA.

## Gestion des erreurs

Encapsulez chaque appel JS dans un bloc `try/catch` retournant du JSON :

```js
try {
  await window.NAC.fill('@id@', '@value@');
  return JSON.stringify({ok: true});
} catch (e) {
  return JSON.stringify({ok: false, code: e.code, message: e.message});
}
```

L'action `If` effectue des branchements sur le JSON analysé.

## Licence + voir aussi

Apache-2.0. Consultez [RPA_UIPATH.md](RPA_UIPATH.md) pour un traitement plus approfondi ; les modèles s'appliquent à l'identique.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_AUTOMATION_ANYWHERE.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
