# Reference games

Hearts and Hex Network Trading are ordinary workspace packages that import the
SDK through `workspace:*`. The root lockfile records their dependencies.

Each game owns `manifest.ts`, `app/game.ts`, UI modules, and typed scenarios.
`app/manifest.ts` compiles topology in memory; `ui/game-ui.ts` binds the inferred
UI contract. There are no generated authoring files.

Run `pnpm reference [game-id]` from the repository root to verify the packed SDK
against either game or both. Run a game's `typecheck` and `test` scripts for
focused development. `rule.md` defines gameplay; `reference-game.json` retains
teaching, rights, and Workbench metadata.
