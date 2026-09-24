# Hearts

```sh
pnpm ui dev --game hearts
pnpm ui test --game hearts
pnpm reference hearts
```

Read the [rules](../../examples/reference-games/hearts/rule.md),
[game definition](../../examples/reference-games/hearts/app/game.ts),
[typed hook](../../examples/reference-games/hearts/ui/game.ts), and
[local developer entry](../../examples/reference-games/hearts/ui/dev.tsx).
The hosted entry imports game types only; local dev imports executable scenarios.
Named checkpoints, seat switching and JSON save/restore use canonical sources.
Desktop/touch browser tests exercise real cards/board targets, authoritative
frames, keyboard access and selected-seat privacy. No fixture tape or Workbench
is part of this workflow.
