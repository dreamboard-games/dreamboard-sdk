# Initial options and actor interactions

Status: next after reviewed layer 002a. Execute on its own dependent branch.

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
