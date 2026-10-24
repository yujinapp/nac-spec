# ELIGIBILITY CRITERIA -- Urazuke, station N0

This sheet defines **what has to be true before this system can be taken over
with the Urazuke method**, how each item is verified, and what counts as green
or red. It is written so that the verification is an act, not an opinion: every
criterion below is answered by doing something to the system and recording what
happened.

Owner of the criteria: the project owner. Executor: the agent.
The agent does **not** decide. It presents the sheet; the owner decides.

---

## 0. Ground rules of the verification

* **Nothing in the system is changed** during N0. Verification is read-only and
  additive: probes live in `e2e/`, evidence lives in `docs/`.
* **A criterion is green only with evidence that a third party could repeat.**
  The evidence must name the command, the input and the observed output.
* **"It should work" is not evidence.** If something cannot be exercised in
  this environment, the criterion is red and the reason is written down.
* **An inferred statement is marked as inferred.** In the recovered
  functionality, anything not directly readable in the code is flagged `[INF]`.
* **A red criterion is not a failure of the system.** It is a prerequisite
  project: a bounded, verifiable piece of work whose acceptance test is the
  criterion turning green.

## 1. The seven prerequisites

### P1 -- A complete environment can be brought up from the repository and a copy of the data

*What it asks.* From a clean machine, with the repository and a copy of the
data, can a working environment of the system be assembled -- sources, data
model and persistence included -- and can we say exactly what came up and what
did not?

*How it is verified.* Build and run everything from sources with today's
tools: install, build, start the serving surface, open every screen, and try
each persistence path. Record what starts, what degrades and what is
impossible.

*Green when.* A third party can go from `git clone` to a running system that
serves every screen, using only documented steps, and the only things missing
are third-party services that are declared as external.

*Red when.* A step cannot be reproduced, a screen cannot be served, or a
component that the system needs at runtime is not obtainable.

### P2 -- The code can be read, understood and worked with, module by module

*What it asks.* Can a new team read the whole code and understand it, naming
explicitly what they cannot understand?

*How it is verified.* Read the sources, map them by module and by
responsibility, and write down the parts that resist understanding (with the
reason: missing docs, implicit convention, dead code, magic constant).

*Green when.* Every module has a stated responsibility, the entry points and
the public API are identified, and the list of "cannot understand" items is
short, specific, and none of them is load-bearing.

*Red when.* A load-bearing module cannot be understood without the original
author, or the module boundaries are undiscoverable.

### P3 -- The functionality can be recovered from the code alone, for an end user

*What it asks.* Written from the code, what does this system do for the person
who uses it -- screen by screen and process by process?

*How it is verified.* Produce `docs/FUNCTIONALITY_RECOVERED.md`: the complete
functionality in end-user language, with every inferred statement marked, and
with the limits (what the system does not do) stated explicitly.

*Green when.* An end user reads it and recognises what the system does; nothing
that the code implements is missing; nothing that the code does not implement
is claimed.

### P4 -- Every screen can be driven by a test tool, with each element accessible and the backend effect checkable

*What it asks.* Is the surface testable? For each screen: can an automation
tool reach every element, and can the effect of an action be asserted?

*How it is verified.* Inventory every screen; for each one measure how many
elements the runtime exposes, how many are addressable in the DOM, and how many
interactive elements are not exposed at all. Then write and run **one real
end-to-end test of one flow** that asserts a state change.

*Green when.* Every operating screen is listed with a verdict, and at least one
complete flow is proven end to end with a test that fails if the flow breaks.

*Red when.* A screen cannot be reached by the tool, or no effect can be asserted
anywhere (i.e. the flow can only be checked by eye).

### P5 -- The system builds and runs with today's tools, with every unresolved dependency named

*What it asks.* Can it be built and run now, not in the environment it was
written in?

*How it is verified.* Build from sources with current Node/npm, run the test
gate, resolve the published package from the registry, deploy path included.
List every dependency that does not resolve.

*Green when.* Build and test gate run green on a current toolchain and the
published artefact matches the repository.

*Red when.* The build needs an unavailable tool, or a dependency no longer
resolves.

### P6 -- Production data can be copied and anonymised into a test environment, and a backup exists and has been restored

*What it asks.* Can the real data be taken to a test environment without
carrying personal data, and is there a backup whose restore has actually been
exercised?

*How it is verified.* Identify every data class, where it lives and who owns it.
Determine whether a copy is possible, whether anonymisation is possible, and
whether a restore has ever happened and was verified.

*Green when.* Every data class has a stated owner, a copy path and an
anonymisation path -- or is explicitly declared out of scope because the system
holds no such data -- **and** a restore has been executed and verified at least
once.

*Red when.* A data class has no owner, no copy path, or the backup has never
been restored.

### P7 -- Every external integration has a test mode or can be isolated at the edge

*What it asks.* For each third-party dependency: can it be exercised in a test,
or faked at the boundary so the system can be tested without it?

*How it is verified.* Enumerate every outbound integration from the code, name
its owner, its cost, and whether a sandbox, a stub or a graceful degradation
exists.

*Green when.* Every integration is enumerated and each one is either replaceable
at the edge (stub / sandbox / fallback) or explicitly accepted as untestable
with the consequence written down.

*Red when.* An integration is undiscovered, or its failure breaks the system
with no way to test around it.

## 2. How the colour is assigned

| Colour | Meaning |
|---|---|
| GREEN | Verified with repeatable evidence in this session. |
| RED | Not verified, or verified as impossible. Carries a prerequisite project. |
| (no amber) | If it is not green, it is red. A partial result is written as red plus the part that did pass, so nothing gets lost. |

## 3. The decision the owner makes

After the sheet is presented, the owner chooses exactly one:

1. **Go** -- the system is taken over; Urazuke continues from station N1.
2. **Go after these prerequisite projects** -- red criteria become blocking
   pending items with their own acceptance criterion ("the prerequisite verified
   green"), and the takeover waits for them.
3. **No-go** -- the method is not applied to this system.

The decision, its date and the decider are recorded in `docs/ELIGIBILITY.md`,
together with every question the agent had to ask and the owner's answer.
