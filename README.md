# Dreamboard SDK

This repository publishes the public `@dreamboard-games/sdk` package and owns
its reference games, UI fixtures, Storybook, and UI Workbench.

## Develop

Use Node 24 or newer and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm check
```

`pnpm check` is the authoritative browser-free gate. It formats-checks, lints,
typechecks, checks generated reducer contracts, builds, validates package
exports, runs unit tests, and verifies all nine isolated reference games. It is
read-only from a clean checkout.

The daily command surface is deliberately small:

| Goal                                    | Command                                          |
| --------------------------------------- | ------------------------------------------------ |
| Build packages                          | `pnpm build`                                     |
| Run the browser-free gate               | `pnpm check`                                     |
| Format or check formatting              | `pnpm format` / `pnpm format:check`              |
| Lint, typecheck, or unit test           | `pnpm lint` / `pnpm typecheck` / `pnpm test`     |
| Write reducer-contract output           | `pnpm generate`                                  |
| Check reducer-contract drift            | `pnpm generate --check`                          |
| Verify one or all reference games       | `pnpm reference [game-id]`                       |
| Repin reference games after publication | `pnpm reference pin <version>`                   |
| Open Storybook                          | `pnpm ui storybook`                              |
| Open the Workbench                      | `pnpm ui workbench [--scenario <id>] [--source]` |
| Run UI tests                            | `pnpm ui test [--scenario <id>\|--all]`          |
| Accept Storybook baselines              | `pnpm ui snapshots update`                       |
| Build and verify a release candidate    | `pnpm release:verify`                            |

## Public package

`packages/sdk` is the only published workspace. Public capabilities are
exposed through `@dreamboard-games/sdk` and its export-map subpaths. The shipped
declarations, package export map, and [package README](packages/sdk/README.md)
are the API authority.

## Reference games

The nine isolated workspaces under
[`examples/reference-games/`](examples/reference-games/README.md) are complete
multi-turn teaching games and genuine packed-package consumers. Each game owns
its `rule.md`, a schema-V5 `reference-game.json`, typed scenarios, and an exact
lockfile. Start with the
[canonical example map](docs/reference/canonical-examples.md), then run a
focused proof such as:

```sh
pnpm reference hearts
```

## UI development

Storybook is the presentation loop; the Workbench replays reducer-produced
fixtures through the SDK runtime:

```sh
pnpm ui storybook
pnpm ui workbench --scenario hearts.dealt-hand.desktop
pnpm ui test
```

See [UI iteration loops](docs/reference/ui-iteration-loops.md) and
[mobile hand and card interactions](docs/reference/ui-sdk-mobile-hand-and-card-interactions.md).

## Publishing

Prepare the exact non-publishing candidate with:

```sh
pnpm release:verify
```

The candidate tarball and immutable manifest are written beneath
`build/release/candidate/`. The `Release` GitHub Actions workflow publishes that
verified artifact with npm provenance and derives `alpha`, `beta`, or `latest`
from the package version. Browser UI verification remains a separate CI lane.
See [the publishing checklist](docs/alpha-publish.md).

## License

This SDK is source-available under the PolyForm Shield License 1.0.0. It is
intended for authoring Dreamboard games and for internal/noncompeting use. It is
not licensed for building or operating a competing game authoring, publishing,
hosting, play, or platform service.
