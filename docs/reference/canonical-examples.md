# Canonical examples

The two reference games are complete multi-turn teaching examples and genuine
consumers of the packed public SDK.

## Authority

Each game-local `rule.md` defines its mechanics, theme, information boundaries,
complete game arc, and deliberate exclusions. Reducers, tests, and generated
fixtures prove that authored brief; they do not amend it.

Each `reference-game.json` uses schema V5. It records the workspace and
read-first paths, teaching purpose, mechanics, UI patterns, and substantive
rights metadata. The directory list is the game registry; there is no second
maintained inventory.

| Reference id          | Display name | Rules                                                                   |
| --------------------- | ------------ | ----------------------------------------------------------------------- |
| `hearts`              | Hearts       | [`rule.md`](../../examples/reference-games/hearts/rule.md)              |
| `hex-network-trading` | Stormtrail   | [`rule.md`](../../examples/reference-games/hex-network-trading/rule.md) |

## Choose an example

| Authoring question                                   | Start with            | Main SDK concepts                                                | Focused proof                        |
| ---------------------------------------------------- | --------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Trick-taking with hidden hands and follow-suit rules | `hearts`              | player views, card zones, simultaneous passing, trick resolution | `pnpm reference hearts`              |
| A route or network game                              | `hex-network-trading` | hex targets, routes, resource hands, trading                     | `pnpm reference hex-network-trading` |

## Authoring loop

1. Read `rule.md`, then open the closest typed file under `test/scenarios/`.
2. Use `dreamboard test inspect <scenario> --perspective player:<seat> --at
<checkpoint>` to inspect one authored state.
3. Use `dreamboard test explore <scenario> --perspective player:<seat> --at
<checkpoint>` to enumerate replay-accepted transitions.
4. Copy the selected command into the typed scenario and keep privacy,
   rejection, uniqueness, and cross-checkpoint assertions in its tests.
5. Run `pnpm reference <game-id>`, then open an authored UI checkpoint with
   `pnpm ui workbench --scenario <id>` when visual iteration is useful.

Generated projections and fixtures stay ignored. The reference games use
`workspace:*` SDK dependencies and the root lockfile.

## Suite proof

Run every game with:

```sh
pnpm reference
```

The command validates each V5 manifest, packs the SDK once, installs temporary
copies against that tarball, typechecks,
and runs reducer and UI tests. `pnpm release:verify` applies the same all-game
proof to the exact release candidate.
