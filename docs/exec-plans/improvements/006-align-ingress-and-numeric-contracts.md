# 006 Align Ingress and Numeric Mutation Contracts

- Status: Implemented
- Priority: P0
- Risk: High
- Effort: Medium
- Primary owner: Reducer ABI
- Depends on: 001
- Planned at: `d84c620`

## Summary

Make runtime ingress match the generated reducer contract and define one
non-negative safe-integer policy for resource amounts and deal counts. Reject
invalid inputs before state mutation instead of defaulting or silently
skipping them.

## Current State

`packages/sdk/src/reducer/ingress/input-codec.ts` duplicates the generated input
schema and currently:

- permits an empty `interactionId`;
- defaults omitted `params` to `{}`;
- does not inherit strict-object behavior from
  `ContractZod.GameInputSchema`.

The canonical generated contract requires non-empty IDs and a present `params`
record.

Numeric reducer helpers are also inconsistent:

- some resource loops silently skip non-number or non-positive values;
- add/spend reject only values less than zero, allowing `NaN`, `Infinity`, and
  fractions;
- set validates finiteness but not integer or safe-integer range;
- deal loops do not validate count and can behave unpredictably for fractional
  or infinite values.

## Contract Decision

- `GameInput.params` remains required.
- `playerId` and `interactionId` remain non-empty.
- ingress objects remain strict.
- resource amounts and deal counts are non-negative safe integers.
- invalid numeric values throw before any mutation.

## Scope

### In scope

- reducer input decoding;
- runtime record type alignment;
- resource affordability, addition, spending, and setting;
- card deal counts;
- self-deal rejection where source and destination are identical;
- deterministic validation errors and no-partial-mutation tests.

### Out of scope

- fractional currencies;
- bigint resources;
- changing generated wire field names;
- adding defaults for historical payloads.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-006-ingress-numeric-contracts
```

Commit:

```text
Align reducer ingress and numeric contracts
```

## Implementation Steps

### 1. Parse the generated contract before manifest refinement

Replace the handwritten top-level input shape with the canonical schema:

```ts
export function decodeGameInput(
  value: unknown,
  manifest: RuntimeManifest,
): GameInput {
  const input = ContractZod.GameInputSchema.parse(value);
  const playerId = requireManifestPlayerId(manifest, input.playerId);

  return {
    ...input,
    playerId,
  };
}
```

If authored parameter schemas add interaction-specific validation, apply them
after the generated wire shape succeeds. Do not copy the wire schema into a
second Zod object.

### 2. Remove the missing-params compatibility default

Delete `.default({})` and update the existing runtime-codec test that currently
expects missing parameters to become an empty object.

Required behavior:

```ts
expect(() =>
  decodeGameInput(
    {
      playerId: "p1",
      interactionId: "draw-card",
    },
    manifest,
  ),
).toThrow();
```

Document this as a hard contract correction in phase 013 release notes.

### 3. Align runtime records with JSON payload semantics

Where the model currently allows undefined values:

```ts
type RuntimeRecord = Record<string, RuntimePayload | undefined>;
```

change it to:

```ts
type RuntimeRecord = Record<string, RuntimePayload>;
```

Callers omit absent keys instead of storing `undefined`. This matches the
canonical JSON-compatible payload contract and phase 009's shared schema.

### 4. Add one numeric assertion

Place the helper in a reducer utility module shared by resource and card
mutations:

```ts
export function assertNonNegativeSafeInteger(
  value: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}
```

Do not coerce strings, round fractions, clamp values, or convert non-finite
values to zero.

### 5. Validate every resource operation consistently

Use the assertion for:

- `canAfford`;
- `getMissingResources`;
- add;
- spend;
- set;
- multi-resource iteration helpers.

`forEachResourceEntry` may skip `undefined` and zero, but all other provided
values must validate:

```ts
for (const [resourceId, amount] of Object.entries(amounts)) {
  if (amount === undefined || amount === 0) continue;
  assertNonNegativeSafeInteger(amount, `Resource '${resourceId}' amount`);
  callback(resourceId, amount);
}
```

Check resulting balances with `Number.isSafeInteger` as well. Reject overflow
before assigning the result.

### 6. Validate deal counts before selecting or moving cards

At each public deal operation boundary:

```ts
assertNonNegativeSafeInteger(count, "Deal count");
```

Zero is a valid no-op. Reject a player-zone self-deal:

```ts
if (
  sourceZoneId === destinationZoneId &&
  sourcePlayerId === destinationPlayerId
) {
  throw new Error("Deal source and destination must differ.");
}
```

This avoids an infinite or semantically ambiguous remove-and-reappend loop.

### 7. Keep validation ahead of mutation

For resource batches and card deals:

1. validate every supplied number;
2. validate all IDs and source/destination rules;
3. calculate the resulting balances or selected card IDs;
4. mutate only after the complete operation is known valid.

Use local calculated records where necessary:

```ts
const nextBalances = Object.fromEntries(
  entries.map(([resourceId, amount]) => {
    const next = current[resourceId] + amount;
    assertNonNegativeSafeInteger(next, `Resource '${resourceId}' balance`);
    return [resourceId, next];
  }),
);

Object.assign(current, nextBalances);
```

## Test Plan

Ingress tests:

- omitted `params`;
- empty `playerId`;
- empty `interactionId`;
- unknown top-level key;
- malformed parameter payload;
- valid generated contract plus manifest-specific player refinement.

Numeric table-driven cases:

```ts
const invalidAmounts = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  -1,
  0.5,
  Number.MAX_SAFE_INTEGER + 1,
];
```

Apply them to resource add, spend, set, affordability checks, and every deal
entry point. Also test:

- zero as a no-op;
- a valid maximum-safe value where no arithmetic overflow occurs;
- overflow caused by adding to an existing balance;
- self-deal rejection;
- no state change after any failed batch or deal.

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- runtime-codec
pnpm --filter @dreamboard-games/sdk test -- resource
pnpm --filter @dreamboard-games/sdk test -- card-mutations
pnpm --filter @dreamboard-games/sdk typecheck
pnpm check
```

## Done Criteria

- Ingress derives its wire shape from `ContractZod.GameInputSchema`.
- Missing `params`, empty IDs, and extra keys are rejected.
- Runtime records no longer admit `undefined` values.
- All resource amounts and deal counts use one safe-integer policy.
- Invalid numbers never cause partial mutation or unbounded loops.

## STOP Conditions

- Stop if a published caller sends omitted `params` or fractional resources.
  Record the caller and migration explicitly; do not add silent coercion.
- Stop if generated contract code cannot be imported without a dependency
  cycle. Move only the canonical schema boundary, not a duplicate definition.
- Stop if a valid operation can overflow a safe integer. Define a different
  persisted numeric representation before proceeding.

## Maintenance

All new reducer APIs accepting counts or resource quantities must call the
shared numeric assertion at their public boundary.
