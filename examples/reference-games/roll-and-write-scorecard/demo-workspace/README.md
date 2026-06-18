# Cloudline Survey Demo Workspace

This is a Phase 01 demo-workspace stub for Cloudline Survey. The playable
reference model lives in the package root `src/` and `scenarios/` directories;
repository-level scripts compile it into the portable Workbench fixture.

The local scenario skeleton imports that model and verifies the mobile mark-cell
scenario metadata. Run the executable proof from the repository root:

```sh
pnpm reference-games:test:packed --game roll-and-write-scorecard
pnpm ui:test --scenario roll-and-write-scorecard.mark-cell.mobile
```

## Current Demo Contract

- Board: per-player `survey-grid` square board.
- Interaction: `mark-cell` through the existing board-space collector.
- Required mobile scenario: `roll-and-write-scorecard.mark-cell.mobile`.
- Lifecycle metadata: initial, dice, draft, submitted, invalid, and complete.

## Boundary

This folder does not introduce a separate launchable `dreamboard dev` workspace
contract. The canonical proof path is the generated portable fixture plus the
packed reference-game consumer.
