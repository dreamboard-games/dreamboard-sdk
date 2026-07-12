# Mosaic Workshop tests

Behavior scenarios start from the ordinary, entropy-free `standard` setup.
`complete-game.scenario.ts` is the reusable four-season win arc and the single
source for all UI checkpoints. `complete-game-draw.scenario.ts` proves the
shared-rank draw branch. Focused scenarios and probes cover occupancy,
pass/skip/cleanup, every action space, exchanges, crafting domains, scoring,
inspection, and exploration.

`test/bases/**` and `test/generated/**` are intentionally frozen legacy
fixtures during the conformance phases. They are excluded from verification
and will be removed together in the fixture-deletion phase.

Run `pnpm test`, `pnpm test:ui`, or `pnpm verify` from this package.
