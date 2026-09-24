# Headless instance and sources

Status: execution brief after committed steps and shared-model consolidation.
Read [the reviewed constraints](004-instance-review-notes.md) first. Those
constraints supersede the original design's executable game argument and
ACK-only source state. Root reviews each independently green cut.

## Core and objects

Expose `createGameInstance<Game>()({ source, features, ...options })` from root.
The game parameter is erased: an installed hosted UI must not import executable
game authoring, reducers, testing execution, Node modules, or React through root.
Use TanStack Store for framework-free subscriptions and immutable snapshots.
Keep one stable instance; per-snapshot domain objects use prototypes and retain
their instance back-reference. Methods read the relevant current options.

Provide phase, turn, me, players, interactions, inputs, zones/cards and events
from the selected-seat projection. Preserve literal game identities, input value
types and exhaustive phase routing. Model persisted step progress separately
from local unfinished drafts. Do not expose the all-seat engine pending map.

Interactions expose availability/reasons, their current inputs, readiness,
submit/cancel/reset and native-element handlers/props. Independent inputs submit
together. Steps expose and submit only the current named input. Cancellation
uses the server command even when a pending interaction is no longer available.
Reset only clears the local draft; it cannot undo a committed selection.

Defaults remain editable suggestions. Nullable completed choices are explicit
null; many-value inputs retain atomic cardinality. On a new frame, remove only
local values invalidated by the new domains. Route card/board targets through
the existing meaningful interaction router; ambiguity requires an explicit
interaction rather than an arbitrary selection.

Support uncontrolled initial state and controlled drafts/active interaction.
Controlled writes notify the owner; do not keep a competing internal value.
An ACK/frame barrier clears only the draft revision that was submitted, never
a newer edit supplied by the controlled owner. Unavailable and busy handlers
must enforce the same semantics as direct calls.

Props expose data-interaction/input/value/action plus eligible, selected,
disabled, ready, hidden and seat state. Native button/input props must preserve
keyboard behavior. Registry components own actual markup, styling and animation.

## Features

Use the proven additive feature factory typing to preserve root APIs such as
`instance.boards`, with disabled APIs absent both statically and at runtime.
Construction rejects overlapping property ownership. Extend the minimum real
game/interaction/input/zone/card/board hooks required by built-in features; do not
introduce a second feature namespace or broad global augmentation by default.

Implement the planned hand, board, drag and pan/zoom capabilities. Board geometry
comes from the canonical honeycomb implementation and manifest static data;
layout elements add current selection, eligibility and target handlers. Pointer
features own capture/release and cleanup. Features mount no styled components.

## Sources

Implement root's host WebSocket, iframe relay and static providers; testing owns
test emit/submission capture, local execution and scenario/checkpoint sources.
Every source publishes one stable source state with snapshot, connection and
request lifecycle. Apply the exact retry/barrier algorithm in the review notes:
one in-flight copied command, immutable original basis and ID, explicit ACK,
then an authoritative same-context frame newer than the captured version.

Socket/iframe ingress uses canonical wire validation and the existing expected
origin/session/seat boundary. No accepted frame or timeout can invent an ACK.
Disposal removes listeners/timers and rejects unsettled requests. Seat changes
invalidate the old source lifetime and never replay intent for the new seat.
Local sources use the same reducer bundle and frame materializer; retain source
capability differences in types so hosted sources cannot expose local apply.

## Inspection and testing

Inspection reads the same selected-seat getters/domains. Exploration and fuzzing
reuse the engine's collector/step evaluator and canonical commands with an
explicit enumeration budget; do not maintain another legality implementation.
Scenario sources use existing reducer scenarios/checkpoints as their authority.
Keep old tooling only until its actual callers migrate, then delete it in 006.

Retain the original coverage requirement: a typed coverage map covers every
interaction key, development warns once when an available interaction is never
read, and `assertCoverage` provides the test form. Keep this optional observation
inside the instance rather than introducing another diagnostics protocol. Add
the planned phase/availability/eligibility matchers alongside the test helpers.

Compile proofs cover game identities, inferred nullable/many inputs, absent
features, enabled per-object features, phase exhaustiveness, controlled options
and local-only operations. Behavioral proof covers complete Hearts replay,
Hex's private committed steps, both ACK/frame orders, lost ACK retry, ACK without
frame recovery, stale rejection, source disposal/switching and controlled edits
during submission. Include a browser import-closure check for root.

Run focused proofs and `pnpm check`; freeze for review before committing. The
React adapter and game UI cutover follow in 005 rather than expanding this cut.

Public display events and derived turn semantics are specified in the review
notes: events are the latest persisted batch, currentPlayerId is the sole active
player or null, and isMine tests active membership.

## Source integration receipt

Host/iframe/static sources are PR #38 at `600fe8e`, with both hosted gates passed
and no exact-head review threads. Testing providers integrate at `4773c4b`:
local/scenario execution, explicit test transport control, JSON checkpoint
restore, bounded exploration and deterministic fuzzing all reuse the production
bundle, canonical materializer and collector evaluator. Source internals retain
transport identity; test authors use the public snapshot and explicit results.

Root reviewed every production path and independently passed 46 provider, replay,
lifecycle and export tests. The combined repository gate passed 734 SDK tests and
both packed games (`/tmp/testing-sources-integrated-check-retry.log`). Its full
Hearts fuzz/replay test has an explicit 15-second integration-test timeout after
one suite run took 5.5 seconds; its command and solver budgets are unchanged.
Canonical phase-kind inference now prevents automatic phases from widening
commands to arbitrary strings. Checked real Hearts proofs reject unknown command
IDs and invalid params. Core objects, concrete features and React remain open.

## Instance integration receipt

The framework-free instance is integrated at `c05d712`, with root public exports
and browser import-closure proof. It uses TanStack Store, immutable domain
snapshots, native handlers, controlled drafts and an ACK/frame draft barrier.
Card routing follows projected per-card authority; active-seat changes invalidate
retained handlers. Partial local many-value drafts retain eligible members while
completed server steps remain atomic. Feature hooks reject overlapping ownership;
coverage records observed interactions rather than treating declarations as reads.

Root reviewed production code and independently passed 42 focused tests including
real Hearts and Hex. The combined `pnpm check` passed with both packed reference
games (`/tmp/core-integrated-check-final.log`). The deliberate public export
snapshot now includes root, and its browser closure excludes React and executable
reducers. Concrete features and the React adapter follow in separate layers.

Testing sources are PR #41 at `3f7719a`; both hosted checks passed and exact-head
review threads were empty.

Native submit/selection handlers now report rejected reducer results through
`onError`, preserving the selected draft and its retry readiness. Programmatic
submission still returns its explicit result. The focused rejection proof and
combined repository/packed-game gate passed
(`/tmp/core-native-feedback-check.log`). Applications own the visible notice.

The record-view correction reserves `boards` for manifest geometry and rejects
primitive/array seat views at the canonical wire boundary. Authored views keep
nested domain interfaces and readonly arrays through a top-level record
constraint; JSON admission remains in the runtime schemas. This avoids widening
Hearts' inferred card views while preventing authored geometry from overwriting
manifest boards. The integrated gate passed 769 SDK tests and both packed games
(`/tmp/record-views-integrated-check-retry.log`).
