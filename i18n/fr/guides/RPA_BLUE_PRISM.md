---
translation_source: guides/RPA_BLUE_PRISM.md
translation_source_hash: 7ab698b35a99ca25e77a07599f1aa733b4ba42eb08d0f3bce785a9b0c7f7e276
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:47:05.419878+00:00
---

# Guide d'intégration NAC3 + Blue Prism

**Version NAC3 :** 2.2 (avec aperçu d'interopérabilité v2.3)
**Testé avec :** Blue Prism 7.1 + Browser Automation v7.1.

L'objet métier `Browser` de Blue Prism expose `Inject JavaScript`
nativement. NAC3 + Blue Prism repose sur un modèle en 5 étapes.

## Flux des étapes

1. **Login Agent** -- standard.
2. **Navigate** -- ouvrir l'application conforme NAC.
3. **JS : attente de window.NAC3** -- interrogation jusqu'à disponibilité.
4. **JS : NAC.click / fill / tab** -- déclenchement canonique.
5. **JS : lecture de describe()** -- introspection du manifeste pour
   l'itération suivante du flux de données.

## Exemple de VBO (Visual Business Object)

```
Object: NAC Driver
Action: Click NAC ID
  Inputs:
    - nacId (Text)
  Code (Inject JavaScript):
    (async () => {
      try {
        await window.NAC.click([nacId]);
        return JSON.stringify({ok:true});
      } catch (e) {
        return JSON.stringify({ok:false, code:e.code, message:e.message});
      }
    })()
  Outputs:
    - resultJson (Text)
```

Actions miroir : `Click By Verb`, `Fill`, `Select`, `Tab`,
`Describe`, `WaitForAck`.

## Modèle d'attente d'acquittement

`NAC.click()` attend déjà `nac:action:succeeded` en interne
(délai d'expiration de 5s). Blue Prism peut ajouter une attente explicite supplémentaire :

```js
return new Promise(resolve => {
  let acked = false;
  document.addEventListener('nac:action:succeeded', function (e) {
    if (e.detail.action_id === '[expectedId]') {
      acked = true;
      resolve('ok');
    }
  }, { once: true });
  setTimeout(() => { if (!acked) resolve('timeout'); }, [timeoutMs]);
});
```

Ce modèle expose la famille d'événements canoniques NAC3 dans les
sorties d'étapes de Blue Prism, ce qui est utile pour brancher le flux de traitement.

## Découverte

Action `Read Manifest` :

```js
return JSON.stringify(window.NAC.describe());
```

À injecter dans une Collection. Le processus peut s'adapter aux
modifications du schéma de manifeste sans recompiler les étapes.

## Licence + voir aussi

Apache-2.0. Voir [RPA_UIPATH.md](RPA_UIPATH.md) pour un traitement plus complet.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_BLUE_PRISM.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
