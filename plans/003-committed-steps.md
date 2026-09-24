# Private committed interaction steps

Status: implemented, verified and approved for integration.

## Supported authoring and commands

Keep independent `inputs: { ... }` and zero-input actions unchanged. Only
dependent workflows use steps. Remove dependsOn/defineInputs and eager/lazy
dependency projection once their consumers have migrated.

Use one small ordered builder for steps:

```ts
playing.interaction({
  steps: playing
    .steps()
    .input("hexId", hexInput)
    .input("targetPlayerId", ({ selected, state, playerId, q }) =>
      victimInput(selected.hexId, state, playerId, q),
    ),
  reduce({ tx, input }) {
    // input.params contains both inferred values.
  },
});
```

A strict TypeScript 5.9 spike and independent rerun proved this builder retains
earlier-only values, merged final params, nullable output and duplicate-key
rejection. Two simple tuple formulations lost either prefix inference or callback
typing. Prefer this small builder over elaborate tuple inference. Do not support
both syntaxes. Factory callbacks receive only earlier typed `selected` values;
runtime definitions retain fixed key order and serialize no functions.

Keep the existing `interaction.submit` command, interactionId, params,
clientActionId and hidden basis. Ordinary params contain all independent inputs;
step params contain exactly the current named value. Reject extra/future keys.
Add only `interaction.cancel` with the same identity/basis fields and no params.
Do not introduce select/execute variants or a client-managed cursor.

## Minimal state and evaluation

One runtime-owned pending map keyed by player stores interaction identity and an
ordered values array. Derive the current index from array length; do not persist
another cursor or selected-object copy. Pending is separate from simultaneous
sealed submissions and author-owned private state.

One ordered evaluator resolves each collector against current authoritative
state and the preceding valid selections, checks schema/cardinality/domain, and
stops at the first invalid value. Reconciliation keeps that prefix. Multi-value
steps are atomic; nullable optional output uses explicit JSON null. Reject
duplicate keys when constructing definitions and cover them in checked types.

Run reconciliation on every accepted authoritative result before persistence or
projection. Clear lost actor/interaction eligibility, and clear all pending at
every actual phase entry (including same-name and A→B→A in one dispatch).
Projection remains pure. A stale invalid prefix at command ingress rejects the
command rather than silently applying its value at an earlier index.

Non-final submissions append one validated value and commit without running the
authored reducer. While an actor has a pending prefix, that actor must finish or
cancel it before starting another interaction; other actors remain independent.
Final submissions revalidate all accumulated inputs, run final
rules and reducer once, then clear actor pending on success. Rejection preserves
the previous committed prefix and discards the final value, tx, RNG and events.
Aggregate rejection cannot identify an invalid prefix; retain it and allow cancel.
An empty next domain blocks progress but does not erase an otherwise valid prefix.
Cancel clears only the authenticated actor's matching unsealed pending choice;
do not require the old interaction to remain actionable to cancel it.

Use the existing rule distinction: `available` predicates apply during actor/
interaction eligibility checks; complete-params `validate` rules run at final
submission. Resolve a step domain using only its earlier committed values.
Do not enumerate future choices or run complete-params rules with partial input
to decide whether the current step can be shown.

## Privacy and simultaneous phases

Project only the selected seat's pending values/current domain. Never put the
all-seat map into shared view, public progress, events, or browser diagnostics.
The canonical frame materializer must select that seat before crossing an iframe
or socket boundary. Validate persisted state and wire commands at their boundaries.

Hearts input remains an independent atomic multi-card input. For any stepped
simultaneous interaction, completion seals the actor's complete params and clears
only its pending prefix. Reconciliation must not delete earlier sealed inputs
when those actors become unavailable. A final actor resolver rejection preserves
earlier seals and that actor's pre-final prefix; no cancellation of sealed inputs
is added. Preserve the existing resubmission policy.

Hex moveBandits uses two steps. When no victim exists, the second domain contains
an enabled explicit null choice. A victim becoming invalid only truncates the
affected suffix. Defaults are suggestions, never automatic user commits.
Supply trade keeps independent inputs and its existing different-resource rule.

## Owners and migration

Follow the direct executor and phase-entry function produced by 002; do not add
a second loop. Update runtime model, input codec/state serialization, authoritative
schema inputs, collector validation/descriptor/projection, and generated outputs.
Replace production dependency enumeration with current-domain resolution. Testing
exploration can traverse ordered steps through the same resolver with a bounded
enumeration budget; production availability must not depend on that budget.

Migrate the existing UI submit owners (bound interactions, board interactions,
hand intent and draft readiness) sufficiently to keep the stack executable before
004/005 replace them. Retain only the current step's unfinished local value.
Do not submit all old dependent params or replay them invisibly as multiple commits.
Migrate authored scenarios and packed examples with the contract change.

External public/internal hosts later adopt the new command schema/version. Each
accepted step persists before broadcast. Reconnect/fresh workers load saved
pending/RNG values. Restore copies the checkpoint state and gets a fresh host
revision; it never initializes phases or replays commands to reconstruct choices.

## Proof

Checked type tests: earlier-only choices, complete final params, nullable outputs,
duplicate keys, mutually exclusive inputs/steps. Runtime tests: valid-prefix
retention under unrelated/relevant board changes; all actual phase boundaries;
private two-seat projection; cancel; rejection/RNG rollback; simultaneous sealing;
nullable no-victim Hex; serialized round trip; both reference games.

Run focused tests then `pnpm check`, including packed references. Root and an
independent reviewer inspect the frozen diff before commit and stacked submission.
Carry external host persistence/history proof into the final adoption checklist.

## Implementation receipt

The hard cut replaces dependency declarations and eager/lazy projection with
ordered `phase.steps()` definitions. One prefix evaluator owns normalization,
schema and domain validation, current-step discovery and suffix reconciliation.
Runtime pending state contains only phase-local interaction identity and raw
ordered values. Persisted entries must name an authored stepped interaction and
remain unfinished; restore does not evaluate factories.

Final parsed values pass directly into ordinary or simultaneous execution.
Validation receives client parameters; reduction additionally receives trusted
sampled RNG collectors. Client schemas and sampled collector schemas each parse
once. Invalid sampled values reject normally without publishing RNG or state.
Actual phase entries clear pending prefixes, including same-name and A→B→A
entries. Rejected final resolutions preserve earlier seals and the actor's
pre-final prefix. Cancel uses the existing basis/action identity boundary.

Hex Bandits commits a destination, then a victim or explicit null. Browser
controls retain only the current draft and require a fresh intent after each
commit. Cancel also works when the pending current domain is blocked. Supply
Depot and offerTrade retain independent inputs. Scenario exploration uses the
same authorized current-collector schema for dynamic seat-reference conversion.

Verification:

- `pnpm check` passed: SDK 89 files / 656 tests, reducer wire 80 tests, plugin
  protocol 11 tests, repository scripts 32 tests, all build/type/lint/format and
  generation checks, package verification and both packed reference games.
- Workspace Hearts: 28 tests; Hex: 33 tests, including deterministic complete
  games, private projections, atomic resource rules and explicit nullable steps.
- Real Chromium Hex workflow: 2 browser tests with physical board/choice/cancel
  input, reducer-derived protocol tapes and exact command/basis digest checks.
- After the full gate, the RNG schema rejection code was aligned with existing
  `invalid-action-params`; 46 focused runtime and committed-step tests passed again.
- Checked authoring proofs cover earlier-only selected values, complete reducer
  parameters, one-key client commands, nullable outputs, duplicate keys, RNG
  exclusion from steps and validation, and mutually exclusive inputs/steps.

The two existing usePanZoom hook lint warnings remain. JSON schema edits use the
required repository formatter while preserving compact unchanged definitions;
there is no schema formatting bypass. Packed reference installs continue using
global pnpm 12.5.1 inside temporary copies, while the repository gate runs pinned
pnpm 10.4.1; layer 007 owns this previously recorded tooling quirk.

Next integration is layer 003b: plain player records and the canonical SDK-owned
runtime schema/model authority. External host persistence/history verification
remains part of adoption, not this isolated SDK slice.

Root integrated the reviewed source as `1542dd0` after the registry foundation.
Independent proof passed 54 step/runtime/codec tests and all 14 export tests.
The combined `pnpm check` passed, including both packed reference games
(`/tmp/steps-integrated-check-retry.log`). Its first run hit the existing five-second
dynamic import timeout under parallel load; the isolated export tests passed in
under a second, and the complete gate passed with `TURBO_CONCURRENCY=1`.
