---
translation_source: SECURITY.md
translation_source_hash: 4d9f26e0cc810ed4f1c6cf921c7ae8f5c004d8ba42445a69a2de58106db2b64f
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T12:53:16.314576+00:00
---

# NAC3 -- modèle de sécurité

**Version de la spécification :** 2.2 stable (+ aperçu d'interopérabilité v2.3).

## Modèle de menace

NAC3 s'intercale entre les agents et votre interface. C'est une couche contractuelle, pas une couche d'authentification. Plusieurs frontières de confiance distinctes existent ; ce document les nomme afin que vous puissiez identifier clairement lesquelles NAC3 protège et lesquelles il ne protège pas.

### Frontière A : Utilisateur -> Interface

Hors du périmètre de NAC. Utilisez votre authentification existante (sessions, OAuth, SSO, MFA). Une fois l'utilisateur authentifié, NAC3 considère que toute action qu'il peut effectuer dans l'interface est autorisée.

### Frontière B : Agent contrôlé par l'utilisateur -> Interface

Un utilisateur accorde à un agent la permission de piloter sa session navigateur. Exemples : un assistant vocal, un lecteur d'écran, un client de chat LLM intégré dans la même page. Le rôle de NAC3 ici :

1. Fournir à l'agent des noms d'éléments stables pour qu'il puisse agir sans avoir à scraper des coordonnées.
2. Exposer `event.isTrusted` afin que l'hôte puisse refuser les clics synthétiques pour les verbes sensibles (paiement, suppression, attribution de rôles). L'agent ne peut pas falsifier `isTrusted=true` ; seul un vrai geste utilisateur le définit.
3. Fournir des accusés de réception au niveau des événements afin que l'agent sache ce qui s'est terminé sans relire le DOM.

NAC3 ne protège PAS contre un agent explicitement approuvé par l'utilisateur qui abuserait de cette confiance. Il s'agit d'un problème d'expérience utilisateur (invites de consentement avant les verbes sensibles) géré par votre application, pas par NAC.

### Frontière C : Service externe -> Interface (intermédiaire LLM)

Si la commande vocale d'un utilisateur est envoyée à un LLM distant qui retourne des actions NAC3, le LLM devient un principal de confiance. Le rôle de NAC3 ici :

1. Le LLM ne voit que ce qu'expose `NAC.describe()` (le snapshot de l'arbre + les manifestes enregistrés). Il ne voit pas les jetons d'authentification de l'utilisateur, les cookies, ni les éléments internes du DOM au-delà de ce que le manifeste déclare.
2. Le LLM ne peut pas provoquer directement un clic. Il retourne une action structurée ; le client de chat la valide (l'identifiant `nac_id` existe-t-il ? le verbe est-il autorisé ?) avant de la dispatcher.
3. Le client de chat DEVRAIT rejeter les actions dont le `nac_id` ne figurait pas dans le snapshot qu'il a envoyé (prévient les injections de prompt qui introduisent des identifiants arbitraires en contrebande).

NAC3 ne prescrit PAS le template de prompt du LLM, les limites de débit, ni le filtrage. Consultez `guides/LLM_WIRING.md` pour des recommandations.

### Frontière D : Tenant -> Tenant (déploiements multi-tenant)

Dans un SaaS multi-tenant où les tenants partagent un runtime mais pas les données, NAC3 protège cette frontière avec des manifestes signés par HMAC :

1. Chaque tenant livre son manifeste avec une signature HMAC calculée sur une sérialisation stable, en utilisant un secret par tenant stocké côté serveur.
2. Le runtime, lors de `NAC.register()`, recalcule le HMAC en utilisant le secret attendu pour le tenant actif. En cas de discordance de signature, le manifeste est rejeté.
3. Un tenant malveillant ne peut pas falsifier le manifeste d'un autre tenant sans la clé de signature.

NAC3 n'empêche PAS un tenant d'enregistrer un manifeste excessivement volumineux ou malformé au-delà d'un plafond de taille basique ; limitez le débit des enregistrements de manifestes côté serveur si vous en acceptez des non fiables.

### Frontière E : Script malveillant -> Page

Une page qui inclut du JavaScript contrôlé par un attaquant (XSS, compromission de la chaîne d'approvisionnement) est déjà perdue. NAC3 ne peut rien faire ici ; l'attaquant peut appeler `NAC.click(...)` directement. Atténuez ce risque via CSP, SRI, et votre stack habituelle de sécurité web.

## Signaux de provenance

### `is_trusted` dans les événements de succès

Le détail de chaque événement de succès d'action contient `is_trusted: boolean`. Un hôte peut l'exiger pour les verbes sensibles :

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

La démo de référence `example-v20-full.php` inclut une paire de boutons (`v20_panel.istrusted_real` et `v20_panel.istrusted_fake`) qui illustre la distinction dans la sortie du panneau.

### Signature HMAC des manifestes

Côté serveur, générez la signature :

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

Côté client :

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

Le secret DOIT provenir d'une réponse serveur authentifiée ; ne l'intégrez jamais dans le code source JavaScript. Faites-le tourner par session si le modèle de menace l'exige.

## Signaler une vulnérabilité

Envoyez un e-mail à `nac@yujin.dev` avec :

1. La description de la vulnérabilité.
2. Les étapes de reproduction ou une preuve de concept.
3. La ou les versions de NAC3 concernées.
4. Une suggestion d'atténuation si vous en avez une.

N'ouvrez PAS de ticket public sur GitHub. Nous nous engageons à :

- Accuser réception dans un délai de 3 jours ouvrés.
- Fournir une évaluation de triage dans un délai de 10 jours ouvrés.
- Coordonner le calendrier de divulgation avec le rapporteur.

Les problèmes critiques affectant la spécification publique font l'objet d'une version corrective dans les 30 jours ; les problèmes de moindre gravité dans les 90 jours.

## Ce que NAC3 ne fait explicitement PAS

- Authentifier les utilisateurs.
- Chiffrer les données en transit (utilisez TLS).
- Empêcher l'utilisateur de faire ce qu'il est autorisé à faire.
- Isoler les agents les uns des autres (ils s'exécutent tous dans la même page ; si vous souhaitez une isolation, utilisez des pages séparées).
- Signer les actions individuelles (uniquement les manifestes). La signature par action est envisagée comme candidate pour la v3.0.

---

*This is a machine translation of the canonical English
version at `/nac-spec/SECURITY.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
