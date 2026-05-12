# NAC3 live demos at yujin.app/nac-spec/

**Spec version:** 2.2 stable (+ v2.3 interop preview).

**NAC3** = **Native Agent Contract**. The spec that lets web UIs be
driven by AI assistants, voice runners, and accessibility tools
without per-app glue code.

Three demos live side-by-side. Each has a distinct purpose; do not
confuse them.

| File | Version | Purpose |
|---|---|---|
| `example.php` | v1.9 stable | The canonical demo for NAC3 v1.9. 27 widgets (chat, calendar, autopilot, modals, tabs, charts, etc.). Shows the full v1.9 feature surface in production-shaped UI. **Unchanged.** |
| `example-v20-primitives-showcase.php` | v2.0-rc4 | **Didactic showcase** of the 8 v2.0 primitives + HMAC + isTrusted + i18n contract. 8 sections, one per primitive. Useful for reviewers and adopters who want to understand each new primitive in isolation. **NOT a migration of example.php.** |
| `example-v20-full.php` | v2.0-rc4 | **Brownfield migration** of `example.php` to NAC3 v2.0 strict. Same 27 widgets, same HTML, same handlers -- with v2.0 layer applied on top via ~80 lines of setup code. Demonstrates that real-world adoption does NOT require rewriting every widget. |

## Side-by-side comparison

Open `example.php` and `example-v20-full.php` in two tabs.

### What is identical

- HTML markup (every `<article data-nac-plugin="X">`, every
  `data-nac-id`, every i18n catalog reference, every handler)
- Visual appearance (same layout, same widgets, same interactions)
- v1.9 reference runtime (`js/nac.js`) loaded the same way
- Existing `data-i18n-key` catalog references

### What is different in the v2.0-full version

1. **Header docstring** explicitly explains it is a brownfield
   migration showcase.
2. **One additional script tag**: `js/nac-v2-extensions.js` loaded
   after `nac.js` and before `example.js`.
3. **One additional setup block** (~80 lines at the bottom of the
   page) that:
   - Builds a hierarchical scope tree from existing
     `data-nac-plugin` attributes (every plugin becomes a scope
     under `demo.shell`).
   - Calls `NAC.set_provenance_secret()` to enable HMAC sign.
   - Calls `NAC.setTenantPrefix('demo')` to demo multi-tenant.
   - Starts `NAC.captureEphemeral()` ring buffer for toasts.
   - Calls `NAC.autoRegister.watch()` on the cards container.
4. **One additional UI panel** (`#v20-panel`, fixed bottom-right)
   exposing live `describe_v2()`, `validate_global_v2()`, HMAC
   sign demo, and isTrusted distinction button.

That is the entire delta. Real adopters reuse this pattern verbatim.

## How to evaluate

If you are a peer reviewer of NAC3 v2.0:

1. Open `example.php` first. Confirm v1.9 demo works as before.
2. Open `example-v20-full.php`. Confirm it works IDENTICALLY for
   the v1.9 functionality (chat, calendar, autopilot, etc.).
3. Open the v2.0 panel (bottom-right corner). Click each button:
   - `describe_v2()` -- see the scope tree built from the
     brownfield plugin attributes.
   - `validate_global_v2()` -- see findings (likely warnings only
     if i18n catalog has gaps).
   - `sign as agent` -- see HMAC signature produced.
   - `click=trusted` / `.click()=fake` -- see isTrusted distinction
     in action.

If you are an adopter:

Use `example-v20-full.php`'s setup block as your template. Adapt
the scope tree to your app's plugin structure. Most of the work
is identifying your scope hierarchy; the rest is mechanical.

## Cross-links

- NAC3 spec: https://github.com/pkuschnirof/nac-spec
- v1.9 release: tag `v1.9.0`
- v2.0 release candidate: `2.0.0-rc4` on `main`
- Round 3 peer review trail: `docs/PEER_REVIEW.md`
