# Reference games

[Hearts](hearts/rule.md) and [Hex Network Trading](hex-network-trading/rule.md) are
ordinary workspace packages. Each owns its manifest, reducer, hosted UI, local
scenario entry and browser tests. `ui/game.ts` binds the typed hook; `ui/index.tsx`
is hosted, while `ui/dev.tsx` imports executable local tooling. The root lockfile
owns dependencies; `reference-game.json` records teaching and rights metadata.

Run `pnpm reference [game-id]` to verify isolated game copies against one SDK
artifact. `pnpm ui dev --game <id>` opens the local scenario UI; `pnpm ui test`
proves registry installation and both games in desktop/touch browsers.
