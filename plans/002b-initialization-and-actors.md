# Initial options and actor interactions

Status: implemented and reviewed on `codex/sdk-initialization-actors`; full gate
and independent focused verification passed.

Remove authored setup profiles and the bootstrap language. Initialization accepts
JSON-safe lobby `options`; pass those values to initial state callbacks and phase
initialization where needed. Keep initialization validation at the bundle boundary.
Do not create a configurable bootstrap interpreter or preserve profile aliases.
Hearts performs its seeded shuffle and deal in its ordinary setup phase. Preserve
its deterministic reference scenarios, changing deliberate fixture expectations
only with an explanation of the new operation order.

Remove the prompt interaction kind. An ordinary interaction can override the
phase actor with `actor`; Hex's trade accept/reject interactions target the trade
recipient even though the phase's active player is the offeror. Authorization and
projection must use the same resolved actor. The other seats get descriptive
trade information through their authored view, never the recipient's input
domains. Remove prompt `to`, `visibility`, `context`, and `options` configuration,
and migrate all owned UI/testing callers required to keep this layer green.

Delete implicit cost handling, guidance, and phase-zone wiring metadata. Keep
explicit game rules and transaction resource mutations; do not erase affordability
validation or resource-transfer behavior with the old convenience machinery.
Update canonical schemas and generator inputs, then regenerate owned outputs.

Keep the existing split authored views until 002c. Keep committed steps, PerPlayer,
model-package consolidation, board geometry, and the client instance out of this
branch. Do not redesign the client transport or remove its hidden action basis.

Verify initial option validation/propagation, deterministic initialization, actor
override authorization, private recipient domains, and both trade responses.
Compile-only proofs must reject removed authoring keys and preserve model-bound
actor/phase/option types. Run focused tests, then `pnpm check`, freeze for root and
independent review, and commit only after valid findings are fixed. Root owns
branch creation, stack submission and hosted check tracking.

## Delivery receipt

The model owns one Zod options schema. Initial state and phase initializers infer
its parsed option types. Initialization accepts JSON-safe input, persists the
parsed values, and restored sessions validate those values against the same
schema. Omitted schemas use a strict empty object. Zod's schema traversal rejects
transforms, preprocessing pipes, coercion (including lazy nested schemas), and
overwrite checks; non-JSON schema outputs and payloads are rejected. Tests cover
propagation, JSON round-trip, invalid restored options, defaults, and the removed
schema operations.

Setup profiles, option/profile manifest metadata, and bootstrap instructions and
helpers are deleted. Hearts now performs the same seeded shuffle and round-robin
deal in its ordinary setup entry. Its deterministic full-hand fixtures remain
unchanged. Bootstrap behavior assertions were migrated to direct transaction
shuffle, deal, component placement, and incompatible destination rejection;
record-construction tests for the removed instruction language were retired.

All interactions use the same actor authorization for submission and projection.
Non-actors receive no input domains. Hex trade responses and discard barriers use
ordinary actor overrides. Explicit actors remain pending even when an actor is
the turn owner; continuation dependencies exclude self-edges. Existing trade,
discard, and self-targeted inspection proofs preserve these distinctions.
Implicit costs became explicit affordability rules. Prompt descriptors,
primitives, obsolete test matchers, guidance metadata, and phase-zone wiring were
removed with their owned callers. Automatically projected zones now honor hidden
zone visibility and per-card visibility; hidden reserve and component privacy
have focused regression coverage.

The checked authoring contract preserves option/actor/phase types and rejects
removed setup profiles, prompt inputs, recipient selectors, visibility policy,
costs, guidance, and phase zone declarations. Export snapshots intentionally
remove the corresponding symbols; projection snapshots reflect the reduced
metadata.

Verification: `mise exec node@24 -- pnpm check` passed with exit 0. SDK: 86 files,
630 tests. Reducer contract: 2 files, 79 tests. Plugin contract: 1 file, 10 tests.
Repository scripts: 32 tests. Workspace Hearts: 28 tests; Hex: 33 tests. Both
reference games passed installation/typechecking/tests against the packed SDK.
The focused initialization/actor/interaction/scenario suite passed 63 tests;
SDK production and compile-only type proofs passed. Root independently reran
63 focused tests and the checked testing contract; both passed with no remaining
source-review findings. Generation, formatting,
lint, and `git diff --check` passed. Existing `usePanZoom` hook warnings remain.
The packed-game global-pnpm quirk recorded for layer 007 remains unchanged.

Views and memoization remain owned by 002c; committed steps, board geometry,
PerPlayer consolidation, and the new instance remain in their planned layers.
