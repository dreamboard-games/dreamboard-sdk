# Sources

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
export const game = createGameInstance<unknown>()({ source: iframeSource() });
```

iframeSource connects to a parent host; hostSource connects to the canonical websocket host; staticSource renders a validated immutable seat snapshot. /testing provides localSource/scenarioSource/createTestSource. Public snapshots contain me, players, basis-free frame and version. Transport owns original basis, retry and dedup identifiers. A successful ACK can precede its frame: request remains awaiting-frame. Connection failures do not imply acceptance or draft clearing.

Terminal source failures are available as `source.store.get().failure` and
`game.failure` (also `game.getSnapshot().failure`). The value is the original,
frozen `Error`, retained locally for diagnostics; do not serialize it or display
arbitrary diagnostic details to players. A terminal failure sets `connection: "failed"`. A normal `dispose()` closes the source
with `failure: null`. Disposing an already failed source preserves its failed state and error.
Both terminal states retain the last snapshot, or `null` if none arrived.
A ready source always has a snapshot; recovery can begin before the first snapshot.

```ts
const source = iframeSource();
const game = createGameInstance<unknown>()({
  source,
  onError(error) {
    // Called once for a terminal source failure, including startup and idle errors.
    console.error("Gameplay connection failed", error);
  },
});
const unsubscribe = game.subscribe(() => {
  if (game.failure) {
    // Render a connection error state and offer a fresh connection.
  }
});
// On teardown:
unsubscribe();
game.dispose();
```

Pending submit promises still reject with the original error. A terminal source
failure reaches `onError` once, even when a submit handler also observes that
rejection. Failures after an accepted ACK remain observable while the source
waits for the authoritative frame. Replacing a source starts a new lifetime;
normal disposal and obsolete source callbacks do not notify the new lifetime.
React selectors can read `useGame((snapshot) => snapshot.failure)`.
