# Runtime audit — pre-2.3.0 publication

**Fecha:** 2026-05-20
**Auditor:** Claude Code (Sumi), per `brief-publicar-2.3.0-stable.md` paso 1
**Archivo:** `js/nac.js` (5867 líneas)
**Versión actual del package:** `2.2.1`

---

## Hallazgo crítico

El runtime contiene código **completo (no "a medias")** para las RFCs V24-04 (snapshot versioning) y partes de V24-05 (authority). Esto contradice la asunción del brief de Claude Opus ("v2.4 no está implementado") y modifica el plan de publicación.

### Evidencia: APIs públicas presentes (esperadas en 2.3)

| API | Línea | Estado |
|---|---|---|
| `syncPlugin` (idempotente) | 589, 2087, 2346, 2516, 3027 | ✅ implementado |
| `data-nac-plugin-id` (instance uniqueness) | 267, 330, 353, 376, 526, 606, 664, 693, etc. | ✅ implementado, gating ENABLED |
| `isActionSafe` | (en el dispatcher) | ✅ implementado |
| `click_by_verb` | (verb dispatcher) | ✅ implementado |
| `register` / `registerDataTable` / `syncDataTable` | (registration paths) | ✅ implementado |

### Evidencia: V24-04 implementado (NO en plan original de 2.3)

| Componente | Línea | Estado |
|---|---|---|
| `_tree_version` (global monotonic) | 481 | ✅ presente, se bumpea por mutation observer |
| `_plugin_versions` Map | 482 | ✅ presente, per-plugin counter |
| `_installMutationObserver()` | 684 → invocado en boot línea 6106 | ✅ activo por default |
| `_armHydrationFallback()` | 961 → invocado en boot línea 6111 | ✅ activo por default (100ms fallback) |
| `markHydrationComplete()` | 956 | ✅ exportado en NAC global |
| `_bumpPluginVersion` / `_bumpTreeVersion` | 571 | ✅ presente |
| `STRICT_VERSIONING` flag | 497, 1001, 6066 | ✅ presente, **default = `false`** |
| `expected_plugin_version` / `expected_tree_version` enforcement | 990-1031 | ✅ enforcement gated por `STRICT_VERSIONING=true` |
| `snapshot_stale` NacError emission | 475, 1031 | ✅ implementado |

### Evidencia empírica del audit live

Snapshot real del runtime ejecutando contra el fixture invoice-app (dump `docs/manifest_dump.json`):

```json
{
  "plugin_version": "v_0",
  "element_state_hash": "6b7cfacffad9ca873d0da15ce1e592aa",
  ...
}
```

**`plugin_version` y `element_state_hash` SE EXPONEN en `describe()` por default.** Cualquier adopter que parsea `NAC.describe()` ve estos campos.

---

## Implicación para 2.3.0 stable

El brief original asumía dos cosas que no se cumplen:

1. ~~"v2.4 features no están implementadas"~~ → **están implementadas**.
2. ~~"borrar restos a medias del runtime"~~ → **no hay restos a medias, hay implementación funcional**.

Tres caminos posibles:

### Opción A — Strip V24-04 del runtime, publicar 2.3.0 limpio

Remover las ~600 líneas (lines 459-1050 aproximadamente, más boot invocations + exports). Publicar runtime sin `plugin_version`, `tree_version`, ni `markHydrationComplete`.

**Pros:** alinea exactamente con el brief original. Cero ambigüedad sobre qué entrega 2.3.0.
**Contras:** destructive, alto riesgo de breakage en suite de tests del runtime, descarta trabajo de las sesiones anteriores (commits `584992b` etc).
**Trabajo:** ~2-4h con tests rotos a reparar.

### Opción B — Publicar como 2.4.0 directamente

El código está, los fields se exponen, justifica el MAJOR bump.

**Pros:** semver-honesto. Refleja lo real.
**Contras:** contradice Pablo+Claude (ambos votaron 2.3). El benchmark NO testeó STRICT_VERSIONING (default false), así que no hay validación N=10 de la enforcement. 2.4 sin benchmark de concurrencia es prematuro.
**Trabajo:** trivial (bump version + ajustar SPEC + CHANGELOG).

### Opción C (recomendada) — Publicar 2.3.0 con V24-04 incluido + documentar honestamente

- `package.json` → 2.3.0 (per el plan original).
- SPEC documenta el set 2.3.0 GA (syncPlugin + plugin-id + idempotency).
- SPEC menciona los fields `plugin_version` / `element_state_hash` como **"present in describe() output, intended for v2.4 GA"** — observable pero sin guarantee.
- `STRICT_VERSIONING` documentado como **opt-in experimental flag**: enforcement off por default, on cuando el host lo activa.
- `markHydrationComplete()` documentado como **opt-in hook**: SSR hosts MAY call it; SPA hosts ignore (auto-fallback 100ms).
- RFC-V24-04 estado: **"Implementation merged in 2.3.0, enforcement opt-in via STRICT_VERSIONING. Targeting GA in v2.4 with concurrency benchmark."**
- CHANGELOG 2.3.0 entrada incluye sección "Experimental" listando los V24-04 fields/methods.

**Pros:** honesto, no destruye trabajo, deja al adopter informado.
**Contras:** el primer adopter que los descubra puede usarlos antes de que tengamos benchmark de concurrencia. Mitigación: documentar como experimental + estable behavior 2.3 sin opt-in.
**Trabajo:** medio — ajustar SPEC + CHANGELOG + RFC index.

---

## Decisión tomada (autónoma, 2026-05-20)

**Opción C.** Razones:
- Pablo dijo "decide tú" autonomy por las próximas 2h.
- Strip de 600 líneas (opción A) es destructivo mid-pipeline + riesgo de quemar la suite del runtime.
- Bump a 2.4 (opción B) contradice voto explícito de Pablo + Claude y rompe la decisión semver.
- Opción C respeta el spíritu del brief (default behavior 2.3 = "decoration + verbs + idempotency, benchmarked") + es honesta sobre lo que el código contiene.

**Lo que NO ejecuto autónomamente:**
- `npm publish` final (necesita credentials + es irreversible).
- `git push --tags origin v2.3.0` (irreversible para usuarios que vean la tag).

Esos dos quedan staged. Pablo firma cuando vuelva con la decisión final entre opción A/B/C ya informada.

---

## Resumen ejecutivo para Pablo

- ✅ APIs de 2.3 (syncPlugin, plugin-id, isActionSafe) están completas y funcionando.
- ⚠️ Código de V24-04 (versioning + hydration) **también** está en el runtime, expuesto en `describe()` por default, con enforcement gated por `STRICT_VERSIONING=false`.
- 🟢 El benchmark de 600 runs corrió contra este código con STRICT_VERSIONING=false. Lo que validó es 2.3 + presencia inerte de V24-04.

Mi voto: opción C. Si preferís A (strip) o B (bump 2.4), avisame y ejecuto.
