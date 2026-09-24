# Sources

```ts
import { createGameInstance, iframeSource } from "@dreamboard-games/sdk";
export const game = createGameInstance<unknown>()({ source: iframeSource() });
```

iframeSource connects to a parent host; hostSource connects to the canonical websocket host; staticSource renders a validated immutable seat snapshot. /testing provides localSource/scenarioSource/createTestSource. Public snapshots contain me, players, basis-free frame and version. Transport owns original basis, retry and dedup identifiers. A successful ACK can precede its frame: request remains awaiting-frame. Connection failures do not imply acceptance or draft clearing.
