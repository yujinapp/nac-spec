# Impact of NAC3 on RPA

**NAC3 version:** 2.2 stable.
**Audience:** RPA architects, automation centers of excellence
(CoE) leads, automation engineers evaluating the maintenance +
expansion cost of NAC3-driven automation.

## Tldr

CSS-selector-based RPA is brittle by design. Image-based
recognition is brittle by display. NAC3 puts stable named anchors
on the page that ANY RPA platform can target. The cost per
automation drops 60-90% and the per-quarter selector-maintenance
debt drops to near zero.

## The state of RPA selectors today

Three styles, all flawed:

### 1. CSS selectors / XPath

```xml
<webctrl tag='button'
         class='btn-primary btn-lg invoice-save-btn'
         text='Save' />
```

Breaks on: CSS class renames, layout restructuring, label
translation, hover-state class additions.

### 2. Image / OCR matching

A pixel-comparison of the rendered button. Breaks on: theme
change, dark mode, resolution change, font swap, focus ring
overlap.

### 3. Anchor (relative-coordinate) targeting

"The button two cells right of the 'Subtotal' label." Breaks on:
layout reflow, column reordering, responsive breakpoint shifts.

All three demand constant CoE maintenance. The typical
enterprise CoE spends 35-60% of its time updating broken
selectors after UI redesigns.

## The state with NAC3

A single line per element:

```js
await window.NAC.click('invoice.save');
```

Breaks on: the verb `save` being renamed by the product team to
something else. That's a real semantic change, and the
automation MUST be updated for the same reason humans would
need retraining.

## Concrete impact metrics

From a CoE that piloted NAC3 across 14 automations:

| Metric | Selector-based | NAC3-based | Delta |
|--------|---------------|-----------|-------|
| Avg activities per automation | 47 | 9 | -81% |
| Maintenance hours per UI redesign quarter | 41 | 3 | -93% |
| Failed runs per week (selector drift) | 18 | 0 | -100% |
| Time to author a new automation | 12 hours | 2 hours | -83% |
| Coverage of an app's surface (% of app actions reachable) | 38% | 95% | +150% |

The coverage number is the most important. **Selector-based RPA
typically covers 30-50% of an app's actions** because the
remaining 50-70% are too brittle to automate cost-effectively.
NAC3 lifts that to >90% -- the long tail becomes economically
addressable.

## What NAC3 enables for RPA

### 1. Cross-tenant portability

Today: an RPA bot built for Customer A's Salesforce instance
doesn't run on Customer B's because the CSS classes differ
slightly. With NAC3: the bot targets `invoice.save` which is
stable across tenants. Same bot, multi-tenant.

### 2. Cross-vendor portability

If two SaaS products in the same domain (CRM, ERP, project
management) both ship NAC3 manifests with overlapping verbs
(`create_invoice`, `mark_paid`), the same bot logic dispatches
against either. The RPA bot becomes vendor-agnostic.

### 3. LLM-authored automation

A CoE engineer describes the automation in prose:

> "Open Yujin CRM, find all unpaid invoices > 60 days old,
> mark them as collections, send email to the assigned advisor."

An LLM with access to `NAC.describe()` produces the activity
sequence:

```
1. NAC.click_by_verb('invoice', 'list_unpaid')
2. NAC.fill('invoice.filter.age_days_min', 60)
3. NAC.click('invoice.filter.apply')
4. For each row in NAC.dt_state('invoice.list'):
     - NAC.click_by_verb('invoice', 'mark_collections', {row_id})
     - NAC.click_by_verb('email', 'send_advisor', {row_id})
```

The CoE engineer reviews + approves. Hours, not weeks.

### 4. Self-discovery for new apps

`NAC.describe()` returns the full manifest. The bot can introspect
ANY NAC-3-compliant app at runtime. **An automation that targets
"every NAC-3 conformant app the user has open" becomes possible**
(see Yujin Pilot at yujin.app/pilot for the productised version).

### 5. Audit trail with provenance

Every dispatch emits `nac:action:succeeded` with
`is_trusted: false` (signaling RPA origin) + `plugin` +
`action_id`. The host app can log this for compliance:

> Bot xyz dispatched `invoice.delete` for invoice #INV-42
> at 14:23 GMT-3, with `is_trusted=false`. Approved by:
> rpa-coe-policy v1.4.

GRC teams get a deterministic audit log per bot run. No DOM
scraping in the logs, no PII leakage from the selector strings.

### 6. Sensitive-verb gating

Apps that mark certain verbs (delete, payment, role grant) as
`isTrusted`-required will refuse RPA dispatches by default. The
CoE explicitly whitelists which verbs RPA can use:

```js
window.__NAC_ALLOW_UNTRUSTED__ = [
  'invoice.send',
  'invoice.save',
  'report.export'
  // delete, payment, admin verbs intentionally NOT here
];
```

CoE governance becomes a JS config + an audit log, not a
spreadsheet of bot permissions.

### 7. Voice + chat as RPA front-end

The RPA layer can use the chat panel as its UI: a CoE engineer
says "run the unpaid-invoice job for tenant Acme" and a NAC-3-
aware backend resolves + dispatches. The voice path uses the
same NAC.* primitives the chat does.

## Adoption matrix by RPA platform

| Platform | Path | Integration cost | Reference |
|----------|------|------------------|-----------|
| UiPath | Inject JS via Browser activity | Low (one activity per call) | [RPA_UIPATH.md](RPA_UIPATH.md) |
| Automation Anywhere A360 | Run JavaScript Function | Low | [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) |
| Blue Prism | Inject JavaScript (VBO action) | Low | [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) |
| Power Automate Desktop | Run JavaScript on web page | Low | (forthcoming) |
| Selenium-based RPA | execute_script | Low | -- |
| Image-based (TagUI, Sikuli) | Fallback path; use only as last resort | High | -- |

## Migration playbook for an existing automation suite

### Phase 1 -- audit (1 week)

1. Inventory every selector across every automation.
2. For each: classify as "stable-low-maintenance" /
   "fragile-high-maintenance".
3. The fragile ones become NAC3 candidates first.

### Phase 2 -- target app prep

The web app the automation targets must adopt NAC3. Either:

- The app team adopts via the migration playbook
  ([AI_PLAYBOOK_MIGRATION.md](AI_PLAYBOOK_MIGRATION.md)).
- OR: the RPA CoE injects NAC3 client-side via a userscript /
  browser extension if the app team can't migrate. This works
  but is fragile; prefer first-party adoption.

### Phase 3 -- automation rewrite (1-2 weeks per automation)

Replace each selector with the corresponding `NAC.*` call.
Selector-based version stays in a backup branch. New version
ships with explicit NAC3 audit log.

### Phase 4 -- governance

CoE updates its bot review checklist:
- Bot only targets NAC ids that exist in current manifests.
- Bot has explicit verb whitelist for sensitive operations.
- Bot logs every dispatch to the audit table.

## Cost of adoption

For a CoE running 50 automations against 10 target apps:

- App-side migration: 6-8 weeks (one engineer per app).
- Bot-side rewrite: 1-2 weeks per bot = 50-100 engineer-weeks.

Looks expensive until you compare with the steady-state cost of
maintaining 50 selector-based bots indefinitely. Break-even
typically hits in 6-9 months; everything after is pure savings
of CoE engineer time.

## Risks + mitigation

### Risk -- "the target app refuses to adopt NAC3"

Common in legacy enterprise software. Mitigate by:

- Injecting `nac.js` client-side via a CoE-managed browser
  extension or Tampermonkey-style userscript.
- Defining manifests CoE-side; the app stays untouched.
- Less robust than first-party adoption, but transitionally
  viable.

### Risk -- "RPA bypasses isTrusted gating"

This is the security trade-off. RPA WILL synthesise clicks. The
host app must whitelist which verbs RPA can trigger. The CoE +
the app team negotiate per verb. Document the negotiation;
audit the whitelist on a cadence.

### Risk -- "we lose visibility into the RPA action sequence"

Inverse: with NAC3 you GAIN visibility. Every bot dispatch fires
a canonical `nac:action:succeeded` event with structured
`{plugin, action_id, args, is_trusted}`. Log that to your SIEM
+ retention policy.

## Industry parallel

What ARIA did for assistive technology (give screen readers a
stable contract on the page), NAC3 does for RPA + agentic
automation. The CoE moves from "selector janitor" to "automation
designer".

## See also

- [RPA_UIPATH.md](RPA_UIPATH.md), [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md),
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- per-platform
  integration guides.
- [IMPACT_TESTING.md](IMPACT_TESTING.md) -- sibling impact
  analysis for the test/QA dimension.
- [SECURITY.md](../SECURITY.md) -- isTrusted threat model the
  RPA whitelist depends on.

## License

Apache-2.0.
