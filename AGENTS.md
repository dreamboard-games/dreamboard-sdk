# Dreamboard SDK Agent Guide

This repository owns the public `@dreamboard-games/sdk` package, nine reference
games, UI fixtures, Storybook, and the SDK UI Workbench. Keep operational rules
here; put durable design explanations in `docs/`.

## Environment and commands

- Use `pnpm`, Node 24 or newer, and the pinned `pnpm@10.4.1`.
- Install with `pnpm install --frozen-lockfile`.
- Use `pnpm check` as the authoritative browser-free clean-checkout gate. It
  must not change tracked files.
- Iterate with the narrowest command, then run the relevant aggregate gate.

The root command surface is intentionally small:

```sh
pnpm build
pnpm check
pnpm format
pnpm format:check
pnpm lint
pnpm test
pnpm typecheck
pnpm generate [--check]
pnpm reference [game-id]
pnpm reference pin <version>
pnpm ui storybook
pnpm ui workbench [--scenario <id>] [--source]
pnpm ui test [--scenario <id>|--all]
pnpm ui snapshots update
pnpm release:verify
```

Do not add forwarding aliases. Extend the typed command implementation when a
new behavior genuinely belongs in this repository.

## Repository boundaries

- `packages/sdk` is the only published package. The other root workspace
  packages are unpublished implementation inputs.
- The package declarations, export map, and authored package README define the
  public API. Do not generate a second API reference.
- `scripts/` is Node 24 TypeScript. Prefer shared typed helpers and
  `node:util.parseArgs`; do not add a command framework for this small surface.
- Each `examples/reference-games/<game>/` directory is an isolated authored
  game. Its `rule.md` defines gameplay and its checked-in lockfile records the
  exact published SDK dependency.
- `reference-game.json` uses schema V5. It contains workspace, teaching,
  mechanics, UI-pattern, and rights metadata only.
- UI fixture compilation lives under `scripts/ui-fixtures/`, UI orchestration
  under `scripts/ui/`, and Workbench runtime code under
  `packages/ui-workbench/`.

## Generated output

`pnpm generate` writes reducer-contract TypeScript. `pnpm generate --check`
renders and compares without changing tracked files. Unsupported schema forms
must fail with the input path; never weaken generated types to `unknown`.

Reference-game workspace contracts and Workbench materialization beneath
`build/` are ignored local products. The UI commands materialize them when
needed and preserve the last good Workbench output after a failed rebuild. Do
not commit ignored materialization or hand-edit generated contracts.

## Reference-game workflow

Read the game-local `rule.md`, then a typed source under `test/scenarios/`.
Use `dreamboard test inspect` and `dreamboard test explore` to examine named
checkpoints and obtain replay-accepted commands. Keep the typed scenario as the
authored authority; generated projections and fixtures are disposable.

From the repository root:

```sh
pnpm reference hearts
pnpm reference
```

The focused form verifies one game. The default verifies all nine. Both validate
the checked-in lockfile, pack the SDK once, install the selected game copies
against that tarball, materialize, typecheck, and run reducer and UI tests.
After publishing, run `pnpm reference pin <version>` to atomically repin every
game manifest and lockfile to one exact npm version.

## UI workflow

- Use `pnpm ui storybook` for component presentation, responsive layout,
  accessibility, and motion.
- Use `pnpm ui workbench --scenario <id>` for reducer-backed runtime behavior.
  Add `--source` only for the local HMR loop; proof paths consume the built SDK.
- Use `pnpm ui test --scenario <id>` for one focused Workbench scenario.
- Use `pnpm ui test` for Storybook checks, the complete browser-driver and
  keyboard suites, and the two interaction smoke scenarios:
  `hearts.dealt-hand.desktop` and
  `roll-and-write-scorecard.mark-cell.mobile`.
- Use `pnpm ui test --all` to add every authored Workbench scenario.
- Use `pnpm ui snapshots update` only when intentionally accepting new tracked
  Storybook baselines.

Workbench browser tests must perform the physical action and assert measured
projection, semantic, draft, submission, actuator, layout, motion, and Axe
results directly. Touch-capable projects use `tap()`; desktop projects use
`click()`. Drag coverage belongs to the browser-driver suite. Screenshots,
traces, and video are ordinary failure artifacts.

## Release verification

`pnpm release:verify` runs the shared core checks, creates one SDK tarball,
smokes that artifact, and verifies all nine reference games against the same
file. It writes the immutable candidate description to
`build/release/candidate/candidate.json`.

Browser UI verification remains a separate CI lane. Run `pnpm ui test` for a
pull request and `pnpm ui test --all` on the main branch.
