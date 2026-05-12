---
translation_source: docs/NAC_INTEROP_MCP.md
translation_source_hash: 559b9c7f1d01da4f76e35b6e4f1fcb558f8f0bbca87f7cb4148738989b83b49c
translation_quality: machine_v1
translation_lang: fr
translation_date: 2026-05-11T13:49:51.384228+00:00
---

# NAC3 -- interopérabilité multi-app via MCP

**Statut :** aperçu v2.3 (branche `feat/nac-interop-mcp`, pas encore
fusionnée sur main).
**Section de spec :** à insérer en tant que section 11 de SPEC.md lorsque
la fonctionnalité sortira de l'aperçu.

## Pourquoi

NAC3 v1.9 + v2.0 + v2.1 + v2.2 standardisent la façon dont *une* interface
web est pilotée par un agent IA. v2.3 étend le contrat à l'interopérabilité
entre *plusieurs* applications NAC3.

Le cas d'usage motivant :

> Pablo est dans Yujin CRM et dicte dans le chat. Il dit :
> *« Yujin, passe sur Excel. »*
>
> Le client de chat de Yujin reconnaît cela comme une intention d'interop.
> Il appelle l'outil MCP `nac.export_tree` sur l'instance Excel ouverte par
> l'utilisateur, récupère l'arbre NAC3 complet d'Excel (classeur actif,
> feuille courante, plages nommées, boutons du ruban), et l'enregistre
> comme plugin distant sous `remote:excel:*`.
>
> Pablo peut maintenant dire *« mets la cellule A1 à 100 »* et
> l'intermédiaire de Yujin résout `remote:excel:cell.A1` ->
> `NAC.fill('remote:excel:cell.A1', 100)`. Le runtime détecte le préfixe
> `remote:` et proxifie la distribution via MCP. Excel effectue l'effet de
> bord, émet son acquittement `nac:field:changed`, le flux SSE le renvoie
> au runtime de Yujin, la promesse locale se résout. Pablo voit dans le
> chat de Yujin : *« Cellule A1 définie à 100. »*
>
> Point crucial : **l'agent n'avait pas besoin de connaître le schéma
> d'Excel à l'avance**. L'appel export_tree lui a fourni le manifeste au
> moment où il en avait besoin.

C'est le fondement du **catalogue commercial de produits attachables**
annoncé par Yujin lors du lancement de v2.3. Toute application tierce
livrant un serveur MCP exposant les quatre outils d'interop ci-dessous
devient disponible comme cible de navigation depuis n'importe quel hôte
NAC3.

## Architecture

```
+----------------+         +-----------------+         +----------------+
|  Yujin (host)  |  call   |   MCP bridge    |  HTTP   |  Excel (peer)  |
|   nac.export   | ------> | (agent process) | ------> |   nac.export   |
|   nac.import   | <------ |                 | <------ |   nac.invoke   |
+----------------+         +-----------------+         +----------------+
         ^                                                      |
         |     ack events (SSE: nac:*:succeeded / :failed)     |
         +------------------------------------------------------+
```

Trois acteurs :

1. **Hôte** -- l'application que l'utilisateur pilote actuellement (Yujin
   dans l'exemple).
2. **Pair** -- l'application tierce conforme NAC-3 importée (Excel dans
   l'exemple).
3. **Pont MCP** -- généralement le processus agent de l'hôte. Il détient
   les jetons bearer des pairs connus et proxifie les invocations. Le pont
   n'usurpe PAS l'identité de l'utilisateur auprès du pair ; il utilise ses
   propres identifiants.

## Surface d'outils MCP

Tout pair conforme NAC-3 DOIT exposer ces quatre outils à son endpoint MCP :

### `nac.export_tree`

Entrant. Retourne un payload auto-descriptif qu'une autre application peut
importer.

**Entrée :**

```ts
{
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,    // default false (privacy)
  include_locales?: string[],     // default all 10
  bearer: string                  // peer's per-tenant token
}
```

**Sortie :**

```ts
{
  app_id: string,                 // 'yujin-crm', 'excel-online', etc.
  app_version: string,            // semver of the app, NOT of NAC
  nac_version: '2.3',
  exported_at: string,            // ISO8601
  active_plugin: string | null,
  manifests: Record<string, Manifest>,   // by plugin_slug
  scope_tree: ScopeNode[],
  data_tables: DataTableSnap[],   // v2.1 sec 18
  state: {
    url?: string,
    title?: string,
    user_lang: string,
    tenant_id?: string
  },
  ack_endpoint: string            // SSE URL for subscribe_events
}
```

### `nac.invoke`

Entrant. Distribue une action NAC3 sur le pair.

**Entrée :**

```ts
{
  bearer: string,
  nac_id: string,                 // peer-local id, NOT prefixed
  action: {
    kind: 'click' | 'click_by_verb' | 'fill' | 'select'
        | 'tab' | 'tab_by_label' | 'go_to_section'
        | 'dt_add_row' | 'dt_edit_cell' | 'dt_remove_row'
        | 'dt_commit' | 'dt_discard'
        | 'edit_field',
    args: Record<string, unknown>   // shape depends on kind
  },
  hmac?: string                   // optional HMAC-SHA256 of body
                                  // for sensitive verbs
}
```

**Sortie :**

```ts
{
  ok: boolean,
  result?: { row_id?: string, value?: unknown, ... },
  error?: { code: string, message: string }
}
```

Le pair distribue l'action via son `NAC.<kind>(...)` local, attend la
famille d'événements d'acquittement canonique avec un délai de 5s, et
retourne le résultat. L'acquittement est ÉGALEMENT diffusé sur le canal SSE
afin que l'hôte puisse le corréler.

### `nac.subscribe_events`

Streaming (SSE). Pousse les événements d'acquittement du pair vers l'hôte.

**Entrée (query string) :**

```
?bearer=<token>&plugins=<csv-of-plugin-slugs>&since=<iso8601>
```

**Sortie (chaque événement) :**

```
event: nac:action:succeeded
data: {"plugin":"excel","action_id":"excel.cell.A1","is_trusted":false,
       "result":{"value":100},"ts":"2026-05-10T18:30:01.234Z"}

event: nac:tab:activated
data: {"plugin":"excel","tab_id":"tab.sheet2",...}
```

Le runtime de l'hôte relaie ces événements dans son document local, de
sorte qu'un agent appelant `NAC.click('remote:excel:cell.A1')` obtient une
promesse résolue localement, pilotée par l'événement distant.

### `nac.health`

Entrant, simple. Retourne :

```ts
{ ok: true, nac_version: '2.3', app_id: 'excel-online',
  uptime_ms: 12345 }
```

Utilisé par les hôtes pour vérifier qu'un pair est joignable avant
l'import.

## API runtime côté hôte

Ces trois nouvelles fonctions sont disponibles sur `window.NAC` après
l'arrivée de v2.3 :

```ts
NAC.export_tree(opts?: {
  scope?: 'full' | 'active_plugin' | 'plugin_slug:<slug>',
  include_dom_state?: boolean,
  include_locales?: string[]
}): Promise<NACExportV1>
```

Retourne le payload défini ci-dessus. Lecture purement locale, sans I/O.

```ts
NAC.import_remote_tree(
  payload: NACExportV1,
  conn: {
    transport: 'http' | 'stdio',
    endpoint: string,            // URL for http, command for stdio
    bearer: string,
    namespace?: string,          // defaults to payload.app_id
    auto_subscribe?: boolean     // default true
  }
): RemoteHandle
```

Enregistre chaque manifeste de `payload.manifests` sous un slug de plugin
avec espace de noms :

- `payload.manifests.invoice` devient `remote:<namespace>:invoice` dans
  `NAC.describe()`.
- Tous les nac_ids à l'intérieur de ce manifeste sont préfixés par
  `remote:<namespace>:` lors de la résolution par `NAC.click()` /
  `NAC.fill()` / etc.
- Le résolveur d'éléments du runtime vérifie d'abord le préfixe ; s'il
  correspond, il proxifie la distribution via le transport de la connexion
  au lieu d'interroger le DOM.

```ts
NAC.list_remote_apps(): RemoteHandle[]
NAC.disconnect_remote(remote_id: string): void
```

Inspection et nettoyage. La déconnexion ferme le flux SSE et désenregistre
les plugins avec espace de noms.

## Proxification de la distribution

Lorsque `NAC.click(id)` est appelé et que `id` commence par `remote:` :

1. Analyser `remote:<namespace>:<peer_local_id>`.
2. Rechercher `_remotes[namespace]` -- le RemoteHandle stocké à l'import.
3. POST `{ bearer, nac_id: peer_local_id, action: { kind:'click',
   args: {} } }` vers `handle.endpoint + '/nac.invoke'`.
4. Si `ok: true`, résoudre immédiatement la promesse locale (le flux SSE
   distribue également le `nac:action:succeeded` local, de sorte que les
   observateurs sans la promesse sont quand même notifiés).
5. Si `ok: false`, rejeter avec le code d'erreur du pair.

Les autres types d'action (`fill`, `tab`, `tab_by_label`, `dt_*`,
`edit_field`) suivent le même schéma.

## Modèle de sécurité

### Périmètres de confiance

- Le **jeton bearer** authentifie l'hôte auprès du pair. Il est émis par
  la couche d'administration du pair (sa gestion de tenant). Le pont le
  stocke côté serveur ; il n'est jamais exposé dans le prompt de
  l'intermédiaire LLM.
- Le **HMAC** par action est optionnel mais recommandé pour les verbes que
  le pair marque comme sensibles (`delete`, `payment.*`, attributions de
  rôles). Corps du HMAC = `bearer + nac_id + kind + sorted(args)`, haché
  en SHA-256.
- **Liste blanche d'origines** -- le serveur MCP du pair vérifie l'en-tête
  Origin (ou son équivalent dans le transport MCP) par rapport à une liste
  enregistrée. Les hôtes absents de la liste reçoivent un HTTP 403.

### Transmission de is_trusted

Chaque action distribuée via le proxy porte `is_trusted: false` dans le
détail de son événement d'acquittement. Le code hôte du pair PEUT refuser
l'action pour cette raison :

```js
document.addEventListener('nac:action:succeeded', function (e) {
  if (e.detail.action_id === 'invoice.delete' && !e.detail.is_trusted) {
    console.warn('[security] refused synthetic delete via interop');
    e.preventDefault();
  }
});
```

### Rotation des jetons

Les jetons bearer sont renouvelés côté serveur selon le cycle de session
normal du pair (par ex. toutes les 24h). L'hôte détecte un 401 de la part
du pair et récupère un nouveau jeton via le flux d'authentification de
l'utilisateur. Les sessions qui ne peuvent pas se ré-authentifier se
déconnectent proprement.

## Diagramme de séquence (texte)

```
USER         YUJIN HOST              MCP BRIDGE              EXCEL PEER
 |              |                       |                        |
 |- "jump      ->| recognise intent     |                        |
 |   to Excel"  | ack=tts                                        |
 |              |- nac.export_tree --> | --- HTTP --------> | export
 |              |                       |                    | tree
 |              |<-- payload --------- | <-- response ----- |
 |              |  import_remote_tree(payload, conn)              |
 |              |  remote plugins now in NAC.describe()           |
 |              |- subscribe_events --> | --- SSE open ----> |
 |              |<------------------- ack stream live <---- |
 |- "set A1    ->| chat resolve to                                |
 |   to 100"    |  click_by_verb('remote:excel', 'set_cell', ...) |
 |              |- detect remote: prefix                          |
 |              |- proxy invoke -----> | --- HTTP --------> | NAC.fill
 |              |                       |                    | side fx
 |              |                       |                    | emit ack
 |              |<------------------- ack via SSE <-------- |
 |              |  local promise resolves                         |
 |- ack tts <--|  "Cell A1 set to 100"                            |
 |              |                                                  |
```

## Non-objectifs (différés)

- **Interop bidirectionnel où le pair importe également l'hôte.** Le modèle
  v2.3 est une navigation à sens unique hôte -> pair. Les imports croisés
  ajoutent une complexité de réentrance et de détection de cycles ; différé
  à v2.4.
- **Chaînes multi-sauts** (Yujin -> Excel -> Slack). Même raison de
  complexité ; v2.3 est limité à un seul saut.
- **Actions en streaming** (suivi de curseur en direct). Aspirationnel ;
  nécessite un canal de type WebRTC au-delà de ce que SSE peut fournir.

## Budget de performance

- Aller-retour `nac.export_tree` : < 200 ms p95 sur LAN.
- Aller-retour `nac.invoke` (hors temps d'effet de bord côté pair) :
  < 100 ms p95.
- Keepalive `nac.subscribe_events` : heartbeat toutes les 15s.

## Fichiers d'implémentation (cette branche)

| Fichier | Rôle |
|---------|------|
| `yujin.app/nac-spec/js/nac-mcp-interop.js` | Runtime côté hôte : export_tree + import + proxy |
| `agent/mcp_interop.py` | Implémentations des outils serveur MCP pour Yujin en tant que pair |
| `packages/nac/src/interop.ts` | Types TypeScript + utilitaires |
| `yujin.app/nac-spec/example-v22-interop.php` | Démo live : deux mini-apps côte à côte qui s'importent mutuellement |
| `packages/nac/test/v23-interop.mjs` | Tests unitaires pour export + import + proxy |
| `tools/nac/test-launch.sh` | Étendu avec la couche 6 (interop) |

## Questions ouvertes avant la GA de v2.3

- Le payload d'export devrait-il être optionnellement signé avec le secret
  HMAC du pair, afin que l'hôte puisse vérifier l'origine même lorsqu'il
  transite par un pont non fiable ? (Probablement oui ; candidat v2.3.1.)
- Quelle est l'affordance UI canonique pour « application distante
  disponible » dans un chat ? Un emoji ? Une pastille ? Une icône
  par application issue du manifeste ? (Candidat section 14 de la spec.)
- Les `data_tables` d'un pair devraient-elles être modifiables depuis
  l'agent de l'hôte, ou en lecture seule par défaut ? (Tendance lecture
  seule ; opt-in explicite pour l'écriture.)

---

*This is a machine translation of the canonical English
version at `/nac-spec/docs/NAC_INTEROP_MCP.md`. Report translation
issues at the project's GitHub. Native-speaker reviewed:
no (machine_v1).*
