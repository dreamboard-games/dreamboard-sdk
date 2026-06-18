import { expect, test } from "bun:test";
import {
  discardCardsParamsSchema,
  offerTradeParamsSchema,
} from "../app/phases/player-turn";
import type { PlayerId } from "../shared/manifest-contract";

// The schema narrows `targetPlayerIds` to branded `PlayerId[]`. The input
// and expected arrays are authored as raw strings and cast at the boundary
// so runtime parsing stays schema-driven while the expectation still lines
// up with the branded output type.
const TARGETS: PlayerId[] = ["player-2", "player-3"] as PlayerId[];

test("offerTrade params accept sparse give and want payloads", () => {
  expect(
    offerTradeParamsSchema.parse({
      give: { timber: 1 },
      want: { clay: 1 },
      targetPlayerIds: TARGETS,
    }),
  ).toEqual({
    give: { timber: 1 },
    want: { clay: 1 },
    targetPlayerIds: TARGETS,
  });
});

test("discardCards params accept sparse discard payloads", () => {
  expect(
    discardCardsParamsSchema.parse({
      toDiscard: { iron: 2, cloth: 1 },
    }),
  ).toEqual({
    toDiscard: { iron: 2, cloth: 1 },
  });
});
