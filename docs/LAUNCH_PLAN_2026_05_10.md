# NAC3 v2.2 launch plan -- autonomous Sumi run, 2026-05-10

This file is the canonical playbook for the autonomous launch
session of 2026-05-10. It documents what got built, why, in what
order, and what is still required before prod.

When this run completes successfully, the file is renamed to
`LAUNCH_RECORD_2026_05_10.md` (a permanent record). Until then it
is the live plan that Sumi follows + any wakeup picks up from.

## Charter

Pablo, 2026-05-10 morning: "voy a tener un dia muy ocupado. Cuando
termines y los tests y 2.1 den 100% (corre solo local los tests
porque no tengo creditos en GitHub), empieza continua con 2.2
completo, y testea, luego actualiza paquete npm. Luego continua
generando doc de adopcion en Angular, y luego actualiza el plan y
toda la doc, y continua con el plan de difusion. Puedes mandarme
mails informando avances una vez por hora a pablo.kuschnirof@gmail.com
utilizando la api de Yujin?"

Then 13:30: "agrega al final study cases en REACT y ANGULAR. En
ambos casos construye una pagina demo similar bajando los paquetes
de npm. Con chat y autopilot. Documentalos. La landing page tiene
que tener links a TODOS los documentos y demos, agrupados
inteligentemente. La landing debe estar hecha NAC3 3 compliance con
chat voice/chat navegable y autopilot."

Then 13:45: "Documenta todo este plan. Una vez testeado todo,
salimos a prod."

Constraints recorded:
- Tests run **local only** (no GitHub Actions, no credit budget).
- Hourly progress emails to pablo.kuschnirof@gmail.com via the
  Yujin notifications API.
- No rebrand of NAC3 (decision 2026-05-09; see
  `memory/project_nac_name_locked.md`).
- Time calibration: Sumi-time, not human-time. BRIEF=3min,
  MEDIUM=5min, LARGE=12min, EPIC=60min.
- No fallback to legacy patterns (rule 11 + memory
  `feedback_no_fallback_to_legacy`).
- Surface blast radius before design (memory
  `feedback_blast_radius_first`).

## Definition of done

The session is "done + ready for prod" when:

1. `@nac3/runtime` builds clean + `npm test` passes 36/36 smoke +
   14/14 v22 = 50/50 PASS.
2. `npx @nac3/runtime validate yujin.app/nac-spec/` reports zero
   error-severity findings.
3. The four demos at yujin.app/nac-spec/ load without console
   errors and respond to voice + chat input correctly.
4. The landing page at yujin.app/nac-spec/index.html:
   - Has a manifest registered.
   - Has chat + voice + autopilot wired.
   - Passes `NAC.validate_global({probe: true})` with zero
     findings (NAC-3 conformance).
5. SPEC.md, ABOUT.md, V22_ROADMAP.md, README_DEMOS.md all match
   v2.2 reality.
6. The React + Angular guides each include a working study case
   that builds a from-scratch demo using the npm package, with
   chat + autopilot. A reader can copy-paste and run.
7. CONTRIBUTING + LICENSE + SECURITY are in place.
8. The diffusion plan is written: messaging, channels, sample
   posts, demo gif/video plan, follow-up cadence.
9. CHANGELOG entries on the package match the runtime delta.
10. Final email to Pablo summarises the run + flags any pending
    manual action (npm publish credential, etc).

## Workstreams

### W1 -- v2.1 launch baseline (DONE 2026-05-09 + early 2026-05-10)

| Task | Status | Commit |
|------|--------|--------|
| `data-nac-role="tab"` canonicalisation in v21 demo | done | 0633e080 |
| `tab_by_label` parens normalisation + role tolerance cleanup | done | f631d77a |
| `_detectLangSwitch` 2-letter false-positive guard | done | f631d77a |
| v20-panel ack emit (bind() wrap) | done | c9bf2bdb |
| ABOUT.md + SPEC.md + LICENSE + CONTRIBUTING + SECURITY | done | 1eb999a9 |
| @nac3/runtime NPM package skeleton | done | 8bbc398a |
| React adoption guide | done | 9a343a3c |
| LLM wiring guide | done | 9a343a3c |
| Landing page index.html (v1 -- decorative) | done | 7174eb86 |

### W2 -- v2.2 ship (DONE early 2026-05-10)

| Task | Status | Commit |
|------|--------|--------|
| V22-01 `NAC.register` strict validator | done | 6c2b1866 |
| V22-02 `NAC.bindAction` helper | done | 6c2b1866 |
| Bump `nac.js` global version to 2.2.0 | done | 6c2b1866 |
| Bump `@nac3/runtime` package to 2.2.0 | done | 6c2b1866 |
| `test/v22.mjs` with 14 tests | done | 6c2b1866 |
| `npm test` chains smoke + v22 (50 PASS) | done | 6c2b1866 |
| Angular adoption guide | done | f40a40ba |
| V22 roadmap marked SHIPPED | done | f40a40ba |
| ABOUT.md status updated | done | f40a40ba |
| SPEC.md bumped + new sections 5.1.1 + 5.1.2 | done | f40a40ba |

### W3 -- NAC-3 landing page (IN PROGRESS)

The landing page must demonstrate NAC-3 conformance: HMAC-signed
manifests + isTrusted-aware sensitive verbs + zero
`validate_global({probe: true})` findings. To make it useful, it
also gets:

- A NAC3 manifest covering every CTA, demo card, and resource
  link.
- A chat panel embedded (text + voice push-to-talk + handsfree).
- An autopilot mode that walks a visitor through the page
  end-to-end ("first time? click here for a guided tour").
- All elements decorated with `data-nac-id` + `data-nac-role`.

Subtasks:
- [ ] Add chat panel to index.html (right side, collapsible).
- [ ] Wire `nac-chat-client.js` against the production endpoint
      `/crm/api/v1/yujin/nac-demo`.
- [ ] Build autopilot script that drives every section in order
      and narrates via TTS.
- [ ] Manifest with all CTAs + cards + resources, 10 locales each.
- [ ] HMAC-sign the manifest server-side (or client-side with a
      demo secret -- explain in the page that real prod uses
      authed-server-issued secrets).
- [ ] Resource grouping intelligence: spec / guides / demos /
      contributing -- 4 columns.
- [ ] `NAC.validate_global({probe: true})` returns `[]`.

### W4 -- React + Angular study cases (PENDING)

Real, runnable, npm-package-consuming demo apps that include chat
+ autopilot.

Subtasks:
- [ ] `packages/nac-react-demo/` -- Vite + React 18 + @nac3/runtime
      consuming via `import` from npm. Mini "todos" UI with chat
      panel + autopilot.
- [ ] `packages/nac-angular-demo/` -- Angular 17 standalone +
      @nac3/runtime. Mirror the same UI for cross-framework parity.
- [ ] Append a "Study case" section to `guides/REACT.md` + a
      mirror in `guides/ANGULAR.md` walking through the build,
      with the `packages/` directory as the canonical reference.

### W5 -- Diffusion plan (PENDING)

`docs/NAC_LAUNCH_DIFFUSION.md` covers:

- Messaging (one-line, three-line, 30-second pitch).
- Audiences (React/Angular devs, voice/agent builders, a11y
  advocates).
- Channels (HN, Reddit r/javascript / r/webdev / r/Accessibility,
  dev.to, Twitter/X, LinkedIn, Mastodon).
- Sample posts (titles + opening lines).
- Demo gif/video plan (script, scenes, length, hosting).
- Follow-up cadence (week 1 / week 4 / month 3).
- Metrics (npm downloads, GitHub stars, demo page views,
  conversation mentions).

### W6 -- Verification + prod cutover (PENDING)

- [ ] Run `npm test` from clean state. 50/50 PASS.
- [ ] Run `npx @nac3/runtime validate yujin.app/nac-spec/`. Zero
      [ERROR] findings.
- [ ] Manual smoke of the four demos (open + autopilot + voice
      command).
- [ ] Manual smoke of the upgraded landing (autopilot + chat +
      validate_global probe).
- [ ] If everything green: send the prod-cutover email to Pablo.

## What remains manual (Sumi cannot do alone)

1. **`npm publish @nac3/runtime@2.2.0`.** Requires the `@yujin` org
   npm token. Pablo runs:
   ```
   cd packages/nac
   npm run build
   npm test
   npm publish --access public
   ```
   Token must be set via `npm login` or `~/.npmrc` first.

2. **DNS cutover for `yujin.app/nac-spec/`.** Already pointed by
   GoDaddy; deploy.yml pushes on every commit. No manual action
   unless we move to a new origin.

3. **HN / dev.to / Twitter posting.** Per W5, the messaging is
   prepared but the actual click-to-post is human.

## Hourly email cadence

Sumi schedules a wakeup every ~55 min via `ScheduleWakeup`. At
each wakeup:

1. Read this file's "what just happened" + the git log since the
   last email.
2. Compose a short progress email.
3. POST to `https://yujin.app/crm/api/v1/notifications/email`
   with `X-API-Key` from `crm_desa/config/config.json` (api_key
   field).
4. Schedule the next wakeup.
5. Continue work in the queue.

If Pablo replies during the day, switch to interactive mode and
cancel further wakeups until told otherwise.

## Audit trail

Every commit during the session lands on `main` and triggers the
deploy.yml pipeline -- the public yujin.app/nac-spec/ updates
automatically. The repository at github.com/pkuschnirof/rpaforce-crm
is the single source of truth.

Time-stamps and commit SHAs are this doc's job. Update it
whenever a workstream advances.

---

*Sumi runs this plan autonomously starting 2026-05-10 morning.
Pablo reviews + approves the prod cutover when he returns at
night.*
