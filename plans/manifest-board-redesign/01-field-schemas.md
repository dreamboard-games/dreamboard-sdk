# 01 — Zod field schemas

Enforce unsupported-check rejection before conversion. Reference validation has manifest, session and current-topology stages; fixed enums cannot cover future runtime identities.

See [private tiles and authority](private-tiles.md).

Branch: `sdk/field-schemas` (bottom of the stack, based on `main`). Size: L.
Read first: [00 — experiment](00-field-schema-experiment.md).

## Goal

Replace the custom property-schema language with Zod object schemas. One schema
gives the authoring input type, the runtime output type, validation and
defaults. ID-referencing fields use `ref.*` marker schemas. The manifest module
still exports plain JSON, now containing JSON Schema.

## Current state

The language is declared in
[contracts.ts](../../packages/sdk/src/shared/domain/contracts.ts) (`PropertySchema`,
`ObjectSchema`, `CardPropertySchemaVariants`) and interpreted five times:

| Interpreter           | Location                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Authoring input types | [authoring.ts:216–361](../../packages/sdk/src/reducer/manifest/authoring.ts#L216)                         |
| Runtime output types  | [types.ts:117–200](../../packages/sdk/src/reducer/manifest/types.ts#L117)                                 |
| Runtime Zod builder   | [schema.ts:16](../../packages/sdk/src/reducer/manifest/schema.ts#L16)                                     |
| Default values        | [materialize.ts:1176](../../packages/sdk/src/reducer/manifest/materialize.ts#L1176) and its object helper |
| Key validation        | [manifest-validation.ts:89–170](../../packages/sdk/src/reducer/manifest/manifest-validation.ts#L89)       |

Square boards additionally type `edgeId`/`vertexId` fields through signed
tuple arithmetic ([authoring.ts:385–513](../../packages/sdk/src/reducer/manifest/authoring.ts#L385)).

Schema-bearing manifest fields: `cardSets[].cardSchema`, `pieceTypes[].fieldsSchema`,
`dieTypes[].fieldsSchema`, and on boards `boardFieldsSchema`,
`spaceFieldsSchema`, `relationFieldsSchema`, `containerFieldsSchema`,
`edgeFieldsSchema`, `vertexFieldsSchema`. Keep these names in this layer; only
the value type changes. Later layers rename or delete some of them.

## Authoring after this layer

```ts
import { defineTopologyManifest, ref, z } from "@dreamboard-games/sdk/reducer";

export default defineTopologyManifest({
  players: { minPlayers: 4, maxPlayers: 4 },
  cardSets: [
    {
      id: "playing-cards",
      name: "Playing Cards",
      defaultHome: { type: "zone", zoneId: "draw-pile" },
      // One schema for every card in the set.
      cardSchema: z.object({ suit: z.enum(SUITS), rank: z.enum(RANKS) }),
      cards,
    },
  ],
  pieceTypes: [
    {
      id: "camp",
      name: "Camp",
      fieldsSchema: z.object({
        level: z.int().min(1).default(1),
        upgradedFrom: ref.pieceId().nullable().optional(),
      }),
    },
  ],
  // ...
});
```

Per-card-type schemas replace `{ shared, variants }`; shared properties use
Zod's `.extend()`:

```ts
const base = z.object({ cost: z.int().min(0) });

cardSchema: {
  byCardType: {
    knight: base.extend({ power: z.int() }),
    spell: base.extend({ target: ref.zoneId() }),
  },
},
```

`ref` covers every family the old language supported: `cardId`, `zoneId`,
`playerId`, `boardId`, `spaceId`, `edgeId`, `vertexId`, `pieceId`, `dieId`,
`resourceId`. Inside a board's own schemas (`spaceFieldsSchema` and friends),
`ref.spaceId()`, `ref.edgeId()` and `ref.vertexId()` resolve to that board's
IDs; elsewhere they resolve to the union across boards, as today's output types
do. `ref.playerId()` resolves to the runtime branded `PlayerId`.

## Design

### New module: `reducer/manifest/field-schemas.ts`

Owns everything schema-specific. Nothing else in the SDK inspects schemas.

```ts
import { z } from "zod";

export const FIELD_REF_KEY = "x-dreamboard-ref";

type Family =
  | "cardId"
  | "zoneId"
  | "playerId"
  | "boardId"
  | "spaceId"
  | "edgeId"
  | "vertexId"
  | "pieceId"
  | "dieId"
  | "resourceId";

const marker = <F extends Family>(family: F) =>
  z
    .string()
    .brand<`dreamboard:${F}`, "inout">()
    .meta({ [FIELD_REF_KEY]: family });

export const ref = {
  cardId: () => marker("cardId"),
  zoneId: () => marker("zoneId"),
  playerId: () => marker("playerId"),
  boardId: () => marker("boardId"),
  spaceId: () => marker("spaceId"),
  edgeId: () => marker("edgeId"),
  vertexId: () => marker("vertexId"),
  pieceId: () => marker("pieceId"),
  dieId: () => marker("dieId"),
  resourceId: () => marker("resourceId"),
};

/** A field schema authors write. Object schemas only; the top level is a record of fields. */
export type FieldSchema = z.ZodObject;
/** The JSON Schema (draft 2020-12) form the manifest module exports. */
export type FieldSchemaJson = { readonly [key: string]: JsonValue };

export function toFieldSchemaJson(schema: FieldSchema): FieldSchemaJson {
  // io "input": defaulted keys stay optional, matching what authors may omit.
  // "throw": transforms, dates, bigints and other non-JSON constructs fail at definition time.
  return z.toJSONSchema(schema, {
    io: "input",
    unrepresentable: "throw",
  }) as FieldSchemaJson;
}

/**
 * The only runtime validator for authored values. Markers become enums of the IDs known
 * to the caller. Authoring and table creation both call this, so they always agree.
 */
export function fieldValidator(
  schema: FieldSchemaJson,
  ids: Readonly<Partial<Record<Family, readonly string[]>>>,
): z.ZodType {
  // Replace every node carrying FIELD_REF_KEY with { ...rest, enum: ids[family] }.
  // See 00-field-schema-experiment.md for the reference implementation.
}
```

Type-level resolution, extended from the experiment with the board context:

```ts
type RefFamily<T> =
  T extends z.core.$brand<"dreamboard:cardId">
    ? "cardId"
    : T extends z.core.$brand<"dreamboard:zoneId">
      ? "zoneId"
      : // ... one line per family; TypeScript cannot infer the family from $brand keys.
        never;

type FamilyIds<M, Board> = {
  cardId: CardIdOf<M>;
  zoneId: ZoneIdOf<M>;
  playerId: PlayerId;
  boardId: BoardIdOf<M>;
  spaceId: [Board] extends [never] ? SpaceIdOf<M> : SpaceIdOfBoard<Board>;
  edgeId: [Board] extends [never] ? EdgeIdOf<M> : EdgeIdOfBoard<Board>;
  vertexId: [Board] extends [never] ? VertexIdOf<M> : VertexIdOfBoard<Board>;
  pieceId: PieceIdOf<M>;
  dieId: DieIdOf<M>;
  resourceId: ResourceIdOf<M>;
};

export type ResolveFields<T, M, Board = never> = T extends unknown
  ? [RefFamily<T>] extends [never]
    ? T extends readonly (infer U)[]
      ? ResolveFields<U, M, Board>[]
      : T extends object
        ? { [K in keyof T]: ResolveFields<T[K], M, Board> }
        : T
    : FamilyIds<M, Board>[RefFamily<T>]
  : never;

export type FieldsInput<S, M, Board = never> = ResolveFields<
  z.input<S>,
  M,
  Board
>;
export type FieldsOutput<S, M, Board = never> = ResolveFields<
  z.output<S>,
  M,
  Board
>;
```

Reuse the existing ID helpers in [types.ts](../../packages/sdk/src/reducer/manifest/types.ts)
(`ManifestIdsOf`) for `CardIdOf`, `PieceIdOf` and friends rather than adding new ones.

### Authored and defined manifests

`defineTopologyManifest` accepts Zod schemas and returns JSON. The phantom
property carries the authored type for `compileManifest`; it never exists at
runtime, matching the existing `ValidatedManifest` brand technique.

```ts
declare const authoredManifest: unique symbol;

/** JSON-compatible manifest exported by manifest.ts, carrying the authored type. */
export type DefinedManifest<M> = GameTopologyManifest & {
  readonly [authoredManifest]?: M;
};

export function defineTopologyManifest<const M>(
  manifest: M &
    CheckedManifest<NoInfer<M>> &
    ManifestCountValidation<NoInfer<M>>,
): DefinedManifest<M> {
  const json = toManifestJson(manifest); // every FieldSchema -> toFieldSchemaJson
  assertValidManifest(json); // validates authored values with fieldValidator
  return json as DefinedManifest<M>;
}
```

`CheckedManifest<M>` replaces `TypedTopologyManifest` for schema-bearing
values: card `properties`, seed `fields`, and board, space, relation, edge and
vertex `fields` are checked against `FieldsInput<schema, M, Board>`. Keep the
existing checks for homes, counts and IDs unchanged in this layer.

`compileManifest` accepts a `DefinedManifest<M>` and derives table types from
`AuthoredOf<D>` with `FieldsOutput`. It also accepts a plain
`GameTopologyManifest` (the compiler's JSON path) and falls back to runtime
record types, as `AuthoredManifest extends M` does today in
[types.ts:363](../../packages/sdk/src/reducer/manifest/types.ts#L363).

### Runtime

- `schema.ts`: card `properties` and component `properties` use
  `fieldValidator(json, analysis.ids)` instead of the `switch` over property
  types.
- `materialize.ts`: `materializePropertySchemaDefault` and
  `materializeObjectSchemaDefaults` are deleted. Materialized values are
  `fieldValidator(json, ids).parse(authored ?? {})`, which applies defaults.
- `manifest-validation.ts`: the per-type schema walkers are deleted. Authored
  values are checked with `safeParse`; report each issue as
  `manifest.<path>.<issue.path>: <issue.message>`. Keep `validateRecordKey`
  (prototype-sensitive keys) and apply it to `properties` keys found in the
  JSON Schema.
- Build each validator once per schema during analysis, not per value.

### Public contract

In [contracts.ts](../../packages/sdk/src/shared/domain/contracts.ts), replace
`PropertySchema`, `ObjectSchema`, `CardPropertySchemaVariants` and
`CardPropertySchema` with:

```ts
export type FieldSchemaJson = { [key: string]: JsonValue };
export type CardSchemaJson =
  FieldSchemaJson | { byCardType: { [cardType: string]: FieldSchemaJson } };
```

Re-export `z` and `ref` from [reducer.ts](../../packages/sdk/src/reducer.ts)
(the manifest sandbox only allows `@dreamboard-games/sdk/reducer` imports). Zod
is already pinned exactly (`4.6.5`) in `pnpm-workspace.yaml`; keep it pinned.

## Delete

- The property-schema types in `contracts.ts` listed above.
- `SchemaValueForProperty`, `BaseSchemaValueForProperty`,
  `SchemaValueForObjectSchema`, `MergeSharedProperties`, `RequiredSchemaKeys`,
  `OptionalSchemaKeys`, `TypedFields` and the square arithmetic
  (`ToNumber` through `DerivedSquareVertexIdOf`) in `authoring.ts`.
  `BuildTuple`/`OneTo`/`PlayerId` stay until [layer 05](05-per-player-inventory.md).
- `PropertyValue`, `PropertyOutput`, `OptionalKeys`, `ObjectProperties`,
  `ObjectFields`, `CardFields` in `types.ts`.
- The property `switch` in `schema.ts`, the default materializers in
  `materialize.ts`, and the schema walkers in `manifest-validation.ts`.

## Migrate

- Hearts manifest `cardSchema` → `z.object({ suit: z.enum(SUITS), rank: z.enum(RANKS) })`.
- `registry/stories/card-drop-game.ts` `cardSchema: { properties: {} }` → `z.object({})`.
- Every SDK test fixture that authors a property schema.
- Docs: [manifest-and-boards.md](../../docs/guides/reducer/manifest-and-boards.md)
  gains a "Field schemas" section: allowed constructs, `ref.*`, that
  refinements and transforms are not supported (field schemas are data).

## Tests and proofs

- **Conformance round trip** (`field-schemas.test.ts`): for each supported
  construct — string, number, `z.int()`, boolean, enum, literal, array, object,
  record, nullable, optional, default, every `ref` family — assert
  `fieldValidator(toFieldSchemaJson(s), ids)` accepts and rejects the same
  values as the expectation table, and applies defaults. This is the guard for
  `z.fromJSONSchema` being semi-experimental.
- **Unrepresentable constructs throw at definition time**: transforms, dates,
  bigint, custom types.
- **JSON compatibility**: the result of `defineTopologyManifest` survives
  `JSON.parse(JSON.stringify(x))` unchanged and contains no functions.
- **Type proofs**: exact `FieldsInput`/`FieldsOutput` for defaults, nullable,
  optional, arrays, records and each `ref` family; a board-scoped
  `ref.spaceId()` rejects another board's space; `byCardType` narrows card
  `properties` per `cardType`; unknown IDs in authored values are rejected.
- **Error messages** carry the manifest path and the Zod issue path.
- Record instantiation counts for both reference games with the method in
  [manifest-types.md](../../docs/benchmarks/manifest-types.md) and append them
  to that file.

## Verify

```sh
pnpm check
pnpm reference
```

## Done when

- No code outside `field-schemas.ts` inspects schema structure.
- Both reference games and the template compile, and `pnpm check` passes.
- The manifest module default export of both reference games is plain JSON.
