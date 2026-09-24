# Dreamboard SDK Agent Guide

This repository owns the public `@dreamboard-games/sdk` package, the reference
games, source-copy UI registry, Storybook, and scenario developer tooling. Keep operational rules
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
pnpm reference [game-id]
pnpm ui storybook
pnpm ui dev --game <id>
pnpm ui test [--game <id>]
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
- UI orchestration lives under `scripts/ui/`. Registry Storybook and browser
  proofs live under `registry/`; each reference game owns its real local scenario
  development entry and Playwright suite.

## Generated output

Runtime wire schemas and their inferred DTOs are authored in the SDK shared owner.

Authoring uses ordinary source imports and in-memory manifest compilation.
Storybook builds and browser screenshots beneath `build/` are ignored local products.

## Reference-game workflow

Read the game-local `rule.md`, then a typed source under `test/scenarios/`.
Use the local scenario developer entry to select named checkpoints, switch seats,
and save or restore JSON checkpoints. Testing sources expose inspect/explore/apply
for programmatic inspection. Keep typed scenarios as the authored authority.

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

- Use `pnpm ui storybook` for source-registry components and real scenario stories.
- Use `pnpm ui dev --game <id>` for the authored local development entry.
  Its URL selects `scenario`, `at` checkpoint, and `as` player ID.
- Use `pnpm ui test --game <id>` for one game's desktop/touch browser suite.
- Use `pnpm ui test` for pure and bound registry installation proof, Storybook
  browser checks, and both real game browser suites.

Browser tests perform physical actions and assert authoritative frame changes,
private-seat isolation, drafts, cancellation, restore, keyboard/touch access,
layout and Axe results directly. Screenshots and traces are failure artifacts.

## Release verification

`pnpm release:verify` runs the shared core checks, creates one SDK tarball,
smokes that artifact, and verifies the reference games against the
same file. It writes the immutable candidate description to
`build/release/candidate/candidate.json`.

Browser UI verification remains a separate CI lane. Run `pnpm ui test` for both
pull requests and the main branch.

## Pull request handoff

- Watch required checks to completion with `gh pr checks <pr> --watch`.
- Inspect every unresolved review conversation. Resolve a thread only after
  fixing the code or answering the feedback.
- Before calling a pull request mergeable, run
  `gh pr view <pr> --json isDraft,mergeable,mergeStateStatus` and require a
  ready, `MERGEABLE`, `CLEAN` result.
- Confirm the branch is pushed and the local tracked worktree is clean.
