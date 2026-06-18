# Dreamboard Reference Games

This directory contains SDK-owned reference games used to verify public package
consumption and future UI fixture coverage. They are intentionally outside the
root pnpm workspace and must remain isolated consumers of `@dreamboard-games/sdk`.

Reference IDs describe mechanics and UI patterns rather than product names:

- `hearts`
- `hex-network-trading`
- `deck-building-market`
- `worker-placement-tableau`
- `simultaneous-card-drafting`
- `roll-and-write-scorecard`
- `multiplayer-ranking-and-ties`

Each game has a `reference-game.json` provenance manifest, its own
`package.json`, its own `pnpm-lock.yaml`, source under `src/`, and scenario
coverage under `scenarios/`.

Run the Phase 1 gates from the repository root:

```bash
pnpm reference-games:check
pnpm reference-games:test:packed
pnpm reference-games:bundle
```

The reference games are not demo-gallery entries and all manifests set
`publishToDemoGallery` to `false`.
