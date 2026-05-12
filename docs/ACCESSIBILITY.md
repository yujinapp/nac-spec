# NAC3 -- Accessibility commitment

**Spec version:** 2.2 stable (+ v2.3 interop preview).
**Last reviewed:** 2026-05-11.

NAC3 was designed to make web UIs addressable by machines. The
same property that makes a UI navigable by an AI agent makes it
navigable by a screen reader, a switch device, an eye tracker,
and a voice user. NAC3 is, by construction, an accessibility
primitive -- and Yujin commits to keeping it that way.

---

## The commitment

1. **WCAG 2.1 Level AA** compliance is the floor for every
   Yujin product that builds on NAC3 (`yujin-pilot`,
   `yujin-forge`, the reference demos at yujin.app/nac-spec/,
   yujin.app/registry).
2. **AAA where feasible** for the surfaces where accessibility
   matters most: chat panel, voice activation, first-run
   onboarding, error messages.
3. **No separate "accessible edition"**. Accessibility ships in
   the main product, at the same price, with the same release
   cadence. Separate editions stigmatise users and rot.
4. **No "accessible later"**. Each release gates on the
   accessibility checks documented in
   [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) section 8.6
   and the new screen-reader smoke section (Track G7).

---

## Supported assistive technologies

The reference implementations are tested against:

| AT category | Tools verified |
|-------------|----------------|
| Screen readers | NVDA (Windows), JAWS (Windows), VoiceOver (macOS, iOS) |
| Voice control | Yujin Pilot, Apple Voice Control, Windows Speech Recognition, Dragon NaturallySpeaking |
| Switch access | iOS Switch Control, Android Switch Access |
| Eye tracking | Tobii Dynavox |
| Magnification | Browser zoom up to 200%, ZoomText, macOS Zoom |
| Keyboard-only | Full keyboard navigation, visible focus, no time limits |

Any AT that consumes the standard accessibility tree (ARIA,
accessibilityRole, accessibilityLabel) benefits from NAC3
because NAC3 elements carry the same semantic information used
by the AT layer.

---

## What NAC3 contributes to accessibility (mechanism)

- **Stable identifiers (`data-nac-id`)**: screen readers and
  switch access do not depend on visual position. The
  identifier survives redesigns, so an AT user's muscle memory
  survives too.
- **Canonical roles (`data-nac-role`)**: the role enumeration
  (action, field, tab, etc) maps 1:1 to ARIA roles. AT users
  hear semantically correct announcements.
- **Manifest verbs (`label_i18n`)**: every action has a
  localised label in 10 languages. Voice control users speak
  the verb; the manifest resolves it.
- **Deterministic ack events (`nac:action:succeeded`)**: AT
  users hear confirmation that an action completed, not a
  guess based on UI animation.
- **Strict validation (v2.2)**: catches drift between manifest
  and DOM before it reaches AT users.

---

## What NAC3 does NOT solve

- **Native iOS/Android applications**: the v2.2 spec covers
  web + WebView only. Native mobile is on the v3.0 roadmap.
- **Visual presentation**: NAC3 is structural. Contrast,
  font size, focus indicators are the implementation's
  responsibility (Yujin tokens cover this in our reference
  implementations).
- **Cognitive load of complex flows**: NAC3 ids do not make a
  badly designed workflow simple. Good IA + plain-language
  copy do.
- **Captioning of multimedia**: audio/video assets must be
  captioned by the publisher. NAC3 provides hooks but not the
  content.

---

## Reporting an accessibility issue

Email `accessibility@yujin.app` (or whatever forwards to the
maintainer). Response SLA: 5 business days for triage, no SLA
on fix because every case is different. Issues are tracked
publicly in the `nac-spec` repo with the `a11y` label.

For security-sensitive issues (e.g. AT bypass of confirmation
dialogs), follow `SECURITY.md`.

---

## Roadmap

| Track | Description | Target |
|-------|-------------|--------|
| G1 | WCAG 2.1 AA audit + remediation (Forge + Pilot UI) | Pre Forge/Pilot v1 |
| G2 | Voice-first setup wizard (Forge + Pilot first-run) | Forge/Pilot v1 |
| G3 | NAC3-compliance in every doc page | NAC3 v2.2 launch |
| G4 | Audio version (.mp3) of every guide | NAC3 v2.3 |
| G5 | Conversational tutorial at yujin.app/learn | NAC3 v2.3 |
| G6 | Plain-language parallel version of key guides | NAC3 v2.3 |
| G7 | Screen reader smoke test in HUMAN_OK_CHECKLIST | NAC3 v2.2 launch |
| G8 | Real disabled-user beta program | Pre Forge/Pilot v1 |
| G9 | This statement, public + linked from every page | NAC3 v2.2 launch |
| G10 | External certified audit | Pre Forge/Pilot 1.0 commercial |

---

## Why we publish this

Two practical reasons beyond ethics:

1. **EU Accessibility Act (EAA)** entered force June 2025 for
   B2C services. Apps built with Forge are NAC3-compliant by
   default and ship closer to EAA compliance than competitors.
2. **US ADA Title III lawsuits over web apps** grew 320% YoY.
   Enterprise buyers care about this. NAC3 + Yujin compliance
   posture lowers their legal exposure.

NAC3 is not "open standard with accessibility as bonus". NAC3
is "the only general-purpose web automation contract that is
accessibility-native by construction". We will keep it that
way.

---

## See also

- [SPEC.md](../SPEC.md) -- the canonical contract.
- [HUMAN_OK_CHECKLIST.md](HUMAN_OK_CHECKLIST.md) -- includes
  the screen reader smoke section.
- [SECURITY.md](../SECURITY.md) -- security model, includes
  AT-related concerns.

## License

This document is Apache-2.0. The implementations it commits to
are MIT (runtime) / Apache-2.0 (spec) / proprietary (Forge,
Pilot).
