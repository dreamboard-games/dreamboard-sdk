# Mosaic Workshop tests

Behavior scenarios start from the ordinary, entropy-free `standard` setup.
`complete-game.scenario.ts` is the reusable four-season win arc and the single
source for all UI checkpoints. `complete-game-draw.scenario.ts` proves the
shared-rank draw branch. Focused scenarios and probes cover occupancy,
pass/skip/cleanup, every action space, exchanges, crafting domains, scoring,
inspection, and exploration.

Generated workspace contracts, projections, and Workbench checkpoints are
ignored local outputs. They are excluded from scenario authority and must not
be edited or committed.

Run `pnpm test`, `pnpm test:ui`, or `pnpm verify` from this package.
