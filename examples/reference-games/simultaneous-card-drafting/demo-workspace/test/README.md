# Dreamboard Test Workspace

TypeScript bases live in `test/bases/*.base.ts` and scenarios live in `test/scenarios/*.scenario.ts`.

1. Define reusable seeded bases with `defineBase({ id, seed, players, setupProfileId?, setup })`.
2. Define scenarios with `defineScenario({ id, from, when, then })`.
3. Scenario assertions can read `players()`, `state()`, `view(playerId)`, and `interactions(playerId)`.
4. Generate deterministic base snapshots: `dreamboard test generate`.
5. Run tests: `dreamboard test run`.

Import test helpers from `../testing-types`.

Generated artifacts are written to `test/generated/*` and should not be edited manually.
