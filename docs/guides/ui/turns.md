# Turns and players

```ts
import type { GameInstance } from "@dreamboard-games/sdk";
export function turnLabel(game: GameInstance<unknown>) {
  return game.turn.isMine ? "Your turn" : "Waiting";
}
```

turn.currentPlayerId is the sole active player when exactly one is active, otherwise null. turn.isMine means membership in activePlayerIds, not sole ownership. me.getCanAct checks currently legal enabled interactions. Other player objects expose truthful identity/order/isMe only, not inferred private actionability.
