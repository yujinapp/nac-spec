# NAC3 -- security model

**Spec version:** 2.2 stable (+ v2.3 interop preview).

## Threat model

NAC3 sits between agents and your UI. It is a contract layer, not
an authentication layer. Several distinct trust boundaries exist;
this doc names them so you can think clearly about which ones NAC3
protects and which ones it does not.

### Boundary A: User -> UI

Out of scope for NAC. Use your existing auth (sessions, OAuth,
SSO, MFA). Once a user is authenticated, NAC3 assumes any action
the user could take in the UI is allowed.

### Boundary B: User-controlled agent -> UI

A user grants an agent permission to drive their browser session.
Examples: a voice assistant, a screen reader, an LLM chat client
embedded in the same page. NAC3's job here:

1. Provide the agent with stable element names so it can act
   without scraping coordinates.
2. Surface `event.isTrusted` so the host can refuse synthetic
   clicks for security-sensitive verbs (payment, deletion, role
   grants). The agent cannot forge `isTrusted=true`; only a real
   user gesture sets it.
3. Provide event-level acks so the agent knows what completed
   without re-reading the DOM.

NAC3 does NOT protect against an agent that the user explicitly
trusted misusing that trust. That is a user-experience problem
(consent prompts before sensitive verbs) handled by your app, not
by NAC.

### Boundary C: External service -> UI (LLM intermediary)

If a user's voice prompt is shipped to a remote LLM that returns
NAC3 actions, the LLM becomes a trust principal. NAC3's job here:

1. The LLM only sees what `NAC.describe()` exposes (the tree
   snapshot + the registered manifests). It does not see the
   user's auth tokens, cookies, or DOM internals beyond what the
   manifest declares.
2. The LLM cannot directly cause a click. It returns a structured
   action; the chat client validates it (does the nac_id exist?
   is the verb allowed?) before dispatching.
3. The chat client SHOULD reject actions whose `nac_id` was not
   in the snapshot it sent (prevents prompt injection that
   smuggles in arbitrary ids).

NAC3 does NOT prescribe the LLM's prompt template, rate limits, or
filtering. See `guides/LLM_WIRING.md` for recommendations.

### Boundary D: Tenant -> Tenant (multi-tenant deployments)

Multi-tenant SaaS where tenants share a runtime but not data. NAC3
protects this with HMAC-signed manifests:

1. Each tenant ships its manifest with an HMAC signature computed
   over a stable serialisation, using a per-tenant secret stored
   server-side.
2. The runtime, on `NAC.register()`, recomputes the HMAC using the
   secret it expects for the active tenant. If the signature
   mismatches, the manifest is rejected.
3. A malicious tenant cannot forge another tenant's manifest
   without the signing secret.

NAC3 does NOT prevent a tenant from registering an excessively
large or malformed manifest beyond a basic size cap; rate-limit
manifest registration server-side if you accept untrusted ones.

### Boundary E: Malicious script -> Page

A page that includes attacker-controlled JS (XSS, supply chain
compromise) is already lost. NAC3 cannot help here; the attacker
can call `NAC.click(...)` directly. Mitigate via CSP, SRI, and
your usual web security stack.

## Provenance signals

### `is_trusted` in success events

Every action success event detail carries `is_trusted: boolean`.
A host can require this for sensitive verbs:

```js
document.addEventListener('nac:action:succeeded', function (e) {
  var d = e.detail;
  if (d.action_id === 'invoice.delete' && !d.is_trusted) {
    console.warn('[security] refused synthetic delete click');
    e.preventDefault();
  }
});
```

The reference demo `example-v20-full.php` includes a button pair
(`v20_panel.istrusted_real` and `v20_panel.istrusted_fake`) that
demonstrates the distinction in the panel output.

### HMAC manifest signing

Server-side, generate the signature:

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

Client-side:

```js
NAC.set_provenance_secret(SECRET_FROM_AUTHED_RESPONSE);
NAC.register(manifest);
// runtime recomputes hmac, rejects if mismatch
```

The secret MUST come from an authenticated server response; never
embed it in JS source. Rotate per-session if the threat model
demands it.

## Reporting a vulnerability

Email `nac@yujin.dev` with:

1. Description of the vulnerability.
2. Reproduction steps or proof-of-concept.
3. Affected NAC3 version(s).
4. Suggested mitigation if you have one.

Do NOT open a public GitHub issue. We commit to:

- Acknowledge receipt within 3 business days.
- Provide a triage assessment within 10 business days.
- Coordinate disclosure timing with the reporter.

Critical issues affecting the public spec ship with a patch
release within 30 days; lower severity within 90.

## What NAC3 explicitly does NOT do

- Authenticate users.
- Encrypt data in transit (use TLS).
- Prevent the user from doing what the user is allowed to do.
- Sandbox agents away from each other (they all run in the same
  page; if you want isolation, run separate pages).
- Sign individual actions (only manifests). Per-action signing is
  tracked as v3.0 candidate.
