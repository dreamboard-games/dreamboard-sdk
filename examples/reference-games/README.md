# Dreamboard Reference Games

This directory contains nine SDK-owned, complete multi-turn teaching games.
They verify public package consumption, typed scenario authoring, Workbench UI
behavior, and product-demo replay. They are intentionally outside the root pnpm
workspace and must remain isolated consumers of `@dreamboard-games/sdk`.

The approved game-local `rule.md` files are gameplay authority. Reducers, tests,
screenshots, and generated output are evidence only. Their base-free scenario,
on-demand generation, and cross-repository migration are defined by the
[Reference Game Rule Conformance And Agent Testing Hard Cut](../../docs/exec-plans/reference-game-rule-conformance-hard-cut/README.md).

Reference IDs describe mechanics and UI patterns rather than product names:

- `hearts`
- `hex-network-trading`
- `automa-river-rival`
- `deck-building-market`
- `multiplayer-ranking-and-ties`
- `roll-and-write-scorecard`
- `simultaneous-card-drafting`
- `solo-countdown-puzzle`
- `worker-placement-tableau`

Each game has a `reference-game.json` provenance manifest, its own
`package.json`, its own `pnpm-lock.yaml`, workspace source, and scenario
coverage under `test/`. All nine lockfiles are intentionally checked in: each
records the exact public SDK artifact consumed by that isolated game. Do not
consolidate or hand-edit them.

## Agent Authoring Loop

Read `rule.md` and a typed file under `test/scenarios/`. Use
`dreamboard test inspect` to understand a checkpoint and
`dreamboard test explore` to obtain concrete replay-accepted commands as JSON.
Add the chosen command to the typed scenario, then run `pnpm verify` from that
game's package root. Workbench checkpoints, inspection, exploration, reducer
tests, and demo replay all derive from that one scenario source; do not author
or commit base states, generated projections, catalogs, fixtures, or
checkpoints.

Repository tools materialize ignored workspace contracts and Workbench output
before consuming them. Run the SDK gates from the repository root:

```bash
pnpm reference-games:check
pnpm reference-games:test:packed
pnpm reference-games:bundle
pnpm ui:catalog:check
pnpm docs:check
```

Reference games with a valid `demoRelease` block are packageable demo
candidates. Product-owned release sets decide whether any packageable candidate
is admitted to preview or production.

Packageable games declare `demoRelease.thumbnailPath` as a game-relative path
under `assets/`. The file must exist and have a matching entry in the
game-local `assets/LICENSES.json`. Release assembly owns the public thumbnail
URL; reference metadata must not use the retired `heroImageUrl` or
`demoRelease.screenshot` fields.
