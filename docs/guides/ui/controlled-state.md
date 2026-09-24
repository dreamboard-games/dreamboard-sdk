# Controlled state

```ts
import type { GameInstance, LocalState } from "@dreamboard-games/sdk";
export function installState(
  game: GameInstance<unknown>,
  state: Partial<LocalState<unknown>>,
) {
  game.setOptions({ ...game.getOptions(), state });
}
```

Use state.drafts/state.activeInteraction with onDraftsChange/onActiveInteractionChange for controlled ownership; initialState initializes uncontrolled fields. Handlers read current options. Reconciliation requests controlled updates through callbacks without hidden shadow state. Accepted requests clear only the exact submitted edit revision after the source frame barrier; newer edits, including edit-away-and-back, survive. Rejections retain valid drafts. Phase/seat/source changes invalidate stale selections.
