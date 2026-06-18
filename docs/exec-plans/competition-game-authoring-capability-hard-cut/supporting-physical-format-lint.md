# Supporting Workstream: Optional Physical-Format Lint

Status: optional. Not on the capability critical path and not a release blocker.

May start after Phase 00. No numbered phase depends on this workstream.

## Objective

Provide repository-level lint for compact-game component counts without adding
fields or concepts to the public SDK contract.

This workstream is deliberately subordinate to gameplay authoring. It may
inspect existing manifest declarations, but it cannot influence the shape of:

- `GameTopologyManifest`;
- board, card, piece, die, or location contracts;
- reducer state;
- generated UI contracts;
- plugin frames;
- host transport; or
- public runtime APIs.

## Design Decision

Implement the check as repository tooling, not
`@dreamboard-games/sdk/authoring` API.

Reference games may opt in through a tooling-owned config:

```json
{
  "id": "roll-and-write-scorecard",
  "limits": {
    "cards": { "max": 1 },
    "pieces": { "max": 12 },
    "dice": { "max": 2 }
  },
  "playerSupplied": [
    {
      "kind": "pencil",
      "countPerPlayer": 1
    }
  ]
}
```

Suggested location:

```text
examples/reference-games/roll-and-write-scorecard/physical-format.json
```

The file belongs to the lint tool. It is not imported by game source,
generated into workspace contracts, or published as gameplay metadata.

## Scope

The first version may validate only counts already represented unambiguously:

- manual and preset cards;
- seeded pieces; and
- seeded dice.

Do not infer:

- whether a board is separately printed;
- whether a board is printed on a card;
- card dimensions;
- page count;
- manufacturing cost;
- package volume;
- contest eligibility; or
- print-and-play layout.

Those facts are not part of the current gameplay manifest. If they become a
real product requirement, design a separate publishing/production model rather
than adding carrier metadata to board topology.

## Tool Contract

Create:

```text
scripts/capability/check-physical-format.mjs
scripts/capability/physical-format.schema.json
```

Command:

```bash
node scripts/capability/check-physical-format.mjs \
  examples/reference-games/roll-and-write-scorecard
```

The tool:

1. loads the reference game's manifest through the existing authoring/codegen
   adapter;
2. resolves preset inventories through the owning codegen path;
3. derives card, piece, and die totals;
4. validates an optional `physical-format.json`;
5. reports all violations with manifest source paths; and
6. exits successfully when no config exists unless `--required` is passed.

Optional repository-wide check:

```bash
node scripts/capability/check-physical-format.mjs \
  --all examples/reference-games
```

Do not add a new package export solely for this script.

## Diagnostic Shape

The script may use an internal shape:

```ts
type PhysicalFormatDiagnostic = {
  code:
    | "PHYSICAL_FORMAT_BELOW_MINIMUM"
    | "PHYSICAL_FORMAT_ABOVE_MAXIMUM"
    | "PHYSICAL_FORMAT_EXACT_MISMATCH"
    | "PHYSICAL_FORMAT_UNRESOLVED_PRESET"
    | "PHYSICAL_FORMAT_INVALID_CONFIG";
  formatId: string;
  componentKind: "cards" | "pieces" | "dice";
  expected?: { min?: number; max?: number; exact?: number };
  actual?: number;
  sources: readonly string[];
  message: string;
};
```

Example:

```text
PHYSICAL_FORMAT_ABOVE_MAXIMUM: format 'roll-and-write-scorecard' allows at most
1 card, but the materialized manifest contains 2.
Sources: cardSets[0].cards[0].count=1, cardSets[0].cards[1].count=1
```

The config validator rejects:

- negative or non-integer counts;
- `exact` combined with `min` or `max`;
- `min > max`;
- both `count` and `countPerPlayer` on one player-supplied item;
- unknown component-limit keys; and
- unknown top-level fields.

## Ownership

Expected touchpoints:

- `scripts/capability/check-physical-format.mjs`;
- `scripts/capability/physical-format.schema.json`;
- focused script tests;
- optional `physical-format.json` files in selected reference games; and
- `reference-games:check` only if maintainers decide this optional lint should
  run for repository-owned fixtures.

Explicitly out of scope:

- `packages/sdk-types/src/contracts.ts`;
- reducer schemas;
- workspace generated contracts;
- SDK runtime exports;
- public UI exports;
- internal OpenAPI contracts; and
- database or host changes.

## Tests

Required cases:

- manual card counts sum `BoardCard.count`;
- preset card counts use the existing preset materializer;
- omitted piece/die seed counts follow current materialization semantics;
- exact/min/max constraints produce stable diagnostics;
- invalid configs fail before manifest inspection;
- all source paths are deterministic;
- no config is a no-op by default;
- `--required` fails when config is absent; and
- adding or removing board topology does not change the derived physical
  totals.

## Verification

```bash
mise exec node@24 -- node scripts/capability/check-physical-format.mjs \
  --all examples/reference-games
mise exec node@24 -- pnpm reference-games:check
mise exec node@24 -- pnpm format:check
```

Run the repository-wide command only when this optional workstream has been
implemented.

## Exit Criteria

- The tool derives only card, piece, and die counts.
- No public SDK contract changed.
- No board-to-card or other physical-carrier relationship exists in the
  manifest.
- Violations identify component kind, expected limit, actual count, and source
  paths.
- Reference games without a config continue to build and release normally.
- Removing the lint tool would not change gameplay behavior or generated
  contracts.

## Stop Conditions

Stop and move the requirement to a separate publishing/production design if:

- the checker needs board-carrier metadata;
- it needs dimensions, print layout, or manufacturing semantics;
- it needs mutable runtime state;
- it needs internal product services; or
- it starts constraining otherwise valid SDK gameplay models.
