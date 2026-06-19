# Dreamboard Reference Games

This directory contains SDK-owned reference games used to verify public package
consumption and future UI fixture coverage. They are intentionally outside the
root pnpm workspace and must remain isolated consumers of `@dreamboard-games/sdk`.

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
coverage under `test/`.

Run the Phase 1 gates from the repository root:

```bash
pnpm reference-games:check
pnpm reference-games:test:packed
pnpm reference-games:bundle
```

Reference games with a valid `demoRelease` block are packageable demo
candidates. Product-owned release sets decide whether any packageable candidate
is admitted to preview or production.
