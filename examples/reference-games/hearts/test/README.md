# Hearts scenario workspace

Every authored scenario starts from ordinary four-player setup with an explicit
safe-integer seed and the `default` production setup profile. Scenarios reach
their subject only by replaying canonical `passing.submit` and
`playing.playCard` commands.

`complete-game.scenario.ts` is the canonical full-hand replay. Behavior tests,
inspect/explore checks, and UI/demo checkpoints all use that path or a separate
legal seed/path for a mutually exclusive scoring or legality branch.

`test/bases/**` and `test/generated/**` are preserved byte-for-byte only for the
Phase 07 deletion boundary. They are excluded from typecheck, test discovery,
dev, and scenario authority; do not import or regenerate them.

Run the focused gate from this package:

```sh
pnpm verify
```
