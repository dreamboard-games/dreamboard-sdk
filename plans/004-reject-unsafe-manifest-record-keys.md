# 004 Reject Unsafe Manifest Record Keys

- Status: Proposed
- Priority: P0
- Risk: High
- Effort: Medium
- Primary owner: Codegen
- Depends on: 003
- Planned at: `d84c620`

## Summary

Reject prototype-sensitive manifest identifiers and property names before they
are used as ordinary JavaScript object keys. Add defense-in-depth
null-prototype accumulators and detect generated handle-key collisions.

## Current State

Manifest analysis uses `Map` in several places, but materialization eventually
assigns authored IDs into ordinary objects:

```ts
cards[cardId] = {
  /* ... */
};
componentLocations[cardId] = {
  /* ... */
};
boardStatesById[runtimeBoardId] = boardState;
```

An authored key such as `__proto__` can mutate an accumulator's prototype
instead of creating a normal own property. Current duplicate validation does
not reject `__proto__`, `prototype`, or `constructor`.

Generated handle keys can also collide after `toHandleKey`, even when source
IDs are distinct.

## Scope

### In scope

- validation for every manifest value that becomes a record key;
- recursive property-schema key validation;
- generated runtime ID validation;
- handle-key collision validation;
- null-prototype materialization accumulators;
- regression tests proving no silent key disappearance.

### Out of scope

- arbitrary restrictions on display names or descriptions;
- replacing every public `Record` type with `Map`;
- renaming valid IDs automatically.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-004-safe-record-keys
```

Commit:

```text
Reject unsafe manifest record keys
```

## Implementation Steps

### 1. Define one reserved-key policy

Add a shared validator in `manifest-validation.ts`:

```ts
const PROTOTYPE_SENSITIVE_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

function validateRecordKey(
  value: string | null | undefined,
  path: string,
): string[] {
  if (!value || !PROTOTYPE_SENSITIVE_KEYS.has(value)) return [];
  return [
    `${path}: '${value}' is reserved and cannot be used as a generated record key.`,
  ];
}
```

Do not normalize or silently rewrite the value.

### 2. Cover all ID families that become keys

Validate source and expanded runtime IDs for:

- card sets, card types, and expanded card instance IDs;
- zones and resources;
- board templates, board IDs, runtime board IDs, spaces, containers,
  relations, edges, and vertices;
- piece/die types, expanded seed IDs, and slot IDs;
- setup options, choices, and profiles;
- object-schema property names at every nesting level.

Use helper functions so future ID families cannot bypass the policy:

```ts
function collectKeyIssues(
  entries: ReadonlyArray<{ value?: string | null; path: string }>,
): string[] {
  return entries.flatMap(({ value, path }) => validateRecordKey(value, path));
}
```

### 3. Detect generated handle collisions

Validate the derived handle keys before rendering:

```ts
function collectHandleKeyCollisions(
  values: readonly string[],
  label: string,
): string[] {
  const idsByHandle = new Map<string, string[]>();
  for (const value of values) {
    const handle = toHandleKey(value);
    idsByHandle.set(handle, [...(idsByHandle.get(handle) ?? []), value]);
  }
  return [...idsByHandle]
    .filter(([, ids]) => ids.length > 1)
    .map(
      ([handle, ids]) =>
        `${label} values ${ids.join(", ")} all generate handle '${handle}'.`,
    );
}
```

Cover at least generated `cardTypes` and `zones`, and any future handle object
families.

### 4. Use null-prototype accumulators in materialization

Create a local helper:

```ts
function createRecord<Value>(): Record<string, Value> {
  return Object.create(null) as Record<string, Value>;
}

const cards = createRecord<RuntimeCardData>();
const componentLocations = createRecord<RuntimeComponentLocation>();
const boardStatesById = createRecord<Record<string, unknown>>();
```

Use this for mutation-heavy dictionaries. `Object.fromEntries` outputs are
acceptable after validation because they create own data properties, but keep
the reserved-key rejection as the primary contract.

### 5. Assert expected materialization cardinality

After card and seed materialization:

```ts
if (Object.keys(cards).length !== analysis.cardIds.length) {
  throw new Error(
    "Materialized card record cardinality drifted from analysis.",
  );
}
```

Add equivalent assertions where a silent overwrite would otherwise be
possible.

## Test Plan

Add validation cases for each reserved key in:

- card type;
- expanded seed ID;
- zone ID;
- board/space ID;
- setup option ID;
- nested property-schema key.

Add a handle collision case such as two IDs that normalize to the same handle.

Prove materialization never silently succeeds:

```ts
const validation = validateManifestAuthoring(unsafeManifest);
expect(validation.errors).toContainEqual(expect.stringContaining("__proto__"));
expect(() =>
  materializeManifestTable({ manifest: unsafeManifest, ...options }),
).toThrow();
```

Commands:

```sh
pnpm --filter @dreamboard-games/workspace-codegen test
pnpm --filter @dreamboard-games/workspace-codegen typecheck
pnpm check
```

## Done Criteria

- Reserved keys are rejected before generation or materialization.
- Nested property schemas follow the same policy.
- Generated handle collisions are actionable validation errors.
- Materialization accumulators cannot be prototype-mutated.
- Runtime record cardinality matches analyzed IDs.

## STOP Conditions

- Stop if an existing published example uses a reserved key. Treat it as an
  explicit breaking migration and update the example plus release notes.
- Stop if validation and materialization disagree on the expanded runtime ID.
  Move expansion into a shared helper before proceeding.

## Maintenance

All new manifest ID families and generated handle families must register with
the central key-validation helpers.
