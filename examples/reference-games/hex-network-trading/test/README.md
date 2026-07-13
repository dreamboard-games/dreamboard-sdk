# Stormtrail executable rules

Every scenario in `test/scenarios/` starts from ordinary three-player setup
with an authored safe-integer seed and replays accepted seat-based commands.
No scenario patches state, fixes dice, injects resources, or selects a test-only
setup profile.

The nine authoritative scenario sources cover the full game, topology/setup,
production, the discard barrier, Bandits, network/costs, depot trades,
bilateral trade, and projection privacy. `test/scenarios.test.ts` adds exact
checkpoint, probe, explore, scheduler, and privacy assertions.

`test/ui-scenarios/` contains derived Workbench checkpoints for setup,
production, discard, pending trade, a growing network, and terminal victory.

Generated workspace contracts, projections, and Workbench fixtures are ignored
local outputs. They are not assertion authority and must not be edited or
committed.

Run:

```sh
pnpm verify
```
