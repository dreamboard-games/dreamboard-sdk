import assert from "node:assert/strict";
import { test } from "node:test";
import {
  discardCardsParamsSchema,
  offerTradeParamsSchema,
} from "../app/phases/player-turn/index.ts";
import type { PlayerId } from "../shared/manifest-contract.ts";

// The schema narrows `targetPlayerIds` to branded `PlayerId[]`. The input
// and expected arrays are authored as raw strings and cast at the boundary
// so runtime parsing stays schema-driven while the expectation still lines
// up with the branded output type.
const TARGETS: PlayerId[] = ["player-2", "player-3"] as PlayerId[];

test("offerTrade params accept sparse give and want payloads", () => {
  assert.deepEqual(
    offerTradeParamsSchema.parse({
      give: { timber: 1 },
      want: { clay: 1 },
      targetPlayerIds: TARGETS,
    }),
    {
      give: { timber: 1 },
      want: { clay: 1 },
      targetPlayerIds: TARGETS,
    },
  );
});

test("discardCards params accept sparse discard payloads", () => {
  assert.deepEqual(
    discardCardsParamsSchema.parse({
      toDiscard: { iron: 2, cloth: 1 },
    }),
    {
      toDiscard: { iron: 2, cloth: 1 },
    },
  );
});
