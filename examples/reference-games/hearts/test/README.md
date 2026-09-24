# Hearts scenario workspace

Every authored scenario starts from ordinary four-player setup with an explicit
safe-integer seed. Scenarios reach
their subject only by replaying canonical `passing.submit` and
`playing.playCard` commands.

`complete-game.scenario.ts` is the canonical full-hand replay. Behavior tests,
inspect/explore checks, and UI/demo checkpoints all use that path or a separate
legal seed/path for a mutually exclusive scoring or legality branch.

Runtime projections and browser outputs are disposable evidence, not scenario
authority.

Run the focused gate from this package:

```sh
pnpm check
pnpm test:browser
```

`test/browser/gameplay.spec.ts` drives the actual local provider through keyboard
and touch input. `test/ui/app.test.tsx` proves hosted import closure, selected-seat
privacy and named checkpoint startup.
