import { z } from "zod";
import { defineEffect } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "../game-contract";
import { ids } from "../game-contract";
import { edit } from "../reducer-support";

const openingContextSchema = z.object({
  playerId: ids.playerId,
  startGame: z.boolean(),
});

export const shuffleOpeningDeck = defineEffect<GameContract>()({
  type: "shufflePlayerZone",
  id: "shuffle-opening-deck",
  context: openingContextSchema,
  reduce({ state, input, accept, fx }) {
    const tx = edit(state);
    tx.dealCardsBetweenPlayerZones({
      playerId: input.data.playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: 5,
    });
    return accept(tx.state, {
      instructions: input.data.startGame ? [fx.transition("playerTurn")] : [],
    });
  },
});

const reshuffleContextSchema = z.object({
  playerId: ids.playerId,
  drawCount: z.number().int().nonnegative(),
  checkEndAfterDraw: z.boolean(),
});

export const shuffleDeckForDraw = defineEffect<GameContract>()({
  type: "shufflePlayerZone",
  id: "shuffle-deck-for-draw",
  context: reshuffleContextSchema,
  reduce({ state, input, accept, fx }) {
    const tx = edit(state);
    tx.dealCardsBetweenPlayerZones({
      playerId: input.data.playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: input.data.drawCount,
    });
    return accept(tx.state, {
      instructions: input.data.checkEndAfterDraw
        ? [fx.transition("checkGameEnd")]
        : [],
    });
  },
});
