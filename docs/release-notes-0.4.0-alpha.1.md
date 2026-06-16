# @dreamboard-games/sdk 0.4.0-alpha.1 - UI fixture contract

This alpha adds the portable UI scenario fixture contract used by the UI Agent
Iteration Workbench.

## Testing Export

`@dreamboard-games/sdk/testing` now exports the versioned UI fixture schema,
canonical JSON serialization, fixture/request digest helpers, bundle parsing,
deterministic compilation helpers, and portable semantic replay types.

New replay steps resolve through the existing browser-interaction protocol and
record exact semantic identity instead of text, label, role, CSS, XPath, test
ID, or DOM-position selectors.

## Reference Fixtures

The repository now ships a deterministic reference fixture bundle under
`fixtures/ui/reference-games/`. Each fixture is compiled from the reference-game
source, records projected plugin snapshots and observable validate/submit
transport exchanges, and points at an externalized browser render module.

Use:

```sh
pnpm ui:fixtures:compile
pnpm ui:fixtures:check
```

## Internal Consumer

The internal browser-demo scenario contract can now validate a portable replay
step for each compiled recipe step. After repinning to this SDK release, private
fixtures can import the SDK's named `PortableSemanticReplayStep` type directly.
