# 00 — Field-schema experiment

Status: complete. Run against SDK `d3d1020` with TypeScript 6.0.3 and Zod
4.6.5. No code lands from this layer; [layer 01](01-field-schemas.md) implements
the result.

The question: can Zod replace the custom property-schema language, including
fields that reference manifest IDs, without weakening type inference?

## Constraints found

These come from the internal repository's compiler, which evaluates every
uploaded `manifest.ts`:

- **The manifest module must export plain JSON.** The Deno sandbox runs
  `assertJsonCompatible` on the default export and rejects functions, class
  instances with methods, promises, `undefined` and non-finite numbers
  (`packages/compiler-core/src/manifest/deno-manifest-evaluator.ts`, internal
  repo). Zod schema objects and callbacks cannot appear in the export.
- **The manifest may import only relative files and
  `@dreamboard-games/sdk/reducer`.** Authors cannot `import { z } from "zod"`.
  The SDK must re-export `z`; esbuild bundles Zod into the sandboxed reducer
  bundle.
- **The compiler validates the JSON against the public API schema first**
  (`zGameTopologyManifest.strict()` in
  `packages/compiler-core/src/manifest/materialize-authored-manifest.ts`) and
  only then calls `compileManifest`. A new field-schema format requires relaxing
  that check ([layer 09](09-internal-adoption.md), PR A).

So the design is: **author with Zod, export JSON Schema, validate at runtime
from JSON Schema.**

## A1 — Field callbacks inside the manifest literal: rejected

```ts
defineManifest({
  pieceSeeds: [{ id: "camp", typeId: "camp", count: 3 }],
  pieceTypes: [
    {
      id: "camp",
      name: "Camp",
      fields: ({ ids }) => z.object({ upgradedFrom: ids.pieceId.nullable() }),
    },
  ],
});
```

TypeScript cannot contextually type `ids` from the manifest being inferred:
`TS7031: Binding element 'ids' implicitly has an 'any' type`. The signature was
`defineManifest<const M>(manifest: M & Checked<NoInfer<M>>)`, matching the SDK's
current `defineTopologyManifest`. Splitting the manifest into one type
parameter per collection could enable intra-expression inference, but it
depends on property order and would restructure every manifest type. Not
pursued.

## A3 — ID marker schemas: accepted

Each ID family is a marker schema: a string branded in both directions, tagged
with JSON Schema metadata. A small type replaces the brand with the manifest's
real ID union.

```ts
const REF_KEY = "x-dreamboard-ref";

export const ref = {
  cardId: () =>
    z
      .string()
      .brand<"dreamboard:cardId", "inout">()
      .meta({ [REF_KEY]: "cardId" }),
  pieceId: () =>
    z
      .string()
      .brand<"dreamboard:pieceId", "inout">()
      .meta({ [REF_KEY]: "pieceId" }),
  zoneId: () =>
    z
      .string()
      .brand<"dreamboard:zoneId", "inout">()
      .meta({ [REF_KEY]: "zoneId" }),
};

type Families<M> = {
  cardId: CardIdOf<M>;
  pieceId: PieceIdOf<M>;
  zoneId: ZoneIdOf<M>;
};

// Match each brand explicitly: TypeScript cannot infer the family name back out
// of Zod's `$brand` key type, so `T extends $brand<`dreamboard:${infer F}`>` fails.
type RefFamily<T> =
  T extends z.core.$brand<"dreamboard:cardId">
    ? "cardId"
    : T extends z.core.$brand<"dreamboard:pieceId">
      ? "pieceId"
      : T extends z.core.$brand<"dreamboard:zoneId">
        ? "zoneId"
        : never;

export type Resolve<T, M> = T extends unknown
  ? [RefFamily<T>] extends [never]
    ? T extends readonly (infer U)[]
      ? Resolve<U, M>[]
      : T extends object
        ? { [K in keyof T]: Resolve<T[K], M> }
        : T
    : Families<M>[RefFamily<T>]
  : never;
```

Proof (all assertions pass):

```ts
const camp = z.object({
  level: z.int().min(1).default(1),
  upgradedFrom: ref.pieceId().nullable().optional(),
  homeZone: ref.zoneId(),
  history: z.array(ref.pieceId()),
});
type P = "bandits" | "camp-1" | "camp-2" | "camp-3";

type Out = Resolve<z.output<typeof camp>, M>;
// { level: number; upgradedFrom?: P | null | undefined; homeZone: "supply"; history: P[] }

type In = Resolve<z.input<typeof camp>, M>;
// { level?: number | undefined; upgradedFrom?: P | null | undefined; homeZone: "supply"; history: P[] }

// @ts-expect-error unknown zone
const bad: In = { homeZone: "stash", history: [] };
```

Defaults are optional in the input type and present in the output type, with
no SDK code. `Resolve` is the only custom type-level code, replacing both
current interpreters.

## C — Runtime round trip: accepted

```ts
const json = z.toJSONSchema(camp, { io: "input", unrepresentable: "throw" });
```

produces plain JSON that passes the sandbox:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "level": {
      "default": 1,
      "type": "integer",
      "minimum": 1,
      "maximum": 9007199254740991
    },
    "upgradedFrom": {
      "anyOf": [
        { "type": "string", "x-dreamboard-ref": "pieceId" },
        { "type": "null" }
      ]
    },
    "homeZone": { "type": "string", "x-dreamboard-ref": "zoneId" },
    "history": {
      "type": "array",
      "items": { "type": "string", "x-dreamboard-ref": "pieceId" }
    }
  },
  "required": ["homeZone", "history"]
}
```

At runtime the markers are replaced with the known IDs and Zod rebuilds a
validator:

```ts
export function validatorFromJson(
  schema: JsonFieldSchema,
  knownIds: Readonly<Record<string, readonly string[]>>,
): z.ZodType {
  const resolveRefs = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(resolveRefs);
    if (!node || typeof node !== "object") return node;
    const record = node as Record<string, unknown>;
    const family = record[REF_KEY];
    if (typeof family === "string") {
      const { [REF_KEY]: _ref, enum: _enum, ...rest } = record;
      return { ...rest, enum: [...(knownIds[family] ?? [])] };
    }
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, resolveRefs(value)]),
    );
  };
  return z.fromJSONSchema(
    resolveRefs(schema) as Parameters<typeof z.fromJSONSchema>[0],
  );
}
```

Results:

| Input                                                     | Result                                                |
| --------------------------------------------------------- | ----------------------------------------------------- |
| `{ homeZone: "supply", history: ["camp-1"] }`             | valid; output `{ level: 1, homeZone: "supply", ... }` |
| `{ homeZone: "stash", history: [] }`                      | rejected at path `homeZone`                           |
| `{ homeZone: "supply", history: [], level: 0 }`           | rejected                                              |
| `{ homeZone: "supply", history: [], upgradedFrom: null }` | valid                                                 |

Resolving markers at validation time is also where roster-derived IDs
([layer 05](05-per-player-inventory.md)) become concrete.

## Risks carried into layer 01

- **`z.fromJSONSchema` is marked semi-experimental** in Zod 4.6.5. Mitigate by
  pinning Zod exactly in the catalog and adding a round-trip conformance test
  for every supported construct, so an upgrade that changes behaviour fails CI.
- **Refinements are not representable.** `z.toJSONSchema` drops `.refine()`
  checks and `unrepresentable: "throw"` does not catch them. Validate authored
  values with the JSON-derived validator (never the original Zod object) so
  authoring and runtime always agree, and document that field schemas are data.
- **Type-check cost was not measured** by decision. Layer 01 records both
  reference games' instantiation counts using the method in
  [manifest-types.md](../../docs/benchmarks/manifest-types.md) and investigates
  anything above the existing 2× threshold.
