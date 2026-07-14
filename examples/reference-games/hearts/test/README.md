# Hearts scenario workspace

Every authored scenario starts from ordinary four-player setup with an explicit
safe-integer seed and the `default` production setup profile. Scenarios reach
their subject only by replaying canonical `passing.submit` and
`playing.playCard` commands.

`complete-game.scenario.ts` is the canonical full-hand replay. Behavior tests,
inspect/explore checks, and UI/demo checkpoints all use that path or a separate
legal seed/path for a mutually exclusive scoring or legality branch.

Generated workspace contracts, projections, and Workbench checkpoints are
ignored local outputs. They are not scenario authority and must not be edited
or committed.

Run the focused gate from this package:

```sh
pnpm verify
```
