# Phase 00: Core Contract And Generated Index

Status: Proposed

## Objective

Replace the duplicated component-to-scenario maps with one typed contract and
one generated index used by catalog generation, coverage checks, documentation,
and changed-only selection.

## Design

Add two small authoring types:

```ts
defineUIContract({
  id: "CardDragSurface",
  kind: "component",
  sourceFiles: ["packages/sdk/src/ui/components/card-drag-surface/**"],
});
```

```ts
defineUIScenario({
  id: "cards.drag-between-zones.mobile",
  contracts: ["CardDragSurface", "CardDropTargetView", "Zone"],
  capabilities: ["touch", "drag", "draft-mutation"],
  sourceFiles: ["examples/ui-scenarios/src/cards/drag-between-zones.tsx"],
  environment: {
    viewport: "phone",
    browsers: ["chromium"],
  },
  authority: protocolScenario(...),
  replay: [...],
});
```

Use explicit source files or globs. Do not build a TypeScript import graph in
this phase.

Extend the existing generated artifact:

`fixtures/ui/component-scenario-index.json`

The index should contain:

- all registered UI contracts;
- scenario IDs and source modules;
- contract-to-scenario relationships;
- capabilities;
- source ownership;
- viewport and browser hints.

## Validation

The generator should reject:

- duplicate contract or scenario IDs;
- missing source paths;
- scenario references to unknown contracts;
- capabilities without a replay step that exercises them;
- generated scenario IDs that are absent from the fixture catalog.

It may report uncovered contracts as warnings. Exhaustive primitive coverage is
not a gate in this phase.

## Expected files

Create:

- `packages/sdk/src/ui/testing/ui-contract.ts`
- `packages/sdk/src/ui/testing/ui-contracts.ts`
- `packages/sdk/src/testing/ui-scenario/types.ts`
- `packages/sdk/src/testing/ui-scenario/define-ui-scenario.ts`

Refactor:

- `packages/sdk/src/ui/testing/component-coverage.ts`
- `scripts/ui/generate-component-scenario-index.mjs`
- `scripts/ui/assert-component-coverage.mjs`
- `scripts/ui/generate-workbench-catalog.mjs`
- `scripts/ui/run-ui-scenarios.mjs`

Generate:

- `fixtures/ui/component-scenario-index.json`
- `packages/ui-workbench/src/catalog.ts`

## Implementation sequence

1. Define `UIContractDefinition` and `UIScenarioDefinition`.
2. Convert the current component declarations into contract definitions without
   embedded scenario IDs.
3. Convert current fixture metadata into scenario definitions.
4. Generate the extended component-scenario index.
5. Make catalog generation and coverage checks consume the index.
6. Add index queries for scenario, component, capability, and changed source.
7. Delete the separate `componentOwnership` map.

## Verification

```sh
pnpm ui:catalog:generate
pnpm ui:coverage:check
pnpm ui:catalog:check
pnpm ui:fixtures:check
```

Add focused unit tests for duplicate IDs, unknown contracts, source matching,
and scenario selection.

## Acceptance criteria

- Component-to-scenario ownership is defined once.
- The generated index supports component, capability, scenario, and source
  queries.
- Catalog generation and coverage checks read the same index.
- Changed-only selection can use explicit source ownership.
- Uncovered contracts are visible without blocking framework development.

## Deferred

- automatic TypeScript dependency analysis;
- measured rendered-component discovery;
- weighted coverage optimization;
- packed or real-host validation.
