# Dreamboard reference games

This directory contains nine complete multi-turn teaching games. Each is an
isolated consumer of `@dreamboard-games/sdk`, not a root workspace package.

Reference ids describe the mechanics and UI pattern:

- `automa-river-rival`
- `deck-building-market`
- `hearts`
- `hex-network-trading`
- `multiplayer-ranking-and-ties`
- `roll-and-write-scorecard`
- `simultaneous-card-drafting`
- `solo-countdown-puzzle`
- `worker-placement-tableau`

See the [canonical example map](../../docs/reference/canonical-examples.md) for
the concept demonstrated by each game.

## Game contract

Each game contains:

- `rule.md`, the authority for mechanics, theme, information boundaries, and
  the complete game arc;
- `reference-game.json`, a schema-V5 manifest for workspace paths, teaching,
  mechanics, UI patterns, and substantive rights metadata;
- `package.json` with one exact npm version of `@dreamboard-games/sdk` and no
  other Dreamboard workspace dependency;
- an intentionally checked-in `pnpm-lock.yaml` for that exact published SDK;
- typed reducer, UI, and scenario sources with tests.

Do not consolidate or hand-edit the lockfiles. Generated workspace contracts,
projections, and Workbench fixtures are ignored outputs.

## Authoring loop

Read `rule.md` and a typed file under `test/scenarios/`. Named checkpoints such
as `developed` and `game-over` can be inspected and explored as JSON:

```sh
pnpm --dir examples/reference-games/hex-network-trading exec dreamboard \
  test inspect test/scenarios/complete-game.scenario.ts \
  --perspective player:1 --at developed
pnpm --dir examples/reference-games/hex-network-trading exec dreamboard \
  test explore test/scenarios/complete-game.scenario.ts \
  --perspective player:1 --at developed
```

Copy a replay-accepted command into the typed scenario. Do not commit base
states, generated projections, or fixture output.

Run the repository-owned focused proof from the root:

```sh
pnpm reference hex-network-trading
```

This validates the V5 manifest and frozen checked-in lockfile, packs the current
SDK, installs a temporary game copy against that tarball, materializes, then
runs raw type, reducer, and UI tests. `pnpm reference` verifies all nine games
against one packed SDK.

Open a UI checkpoint with:

```sh
pnpm ui workbench --scenario hex-network-trading.growing-network.desktop
```

After publishing a new SDK version, update every game atomically:

```sh
pnpm reference pin <version>
pnpm reference
```
