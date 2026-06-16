# 009 Validate and Bound Recursive Payloads

- Status: Implemented
- Priority: P1
- Risk: High
- Effort: Large
- Primary owner: SDK runtime + reducer ABI
- Depends on: 008
- Planned at: `d84c620`

## Summary

Consolidate JSON-like runtime payload validation and impose structural budgets
before recursive parsing, canonicalization, or state application. Malformed or
pathologically deep data must fail deterministically instead of exhausting
the JavaScript stack or consuming unbounded work.

## Current State

Recursive payload definitions and traversals are duplicated across:

- `packages/sdk/src/reducer/ingress/runtime-payload.ts`;
- `packages/sdk/src/reducer/ingress/session-codec.ts`;
- `packages/sdk/src/runtime/browser-interaction/canonical.ts`;
- `packages/sdk/src/runtime/browser-interaction/schemas.ts`;
- plugin state synchronization schemas.

The current recursive Zod schemas and canonicalization functions have no
explicit depth, node, string, or collection limits. Plugin state validation is
also shallow relative to the full `PluginStateSnapshot` model.

## Contract Decision

Use JSON-compatible values only:

```ts
type RuntimeJson =
  | null
  | boolean
  | number
  | string
  | RuntimeJson[]
  | { [key: string]: RuntimeJson };
```

Reject `undefined`, non-finite numbers, functions, symbols, bigint, cycles,
class instances, and non-plain objects.

Start with two explicit profiles:

```ts
export const TRANSPORT_JSON_LIMITS = {
  maxDepth: 64,
  maxNodes: 100_000,
  maxStringBytes: 1_048_576,
  maxCollectionEntries: 50_000,
} as const;

export const BROWSER_ATTRIBUTE_JSON_LIMITS = {
  maxDepth: 32,
  maxNodes: 10_000,
  maxStringBytes: 65_536,
  maxCollectionEntries: 5_000,
} as const;
```

Before landing these values, measure the largest existing fixtures and real
development payloads. If any valid payload exceeds 50 percent of a limit,
stop and choose an evidence-based threshold with adequate headroom.

## Scope

### In scope

- one canonical runtime JSON schema;
- iterative structural budget validation;
- full plugin state snapshot parsing;
- browser interaction attribute encoding/decoding;
- deterministic error reporting;
- no-state-change behavior for rejected payloads.

### Out of scope

- binary payload support;
- streaming transport;
- arbitrary object serialization;
- changing the plugin state domain model.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-009-bounded-payloads
```

Commit:

```text
Validate and bound recursive runtime payloads
```

## Implementation Steps

### 1. Add an iterative structural budget check

Place the helper in a dependency-light runtime utility module:

```ts
type JsonLimits = {
  maxDepth: number;
  maxNodes: number;
  maxStringBytes: number;
  maxCollectionEntries: number;
};

export function assertJsonWithinLimits(
  root: unknown,
  limits: JsonLimits,
  label: string,
): void {
  const stack: Array<{ value: unknown; depth: number }> = [
    { value: root, depth: 0 },
  ];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let stringBytes = 0;
  let collectionEntries = 0;

  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (++nodes > limits.maxNodes) {
      throw new Error(`${label} exceeds the node limit.`);
    }
    if (depth > limits.maxDepth) {
      throw new Error(`${label} exceeds the depth limit.`);
    }

    if (typeof value === "string") {
      stringBytes += new TextEncoder().encode(value).byteLength;
      if (stringBytes > limits.maxStringBytes) {
        throw new Error(`${label} exceeds the string-byte limit.`);
      }
      continue;
    }

    if (value === null || typeof value !== "object") continue;
    if (seen.has(value)) throw new Error(`${label} contains a cycle.`);
    seen.add(value);

    const children = Array.isArray(value)
      ? value
      : Object.entries(requirePlainObject(value)).flat();
    collectionEntries += children.length;
    if (collectionEntries > limits.maxCollectionEntries) {
      throw new Error(`${label} exceeds the collection-entry limit.`);
    }
    for (const child of children) {
      stack.push({ value: child, depth: depth + 1 });
    }
  }
}
```

The production implementation should avoid counting object keys as payload
nodes twice unless that is explicitly documented. Keep tests aligned with the
chosen counting semantics.

### 2. Reject non-JSON primitives during the iterative pass

Validate primitives before continuing:

```ts
if (typeof value === "number" && !Number.isFinite(value)) {
  throw new Error(`${label} contains a non-finite number.`);
}
if (
  value !== null &&
  !["boolean", "number", "string", "object"].includes(typeof value)
) {
  throw new Error(`${label} contains a non-JSON value.`);
}
```

`requirePlainObject` accepts only objects whose prototype is
`Object.prototype` or `null`. Reject `Date`, `Map`, `Set`, typed arrays, and
class instances.

### 3. Consolidate the canonical runtime JSON schema

Define one recursive schema after the budget helper protects traversal:

```ts
export const RuntimeJsonSchema: z.ZodType<RuntimeJson> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(RuntimeJsonSchema),
    z.record(z.string(), RuntimeJsonSchema),
  ]),
);

export function parseTransportJson(value: unknown): RuntimeJson {
  assertJsonWithinLimits(value, TRANSPORT_JSON_LIMITS, "Runtime payload");
  return RuntimeJsonSchema.parse(value);
}
```

Use this schema from runtime input, session codec, plugin message payloads, and
other transport boundaries. Delete local copies.

### 4. Parse the complete plugin state snapshot

Build a strict schema matching the actual `PluginStateSnapshot`, including:

- gameplay state;
- session state;
- lobby state;
- notifications;
- history;
- sync ID;
- view payload;
- domain descriptors and nested costs/default values where present.

Example shape:

```ts
const PluginStateSnapshotSchema = z
  .object({
    gameplay: GameplayStateSchema,
    session: SessionStateSchema,
    lobby: LobbyStateSchema,
    notifications: z.array(NotificationSchema),
    history: z.array(HistoryEntrySchema),
    syncId: z.string().min(1),
    view: RuntimeJsonSchema,
  })
  .strict();
```

Apply `assertJsonWithinLimits` to the whole envelope before Zod parsing. Do not
trust a valid outer discriminator while leaving `state.view` unbounded.

### 5. Bound browser interaction attribute processing

Before recursive canonicalization or JSON encoding:

```ts
assertJsonWithinLimits(
  attributeValue,
  BROWSER_ATTRIBUTE_JSON_LIMITS,
  "Browser interaction attribute",
);
```

Apply the same profile on decode. Replace duplicate JSON schemas in
`browser-interaction/schemas.ts` with the shared canonical schema plus the
browser-specific budget.

The budget check must run before any recursive function so deeply nested input
cannot cause `RangeError`.

### 6. Reject invalid payloads before state mutation

Inbound plugin processing order:

1. budget the raw message data;
2. parse the authenticated phase-008 envelope;
3. verify channel;
4. parse the full payload/state schema;
5. apply state or resolve a request.

If any step fails, retain the previous state and pending request status. Emit a
bounded diagnostic that does not stringify the entire rejected payload.

### 7. Add stable error categories

Use a small error class or code union:

```ts
type JsonValidationCode =
  | "cycle"
  | "depth"
  | "nodes"
  | "string-bytes"
  | "collection-entries"
  | "non-json";
```

Tests should assert the category rather than brittle full text. Diagnostics
may include the boundary label and observed count, but not arbitrary payload
contents.

## Test Plan

For each profile test:

- exactly at each limit succeeds;
- one over each limit fails;
- nesting beyond the depth limit throws a validation error, not `RangeError`;
- a direct and indirect cycle fails;
- `Date`, `Map`, `Set`, bigint, function, symbol, `undefined`, `NaN`, and
  infinity fail;
- a null-prototype record succeeds;
- multibyte strings are counted in UTF-8 bytes.

Plugin state tests:

- missing top-level domain;
- extra top-level field;
- malformed nested notification, history, gameplay, or lobby entry;
- oversized `view`;
- rejected sync does not update the current snapshot;
- rejected submit result does not settle a request.

Browser tests:

- bounded round trip for valid nested attributes;
- oversized encode and decode;
- deep input fails before recursive canonicalization.

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- runtime-payload
pnpm --filter @dreamboard-games/sdk test -- browser-interaction
pnpm --filter @dreamboard-games/sdk test -- plugin
pnpm --filter @dreamboard-games/sdk typecheck
pnpm check
```

## Done Criteria

- One runtime JSON schema serves all transport boundaries.
- Structural budgets execute before recursive parsing or canonicalization.
- Full plugin state snapshots are strictly validated.
- Invalid or oversized payloads cannot mutate state or settle requests.
- Tests prove deterministic failure at every limit.
- Limits are backed by fixture or development-payload measurements.

## STOP Conditions

- Stop if existing valid payloads approach the proposed limits. Capture
  measurements and revise thresholds before enforcing them.
- Stop if a required domain value is not JSON-compatible. Define an explicit
  wire encoding for that value instead of permitting arbitrary objects.
- Stop if the budget helper itself recursively traverses input. Keep it
  iterative.

## Maintenance

New recursive transport surfaces must declare which budget profile they use
and call the iterative check before schema parsing.
