# Phase 02: Primitive And Archetype Scenarios

Status: Complete

Completed during the Phase 02 implementation commit.

Depends on: Phases 00 and 01

## Objective

Create a representative scenario library that lets agents develop the major SDK
primitive families and common game compositions without a backend.

The scenario library should grow with the SDK. This phase establishes useful
breadth; it does not block on every public component being covered.

## Primitive scenarios

Add small protocol-authoritative scenarios under:

`examples/ui-scenarios/src/`

Initial families:

| Family                | Representative behavior                              |
| --------------------- | ---------------------------------------------------- |
| Cards and hands       | selection, disabled state, hidden information, drag  |
| Zones and collections | list, pile, transfer, staging                        |
| Prompts               | single choice, multi-choice, validation, submit      |
| Dice                  | result state, keep or reroll                         |
| Resources and costs   | affordability, staged payment                        |
| Boards                | square, hex, network, track, area, slot targeting    |
| Game shell            | phase, roster, responsive viewport, terminal outcome |

Prefer scenarios that cover multiple related primitives without becoming a full
game.

## Reference-game scenarios

Keep reducer-authoritative scenarios under:

`examples/reference-games/<game>/src/scenarios/`

Use the existing examples to cover:

- Hearts: hidden information and simultaneous card selection.
- Worker placement: slot targeting, resource cost, and form mutation.
- Hex network trading: network placement and physical drag.
- Deck builder: market purchase and zone mutation.
- Simultaneous draft: private choice, lock, and reveal.
- Grid tactics: board targeting and state transition.

Add a new reference game only when an important reducer composition cannot be
represented by these examples.

## Storybook relationship

Use Storybook for visual state breadth:

- default, selected, disabled, hidden, error, and empty states;
- desktop and narrow layouts;
- themes and reduced motion where relevant.

Use Workbench scenarios only when runtime projection, semantic interaction,
draft mutation, or submission matters.

## Expected files

Create:

- `examples/ui-scenarios/package.json`
- `examples/ui-scenarios/src/cards/`
- `examples/ui-scenarios/src/zones/`
- `examples/ui-scenarios/src/prompts/`
- `examples/ui-scenarios/src/dice/`
- `examples/ui-scenarios/src/resources/`
- `examples/ui-scenarios/src/boards/`
- `examples/ui-scenarios/src/game-shell/`

Refactor reference games toward:

- `examples/reference-games/<game>/src/game.ts`
- `examples/reference-games/<game>/src/ui.tsx`
- `examples/reference-games/<game>/src/scenarios/*.scenario.ts`

Add or update Storybook stories beside the affected components.

## Implementation sequence

1. Add cards, zones, prompts, and interaction lifecycle scenarios.
2. Convert Hearts, worker placement, and Hex to real reducer authority.
3. Add resources, dice, game shell, and board-family scenarios.
4. Convert deck builder, drafting, and grid tactics as those areas are touched.
5. Use the generated index to report remaining primitive and archetype gaps.
6. Add scenarios incrementally when new primitives or compositions land.

## Verification

During development:

```sh
pnpm ui:workbench:src --scenario <scenario-id>
pnpm ui:test --scenario <scenario-id>
pnpm ui:test --component <component-id>
```

After shared scenario or fixture changes:

```sh
pnpm ui:fixtures:check
pnpm ui:catalog:check
pnpm ui:runtime:test
pnpm ui:test
```

## Acceptance criteria

- Each major primitive family has at least one useful Workbench scenario.
- Hearts, worker placement, and Hex use real reducer authority.
- Remaining reference games can migrate incrementally.
- Scenario modules import public SDK APIs.
- Storybook owns presentation-only states.
- Workbench owns runtime behavior and semantic interaction.
- The coverage report shows gaps without requiring immediate exhaustive
  closure.

## Completion notes

- Added protocol-authoritative primitive scenarios under `examples/ui-scenarios`
  for cards/hands, zones/staging, prompts, dice, resources/costs, boards, and
  game shell coverage.
- Extended fixture discovery to load both reference-game scenario modules and
  `examples/ui-scenarios/src/**/*.scenario.mjs`.
- Added fixture `source.sourceFiles` metadata so primitive scenarios can own
  source paths outside `examples/reference-games`.
- Updated catalog/index generation to include the new primitive scenarios and
  contract coverage.
- Preserved reducer-authoritative reference-game scenarios for Hearts, worker
  placement, Hex, deck builder, and simultaneous draft.
- Captured measured Chromium desktop semantic digests for the primitive
  scenario helper and fail fixture compilation when a new primitive scenario has
  no measured digest baseline.

Verification:

```sh
pnpm ui:fixtures:compile
pnpm ui:catalog:generate
pnpm docs:generate
pnpm ui:fixtures:check
pnpm ui:catalog:check
pnpm docs:check
pnpm --filter @dreamboard-games/sdk typecheck
pnpm ui:test --scenario ui-scenarios.cards-hand.desktop
pnpm ui:runtime:test
pnpm ui:test
pnpm ui:coverage:check
pnpm ui:test:changed --base origin/main
```

Receipts:

- `artifacts/ui/2026-06-18T08-08-39-720Z/receipt.json`
- `artifacts/ui/2026-06-18T08-09-08-423Z/receipt.json`
- `artifacts/ui/2026-06-18T08-09-36-414Z/receipt.json`

Known caveats:

- `pnpm ui:coverage:check` still reports the non-blocking `Drawer` Workbench
  coverage warning.
- `pnpm ui:hard-cut:check` is blocked by unrelated untracked files under
  `examples/reference-games/hearts/demo-workspace/` that still contain
  `renderSummary` and `renderActions`.

## Deferred

- every primitive combination;
- every archetype;
- every scenario on every browser;
- physical-device scenarios;
- packed-consumer and real-host expansion.
