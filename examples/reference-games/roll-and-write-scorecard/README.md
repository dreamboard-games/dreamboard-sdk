# Roll And Write Scorecard

Cloudline Survey is the Phase 01 canonical roll-and-write example. It models a
scorecard as an ordinary per-player square board named `survey-grid`. Each
player resolves the same seeded two-die roll on their own 4x4 board in seat
order.

The local package includes a deterministic reference model for the complete
8-round game loop. Repository-level fixture generation turns its mobile
`Board.SquareGrid` scenario into the Workbench proof surface.

## Rules

Cloudline Survey supports one to four human players. The demo metadata uses two
players so seat-order progression is visible in checks.

Every player receives the same 4x4 grid:

```text
 2   5   8  11
 6   9   3   7
10   4  12   6
 7  11   5   9
```

The game runs for eight shared rolls:

| Round | Dice  | Total |
| ----- | ----- | ----- |
| 1     | 2 + 3 | 5     |
| 2     | 4 + 3 | 7     |
| 3     | 6 + 4 | 10    |
| 4     | 1 + 5 | 6     |
| 5     | 3 + 6 | 9     |
| 6     | 2 + 2 | 4     |
| 7     | 5 + 3 | 8     |
| 8     | 6 + 5 | 11    |

For each roll, players resolve in session seat order:

1. If the active player has an unmarked cell matching the roll total, they must
   choose one matching cell.
2. If no matching cell remains, they choose any unmarked cell and record a
   failed survey there.
3. The submitted mark advances to the next player. After the final player, the
   next seeded roll starts.
4. After every player resolves round 8, the game scores and completes.

Surveyed cells store the round and rolled total. Failed cells store the round
only.

Scoring per player:

- 6 points for each complete surveyed row.
- 6 points for each complete surveyed column.
- 1 point per surveyed cell in the largest orthogonally connected surveyed
  region.
- -2 points per failed survey.

## Authoring Boundary

- The scorecard is gameplay topology: `layout: "square"`, `scope:
"perPlayer"`, and sixteen board spaces.
- `Board.SquareGrid` is needed because the target layer must live inside the
  SVG square grid; wrapping SVG cells in `Board.Space` would create HTML
  controls outside the authored cell renderer.
- The reducer collector is the existing `boardTarget.playerSpace` path. It owns
  legal marks, unavailable cells, failed-survey fallback, stale submission
  rejection, and seat-order progression.
- `ScorecardCell`, the mobile panel frame, target-number labels, and mark
  rendering are game-local presentation.

## Scenario Coverage

`scenarios/coverage.json` carries explicit metadata for the Phase 01 lifecycle:

- `initial`: empty scorecards before the first automatic roll.
- `dice`: round 1 roll `2 + 3 = 5` with legal spaces `cell-0-1` and
  `cell-3-2`.
- `draft`: a pending `cell-0-1` mark that has not mutated player marks.
- `submitted`: accepted survey mark and active-player advance.
- `invalid`: illegal non-matching cell and stale submission rejection.
- `complete`: deterministic 8-round completion with score components.

`src/reference-game.mjs` exports the same lifecycle as executable reference
metadata through `scenarioMetadata`. The UI scenario remains the required mobile
`Board.SquareGrid` mark-cell scenario and uses the existing board-space browser
effect path.

Run the narrow source check from the repository root:

```sh
pnpm reference-games:check
```

Run the packed-consumer and Workbench proofs from the repository root:

```sh
pnpm reference-games:test:packed --game roll-and-write-scorecard
pnpm ui:test --scenario roll-and-write-scorecard.mark-cell.mobile
pnpm --filter @dreamboard-games/ui-workbench test tests/scenario-keyboard.spec.ts
```

## Implementation Boundary

The example stays within the public reference-game package shape: exact
`@dreamboard-games/sdk` dependency metadata, source scenario model, generated
portable fixture, and root-level packed proof. It intentionally does not add a
new SDK sheet, scorecard carrier, or scorecard-specific reducer collector.
