# Hex Network Trading

```sh
pnpm ui dev --game hex-network-trading
pnpm ui test --game hex-network-trading
pnpm reference hex-network-trading
```

Read the [rules](../../examples/reference-games/hex-network-trading/rule.md),
[game definition](../../examples/reference-games/hex-network-trading/app/game.ts),
[typed hook](../../examples/reference-games/hex-network-trading/ui/game.ts), and
[local developer entry](../../examples/reference-games/hex-network-trading/ui/dev.tsx).
The hosted entry imports game types only; local dev imports executable scenarios.
Named checkpoints, seat switching and JSON save/restore use canonical sources.
Desktop/touch browser tests exercise real cards/board targets, authoritative
frames, keyboard access and selected-seat privacy. No fixture tape or Workbench
is part of this workflow.
