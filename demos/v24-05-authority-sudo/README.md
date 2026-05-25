# V24-05 authority + sudo elevation demo

Live demo + Layer 2 evidence for NAC3 v2.5 RFC V24-05: agent authority
+ sudo elevation. Hosts interpose a confirm UI between agent dispatch
and side effect via `set_confirm_handler`; agents request bounded SUDO
via `request_authority(scope, ttl_ms)`. Subsequent `confirm_action`
calls in that scope (or lower) resolve without re-prompting until TTL.

Scope rank: `high > medium > low`. Granted high satisfies medium + low.

## Files

- `index.html` -- modal-backed confirm handler, auto-approve/reject
  toggles, request/check/revoke authority controls, scenario buttons.
- `../../scripts/run-demo-v24-05-authority-sudo.mjs` -- Playwright
  runner. 15 PASS / 0 FAIL across 7 scenarios.
- `../../evidence/v24-05-authority-sudo/<YYYY-MM-DD>/*.png`

## What the demo verifies

| # | Scenario | Verified |
|---|---|---|
| 1 | confirm_action with no handler | `NacError('no_confirm_handler')` |
| 2 | auto-approve handler | confirm resolves true, sudo=false (no grant) |
| 3 | auto-reject handler | confirm resolves false, `nac:action:rejected` fires |
| 4 | sudo bypass (grant high then 3 confirms) | all 3 bypass, sudo=true in events |
| 5 | rank rule (low grant does NOT satisfy high check) | low-act bypasses, high-act falls through to handler |
| 6 | TTL expiry (grant 1s, retry after 1.2s) | within-ttl bypasses; after-ttl falls through; `nac:authority:expired` fires |
| 7 | revoke_authority idempotency | second revoke is no-op |

## Provenance event coverage

- `nac:authority:requested / :granted / :denied / :revoked / :expired`
- `nac:action:confirmed / :rejected`

All captured in `__v24_05Demo.{authority_events, action_events}` and
asserted by the runner.

## Running

```bash
python -m http.server 8855
node scripts/run-demo-v24-05-authority-sudo.mjs
```
