# Dreamboard SDK Agent Guide

This repository owns the public `@dreamboard-games/sdk` package, the reference
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
- Each `examples/reference-games/<game>/` directory is an authored workspace
  package. Its `rule.md` defines gameplay and the root lockfile owns dependency resolution.
- `reference-game.json` uses schema V5. It contains workspace, teaching,
  mechanics, UI-pattern, and rights metadata only.
- UI fixture compilation lives under `scripts/ui-fixtures/`, UI orchestration
  under `scripts/ui/`, and Workbench runtime code under
  `packages/ui-workbench/`.

## Generated output

`pnpm generate` writes reducer-contract TypeScript. `pnpm generate --check`
renders and compares without changing tracked files. Unsupported schema forms
must fail with the input path; never weaken generated types to `unknown`.

Authoring uses ordinary source imports and in-memory manifest compilation.
Workbench fixtures beneath `build/` are ignored local products; UI commands
preserve the last good output after a failed rebuild.

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

The focused form verifies one game; the default verifies Hearts and Hex.
Both forms pack the SDK once, install selected game copies against that
tarball, typecheck, and run reducer and UI tests. Workspace development
uses `workspace:*` dependencies and one root lockfile.

## UI workflow

- Use `pnpm ui storybook` for component presentation, responsive layout,
  accessibility, and motion.
- Use `pnpm ui workbench --scenario <id>` for reducer-backed runtime behavior.
  Add `--source` only for the local HMR loop; proof paths consume the built SDK.
- Use `pnpm ui test --scenario <id>` for one focused Workbench scenario.
- Use `pnpm ui test` for Storybook checks, the complete browser-driver and
  keyboard suites, and the two smoke scenarios: `hearts.dealt-hand.desktop`
  and `hearts.final-outcome.mobile`. The mobile smoke is a projection-only
  scenario until a converted game provides a mobile interaction scenario.
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
smokes that artifact, and verifies the reference games against the
same file. It writes the immutable candidate description to
`build/release/candidate/candidate.json`.

Browser UI verification remains a separate CI lane. Run `pnpm ui test` for a
pull request and `pnpm ui test --all` on the main branch.

## Pull request handoff

- Watch required checks to completion with `gh pr checks <pr> --watch`.
- Inspect every unresolved review conversation. Resolve a thread only after
  fixing the code or answering the feedback.
- Before calling a pull request mergeable, run
  `gh pr view <pr> --json isDraft,mergeable,mergeStateStatus` and require a
  ready, `MERGEABLE`, `CLEAN` result.
- Confirm the branch is pushed and the local tracked worktree is clean.
