# Impact of NAC3 on Testing + QA

**NAC3 version:** 2.2 stable.
**Audience:** Test engineers, QA leads, SDETs, CTOs evaluating
the long-term test maintenance cost of NAC3 adoption.

## Tldr

Test code that uses NAC3 ids survives UI redesigns. Test code
that uses CSS selectors does not. That single property changes
the economics of test maintenance from "linear with UI churn"
to "linear with feature churn" -- typically 5-10x less work.

## The maintenance math today

A typical Selenium / Cypress / Playwright suite for a non-trivial
web app contains hundreds of selectors:

```ts
await page.locator('button.btn-primary.btn-large:has-text("Save")').click();
await page.locator('div.modal > div.body > input[type="text"]:first-of-type').fill('Acme');
await page.locator('table.invoice-grid > tbody > tr:nth-child(1) > td:last-child > button').click();
```

These selectors break when:

- Design team renames `.btn-primary` to `.btn-cta`.
- A wrapping div is added for accessibility.
- The button label is internationalised and "Save" becomes
  "Guardar" in es-tenant tests.
- The grid layout switches to grid-template-rows.
- Anything about the page that ISN'T the semantic intent
  changes.

Industry surveys (2024-2025) estimate **30-50% of QA engineer
time is selector maintenance**. The number gets worse as the app
grows.

## The maintenance math with NAC3

```ts
await NAC.click('invoice.save');
await NAC.fill('invoice.client_name', 'Acme');
await NAC.click('invoice.line.42.delete');
```

These calls survive:

- CSS class renames (selectors don't reference CSS).
- DOM tree restructuring (selectors don't reference structure).
- I18n label changes (selectors don't reference text).
- Grid-to-flex layout migrations.
- Component library swaps.

They break ONLY when:

- The product team renames a verb (`save` -> `commit`).
- A button is removed entirely.

These are **feature-level changes**, not UI-level. The test
needs updating for the same reason production code needs
updating. That's the right cost basis.

## Concrete impact metrics

From the Yujin CRM internal data (2025):

| Metric | Before NAC | After NAC | Delta |
|--------|-----------|-----------|-------|
| Average Playwright spec lines | 187 | 64 | -66% |
| Per-spec maintenance after redesign sprint | 4.2 hours | 0.3 hours | -93% |
| Selector-related test failures per week | 38 | 2 | -95% |
| Onboarding ramp for new QA engineer | 3 weeks | 1 week | -67% |
| Tests passing 6 months after written, no edits | 31% | 89% | +180% |

The 89% number is the killer. **The vast majority of NAC3 tests
keep working through normal product evolution**, while the
selector-based equivalents rot.

## What NAC3 enables for test automation

### 1. Stable test corpus

A test written in 2024 against `NAC.click('invoice.save')` still
runs in 2026 if the verb `save` survives the product
roadmap. The DOM around the button can have been rebuilt three
times.

### 2. Cross-browser without selector mode swaps

CSS selectors behave differently across Chromium / Firefox /
WebKit for edge cases (pseudo-elements, focus rings, shadow
DOM). NAC3 dispatches via the runtime's resolver -- the same
code path regardless of browser.

### 3. I18n-agnostic tests

A multi-locale app: today's test suite needs per-locale runs
because "Save" / "Guardar" / "Speichern" are all the same
button. With NAC3 the test calls the id; the runtime resolves
across locales. **You write 1 test, it runs 10 locales** (one
per ).

### 4. LLM-assisted test authoring

An LLM that sees `NAC.describe()` can produce a complete test
spec from a prose description: "Test that adding a row then
deleting it returns the table to initial state." The LLM
emits NAC.* calls; you review + commit. The Yujin CRM has
~250 specs that were authored this way and reviewed before
merge.

### 5. Self-healing tests via discovery

When a test fails because an id was renamed:

```ts
try {
  await NAC.click('invoice.save');
} catch (e) {
  if (e.code === 'not_found') {
    // Re-discover; the verb 'save' may live under a new id.
    const r = await NAC.click_by_verb('invoice', 'save');
    if (r.ok) console.warn('id has changed; update test');
  }
}
```

The runtime's `click_by_verb` gives you a self-healing fallback
that surfaces "this test needs updating, but the action still
works" -- a much better failure mode than "selector not found,
full stop".

### 6. Test-generation from manifests

`NAC.validate_global({probe: true})` synthesises a click on every
`role="action"` element + verifies it emits the canonical ack
event within 5s. **This is an auto-generated smoke test for the
entire app's clickable surface**. Run it in CI; it catches any
button that mounts without proper ack emission.

### 7. Pipeline coverage by stage

Yujin's reference test suite (NAC_TEST_MANUAL.md) organises tests
by NAC3 pipeline stage:

- Stage 1 (STT input)
- Stage 2 (Disambiguation)
- Stage 3 (LLM intermediary)
- Stage 4 (NAC.* calls)
- Stage 5 (DOM side effect)
- Stage 6 (Ack event)

Coverage is measured **per stage**, not just per line of code.
The Yujin reference reports ~95% weighted average across all
stages. Adopting that schema gives you a coverage scorecard
that maps directly onto the contract.

## Impact on existing test frameworks

### Playwright

Direct integration. `page.evaluate()` invokes `NAC.*` calls.
Selectors stay as a fallback for layout assertions. The Yujin
reference includes 16 Playwright specs at
`tests/e2e-nac/specs/`.

### Cypress

`cy.window().then(win => win.NAC.click(id))`. Same pattern.
Custom commands wrap the NAC calls:
`cy.nacClick('invoice.save')`.

### Selenium

JavaScript executor: `driver.execute_script('return
window.NAC.click(arguments[0])', 'invoice.save')`.

### Jest + React Testing Library

```ts
import '@nac3/runtime';
import { render } from '@testing-library/react';
import { App } from './App';

test('save works', async () => {
  render(<App />);
  await window.NAC.click('invoice.save');
  expect(mockApi.save).toHaveBeenCalled();
});
```

NAC3 sits beside React Testing Library, not against it.

### Karma / Jasmine / older runners

Direct injection via `window.NAC`. Anything that can run
JavaScript in a browser context works.

## Cost of adoption

### Existing app

Per the [migration playbook](AI_PLAYBOOK_MIGRATION.md), figure:

- ~1 day per screen for decoration + manifest.
- ~1 day per screen for test corpus migration.
- Total for a 20-screen app: ~6 weeks of one engineer's time,
  paid back by the maintenance savings within 3-4 months.

### New app

Built-in. The greenfield playbook treats NAC3 attributes as a
first-class concern. No retrofit cost.

## Risks + mitigation

### Risk -- "we don't trust LLM-generated tests"

Fair. The LLM produces a candidate; a human reviews + commits.
Same workflow as Copilot. The corpus that ships is exactly what
the team approved, not what the LLM wrote.

### Risk -- "NAC ids become tech debt over time"

True if you let them rot. Treat NAC ids like database column
names: rename via migration, never delete in-flight.
`@nac3/runtime` CLI catches orphan ids via static lint.

### Risk -- "what if NAC's adoption stalls?"

The spec is Apache-2.0. The runtime is < 200KB. Worst case: you
own the artefact, ids stay stable. Worst case is still better
than CSS selectors.

## See also

- [NAC_TEST_MANUAL.md](../docs/NAC_TEST_MANUAL.md) -- the
  standardised test playbook this impact analysis underwrites.
- [RPA_UIPATH.md](RPA_UIPATH.md) /
  [RPA_AUTOMATION_ANYWHERE.md](RPA_AUTOMATION_ANYWHERE.md) /
  [RPA_BLUE_PRISM.md](RPA_BLUE_PRISM.md) -- adjacent
  applications of the same contract.
- [COVERAGE_REPORT_2026_05_10.md](../docs/COVERAGE_REPORT_2026_05_10.md)
  -- the Yujin reference's own coverage numbers.

## License

Apache-2.0.
