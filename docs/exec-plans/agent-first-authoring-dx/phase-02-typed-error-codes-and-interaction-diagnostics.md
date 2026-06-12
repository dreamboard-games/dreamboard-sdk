# Phase 2: Typed Error Codes And Interaction Diagnostics

## Objective

Make rejection and unavailability **self-describing and typo-proof**:

1. Error codes become a contract-declared literal union, declared once per
   rule (no duplicate `errorCode` in `validate` returns).
2. The trusted bundle's availability classification stops string-matching
   prose and becomes structured (`ruleId` + `code`).
3. A first-class `explain` diagnostic answers the #1 agent debugging question
   — "why can't player X submit interaction Y?" — in one call from the test
   runtime and the dev host.

All changes are additive: `errorCode` remains `string`-compatible for
contracts that do not declare an error map, and the wire change is an
optional field.

## Background

Current state, with file evidence:

- `InteractionRule.errorCode: string`
  (`packages/sdk/src/reducer/model/spec/interactions.ts:92`) — any typo is a
  new error code.
- `interaction-descriptor.ts:219` classifies availability by comparing
  `decision.unavailableReason === "Not your turn"` and
  `=== "INSUFFICIENT_RESOURCES"` — prose strings as control flow. Renaming a
  message silently changes UI availability semantics.
- frontier-trails declares every code twice (rule-level and in the `validate`
  return object), although `InteractionRuleValidationResult` already accepts
  `boolean` — the single-declaration style exists but is undocumented and
  untyped.
- Scenario tests hand-roll availability forensics
  (`interactions(playerId).find(...)` + `availability.status` poking) because
  there is no `explain`.

## Proposed Fix

### 2A. Contract-Level Error Map

`defineGameContract` accepts an optional `errors` record (code → default
message). Codes are UPPER_SNAKE by convention (validated at runtime like
phase names are today):

```ts
// app/game-contract.ts
export const gameContract = defineGameContract({
  manifest: manifestContract,
  state: { public: publicStateSchema, private: privateStateSchema, hidden: hiddenStateSchema },
  phases: { setup: setupPhaseStateSchema, playerTurn: playerTurnPhaseStateSchema, /* ... */ },
  errors: {
    DICE_NOT_ROLLED: "Roll the dice before taking actions.",
    INSUFFICIENT_RESOURCES: "You cannot afford this action.",
    TRADE_NOT_PENDING: "No trade offer is waiting for a response.",
    NO_DETACHED_PIECE: "You have no pieces of that type left to place.",
  },
});
```

Type plumbing (in `model/extract.ts` + `authoring/types.ts`):

```ts
export type ErrorCodeOfContract<Contract> = Contract extends {
  errors: infer Errors extends Record<string, string>;
}
  ? keyof Errors & string
  : string; // contracts without an error map keep today's behavior
```

`InteractionRule`, `InteractionSpec` (for `reject(...)` inside `reduce`), and
the authoring factories thread `ErrorCodeOfContract<Contract>` through. With
the phase-1 bound factories this is invisible to authors — the bound
`playerTurn.rule({...})` simply red-squiggles a code that is not in the map:

```ts
playerTurn.rule({
  id: "dice-rolled",
  errorCode: "DICE_NOT_ROLED", // ts(2322): not assignable to "DICE_NOT_ROLLED" | ...
  available: ({ state }) => state.phase.diceRolled,
});
```

Reserved framework codes (`NOT_YOUR_TURN`, `WRONG_PHASE`, `WRONG_STEP`,
`INVALID_PARAMS`, `UNKNOWN_INTERACTION`, `INTERNAL_ERROR`) are exported as a
const object and merged into the accepted union so contracts never redeclare
them:

```ts
// packages/sdk/src/reducer/model/error-codes.ts (new)
export const FrameworkErrorCodes = {
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  WRONG_PHASE: "WRONG_PHASE",
  WRONG_STEP: "WRONG_STEP",
  INVALID_PARAMS: "INVALID_PARAMS",
  UNKNOWN_INTERACTION: "UNKNOWN_INTERACTION",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type FrameworkErrorCode = keyof typeof FrameworkErrorCodes;
```

### 2B. Single-Declaration Rules And Dynamic Messages

Extend `InteractionRuleValidationResult` with `string` (= fail with the
rule's code and this message):

```ts
export type InteractionRuleValidationResult<ErrorCode extends string = string> =
  | boolean        // false => rule errorCode + rule/contract message
  | string         // fail  => rule errorCode + this message          (NEW)
  | ValidationIssue<ErrorCode>
  | null
  | undefined;
```

Message resolution order on failure: `validate`-returned message →
rule `message` → contract `errors[code]` default. The duplicated style keeps
working; docs, scaffolds, and examples move to:

```ts
{
  id: "can-afford-camp",
  errorCode: "INSUFFICIENT_RESOURCES",
  validate: ({ input, q }) =>
    q.player.canAfford(input.playerId, COST_OUTPOST) ||
    `Need ${formatCost(COST_OUTPOST)}.`,
}
```

### 2C. Structured Availability Decisions

Replace the prose comparison in
`packages/sdk/src/reducer/bundle/trusted/interaction-descriptor.ts` and the
decision producers (`interaction-decision.ts`, `interaction-authorization.ts`)
with a structured shape:

```ts
type InteractionDecision =
  | { available: true }
  | {
      available: false;
      code: string;          // contract or framework error code
      ruleId?: string;       // author rule that failed, when applicable
      message?: string;
    };
```

`interactionAvailabilityFromDecision` then switches on `code`:

```ts
if (decision.available) return { status: "available" };
switch (decision.code) {
  case FrameworkErrorCodes.NOT_YOUR_TURN:
    return { status: "notYourTurn", reason: decision.message ?? decision.code };
  case "INSUFFICIENT_RESOURCES":
    return { status: "insufficientResources", reason: decision.message ?? decision.code };
  default:
    return { status: "blocked", reason: decision.message ?? decision.code };
}
```

`unavailableReason?: string` stays populated (same strings as today) so the
UI surface and wire consumers see no behavioral change; it is now derived
from `code`/`message` instead of being the source of truth.

### 2D. `explain` Diagnostic

New bundle capability, computed from machinery that already exists
(authorization decision, rule evaluation, collector eligibility in
`collector-domains.ts` / `collector-eligibility.ts`):

```ts
export type InteractionExplanation = {
  interactionId: string;
  phase: string;
  step: string | null;
  availability: "available" | "notYourTurn" | "wrongPhase" | "wrongStep" | "blocked";
  /** Rules evaluated at projection time, in declaration order. */
  rules: ReadonlyArray<{
    ruleId: string;
    outcome: "passed" | "failed" | "notEvaluated";
    errorCode?: string;
    message?: string;
  }>;
  actor: { required: readonly string[]; playerIsActor: boolean };
  /** Per-input eligible-target counts — catches "rule passes, zero targets". */
  inputs: ReadonlyArray<{ key: string; kind: string; eligibleCount: number | "lazy" }>;
};
```

Exposure points:

1. **Bundle contract** (`reducer/bundle/trusted-bundle.ts`): add
   `explainInteraction(playerId, interactionId): InteractionExplanation`.
   This is part of the trusted bundle's JS surface, not the wire ABI — the
   gameplay executor never calls it; the test runtime and dev host do.
2. **Test runtime** (`packages/sdk/src/testing/create-test-runtime.ts`):

   ```ts
   const why = ctx.explain(playerId, "buildCamp");
   expect(why.availability).toBe("available");
   // on failure, the assertion message prints the full explanation
   ```

   `create-expect-api.ts` gains a matcher that embeds the explanation in
   failure output, so a failing scenario shows *which rule* failed without
   any extra authoring:

   ```text
   expect(interaction "buildCamp" for player-1).toBeAvailable()
     availability: blocked
     rule can-afford-camp FAILED (INSUFFICIENT_RESOURCES): Need 1 timber + 1 clay + 1 grain + 1 cloth.
     rule dice-rolled passed
     inputs: vertexId eligibleCount=3
   ```

3. **Descriptor (wire-additive, optional)**: `InteractionDescriptor`
   availability gains `reasons?: ReadonlyArray<{ ruleId: string; errorCode: string }>`,
   emitted only when the bundle is created with
   `createReducerBundle(game, { diagnostics: "verbose" })` — the dev host
   enables it; production projections stay byte-identical to today.
   `reducer-contract` JSON schema bump is additive; conformance fixtures gain
   one verbose-mode case. Kotlin backend: tolerant reader, no change required.

### 2E. Reducer-Support Style Update

`reject(...)` in `reduce` callbacks accepts the typed code; examples replace
`throw new Error("No camp piece found to upgrade.")` with
`return reject("NO_DETACHED_PIECE")` where the situation is a game-rule
outcome rather than an invariant violation. (Genuine invariants keep
throwing; the dispatch layer maps uncaught throws to `INTERNAL_ERROR`.)

## Files Touched

- `packages/sdk/src/reducer/authoring/contract.ts` (errors map + validation)
- `packages/sdk/src/reducer/model/spec/interactions.ts`,
  `model/extract.ts`, `model/error-codes.ts` (new)
- `packages/sdk/src/reducer/bundle/trusted/interaction-decision.ts`,
  `interaction-authorization.ts`, `interaction-descriptor.ts`,
  `interaction-resolver.ts`, `trusted-bundle.ts`
- `packages/sdk/src/testing/create-test-runtime.ts`,
  `create-expect-api.ts`, `definitions.ts`
- `packages/reducer-contract/schema/*.json` + `generated/` (additive field)
- `packages/workspace-codegen` (scaffold contract template gains an `errors`
  stub; testing-contract template gains `ctx.explain` typing)
- Examples + skill docs (cross-repo): single-declaration rule style,
  `errors` map, `explain` usage in the testing reference

## Verification

- Unit: decision producers return structured codes for every rejection path
  (not-actor, wrong phase, wrong step, rule fail, invalid params, zero
  eligible targets); `interactionAvailabilityFromDecision` snapshot equality
  against the current prose-derived statuses for the frontier-trails fixture
  set (no UI-visible behavior change).
- Type tests: contract with `errors` rejects unknown codes in rules,
  `reject()`, and `ValidationIssue`; contract without `errors` still accepts
  arbitrary strings.
- `harness:contract` (private monorepo) for the wire-additive field.
- Scenario proof: rewrite one frontier-trails scenario
  (`every-action-authorization.scenario.ts`) using `ctx.explain` and confirm
  failure output quality manually.

## Acceptance Criteria

- No prose string comparison remains in `bundle/trusted/*` (grep gate:
  `unavailableReason ===`).
- A typo'd error code in a workspace with an `errors` map is a compile error.
- A failing `toBeAvailable()` assertion prints rule-level diagnosis with zero
  additional authoring.
- Production (non-verbose) projections are byte-identical before/after
  (characterization snapshot, reuse the 0.3.0 grid-snapshot pattern).

## Risks

- Threading `ErrorCode` through `InteractionSpec` adds a type parameter to a
  heavily-used generic. Mitigate by defaulting it (`= string`) so all
  existing call sites and the curried factories are untouched, and binding it
  only inside the phase-1 bound factories.
- `explain` runs rule `available` callbacks out-of-band; rules must already
  be pure (they run at projection time today), but document that `explain`
  may observe `available` being called more often.
- Verbose descriptor mode must never ship in production projections —
  enforce with a test asserting default-mode output contains no `reasons`
  key.
