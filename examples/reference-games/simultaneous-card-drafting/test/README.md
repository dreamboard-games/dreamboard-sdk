# Lantern Market scenarios

Every authored scenario starts from ordinary seeded setup and replays typed,
seat-based `drafting.submit` commands. No scenario reads a base state, patches
reducer state, injects a hand, or fixes a deck order.

The canonical path is `scenarios/complete-game.scenario.ts`. It leaves the
last sealed barrier in `when`, so the default inspect/explore checkpoint has a
real action to discover while a full replay reaches terminal standings.

Run the focused source proof:

```sh
pnpm test
```

From the game directory, use the public CLI for the agent-authoring loop. Both
commands emit one JSON envelope; there is no output-format flag.

```sh
dreamboard test inspect test/scenarios/complete-game.scenario.ts --perspective player:0
dreamboard test explore test/scenarios/complete-game.scenario.ts --perspective player:0
```

Generated workspace contracts, projections, and Workbench checkpoints are
ignored local outputs. They are excluded from scenario authority and must not
be edited or committed.
