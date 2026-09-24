# Phases

```ts
import { model } from "./model";
const play = model.phase("play");
export default play.define({
  kind: "player",
  initialState: () => ({}),
  enter({ tx, state }) {
    tx.setActivePlayers([state.table.playerOrder[0]]);
  },
  interactions: {},
});
```

Player, simultaneousPlayer and auto phases share transaction execution. Every actual phase entry clears pending steps, including leaving and reentering the same named phase. Rejected operations roll back state, RNG and events. Use tx.transition and tx.endGame for lifecycle changes; automatic entries are part of the outer operation.
