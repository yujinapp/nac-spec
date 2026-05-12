---
translation_source: guides/RPA_UIPATH.md
translation_source_hash: 2dd66d68221f687237ac663fa2a360077a51b7cdf8ad74c16488a5934ee7927d
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:46:45.277527+00:00
---

# Guide d'intégration NAC3 + UiPath

**Version NAC3 :** 2.2 (avec aperçu d'interopérabilité v2.3)
**Statut :** Stable. Testé avec UiPath Studio 23.10 + Web Automation v23.10.

L'automatisation web d'UiPath repose aujourd'hui sur l'extraction du DOM via des sélecteurs CSS, le ciblage visuel ou des coordonnées codées en dur. Avec NAC3, chaque widget cliquable de votre application expose un `data-nac-id` stable ; UiPath adresse les éléments par cet identifiant et résiste sans effort aux refactorisations de l'interface.

## Pourquoi NAC3 + UiPath

| Problème actuel | Solution NAC3 |
|-----------------|---------------|
| Les sélecteurs cassent dès que le CSS change | `data-nac-id` est stable à travers les refactorisations visuelles |
| Le ciblage par ancre ou coordonnées échoue si un bouton se déplace | Idem |
| Fragilité multi-tenant (identifiants différents selon le client) | Le manifeste déclare le verbe ; le bot appelle par verbe |
| Attendre que « l'élément soit prêt » est fragile | L'événement `nac:action:succeeded` est déterministe |
| Les interfaces multilingues nécessitent une automatisation par locale | `label_i18n` est indépendant de la locale ; le bot utilise des ids, pas des libellés |

## Deux approches d'intégration

### Approche A -- Activité navigateur + injection JS (recommandée)

L'activité `Inject JavaScript` d'UiPath exécute `window.NAC.click(...)` directement. Pas de sélecteurs, pas de fragilité.

```vb
' UiPath sequence pseudocode
Open Browser https://your-app.example.com/
Inject JS: window.NAC.click('invoice.save')
Wait for Event: nac:action:succeeded
```

Mise en œuvre :

1. **Activité navigateur** -- flux UiPath standard.
2. **Activité Inject JavaScript** -- charge utile :
   ```js
   return await (async () => {
     const result = await window.NAC.click('@id@');
     return JSON.stringify(result);
   })();
   ```
3. **Assign** -- affectez la chaîne retournée à une variable. Analysez-la pour vérifier `{ok: true}`.

Pour la distribution par verbe :

```js
await window.NAC.click_by_verb('@plugin@', '@verb@')
```

Pour le remplissage :

```js
await window.NAC.fill('@id@', '@value@')
```

### Approche B -- Basée sur les sélecteurs avec xpath compatible NAC

Si votre profil UiPath préfère les sélecteurs, utilisez directement l'attribut `data-nac-id` :

```xml
<webctrl tag='button' attr='data-nac-id' value='invoice.save' />
```

Même logique, mais consomme le DOM du navigateur via l'explorateur d'arborescence d'UiPath. Légèrement moins robuste (dépend du timing de l'arborescence), mais conserve l'idiome UiPath.

## Exemple de workflow UiPath

`Examples_NAC_Invoice.xaml` (à télécharger depuis le marketplace Yujin une fois publié) :

1. **Open Browser** -- ciblez l'onglet vers votre application conforme NAC-3.
2. **Attendre window.NAC3** -- injectez :
   ```js
   return new Promise(r => {
     const t = setInterval(() => {
       if (window.NAC) { clearInterval(t); r('ready'); }
     }, 100);
   });
   ```
3. **For Each Row** -- itérez sur la table de données source.
4. **Inject JS** -- par ligne :
   ```js
   await window.NAC.click_by_verb('invoice', 'new');
   await window.NAC.fill('invoice.client_name', @row("client")@);
   await window.NAC.fill('invoice.amount', @row("amount")@);
   await window.NAC.click_by_verb('invoice', 'save');
   ```
5. **Attendre** -- nac:action:succeeded avec action_id='invoice.save'.
6. **Continuer** la boucle.

L'ensemble du flux ne comporte que 5 activités, quelle que soit la complexité de l'application sous-jacente. À comparer aux 30 à 50 activités typiques d'un équivalent basé sur des sélecteurs CSS.

## Découverte : lire le manifeste

UiPath peut introspecter le manifeste avant d'automatiser :

```js
return window.NAC.describe();
```

Retourne l'arborescence complète des plugins. Utilisez-la pour construire des organigrammes dynamiques qui s'adaptent aux modifications du manifeste sans redéployer le fichier `.xaml`.

## Provenance (NAC-3)

UiPath envoie des clics synthétiques, donc `event.isTrusted === false` sur l'événement d'acquittement NAC3. Les applications qui conditionnent les verbes sensibles à `is_trusted` (suppression, paiement, administration) **refuseront** par défaut la distribution UiPath.

Pour activer le RPA sur ces verbes, l'application hôte doit explicitement les autoriser :

```js
// In the host app's NAC bootstrap:
window.__NAC_ALLOW_UNTRUSTED__ = ['invoice.save', 'invoice.send'];
```

Discutez du modèle de menace avec le propriétaire de l'application -- contourner `isTrusted` annule la garantie anti-usurpation de la spécification. UiPath s'exécute dans un environnement contrôlé, donc le compromis est généralement acceptable, mais documentez-le.

## Gestion des erreurs

NAC3 lève des erreurs structurées sur lesquelles UiPath peut brancher sa logique :

```js
try {
  await window.NAC.click('invoice.save');
} catch (e) {
  return JSON.stringify({ ok: false, code: e.code, message: e.message });
}
```

| `e.code` | Signification | Branche UiPath |
|----------|---------------|----------------|
| `not_found` | L'id n'existe pas dans le DOM actuel | Redécouvrir via `NAC.describe()` |
| `invalid` | Forme de l'argument incorrecte | Bogue dans la logique du bot, escalader |
| `timeout` | L'effet de bord n'a pas acquitté en 5s | Réessayer jusqu'à N fois |

## Matrice de tests

Nous testons l'intégration contre la
[démo de table de données v21](https://yujin.app/nac-spec/example-v21-data-table.php)
via UiPath 23.10 en CI. Le workflow de référence se trouve dans
`tools/rpa/uipath/InvoiceFromCSV.xaml` de ce dépôt (à venir).

## Voir aussi

- [SPEC.md sec 5](../SPEC.md#5-public-api) -- surface complète de NAC.*.
- [SECURITY.md](../SECURITY.md) -- modèle de menace isTrusted.
- [LLM_WIRING.md](LLM_WIRING.md) -- si votre flux RPA nécessite également une entrée vocale ou par chat, branchez l'intermédiaire LLM en amont.
- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- comment Yujin teste ce contrat de bout en bout.

## Licence

Apache-2.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/guides/RPA_UIPATH.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
