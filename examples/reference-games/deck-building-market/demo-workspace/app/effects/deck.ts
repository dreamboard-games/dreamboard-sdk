import { z } from "zod";
import { defineEffect } from "@dreamboard-games/sdk/reducer";
import { ids, type GameContract } from "../game-contract";
import { edit } from "../reducer-support";

const OPENING_HAND = 5;

const shuffleOpeningDeckContextSchema = z.object({
  playerId: ids.playerId,
  transitionToPlayerTurn: z.boolean().default(false),
});

export const shuffleOpeningDeck = defineEffect<GameContract>()({
  type: "shufflePlayerZone",
  id: "shuffle-opening-deck",
  context: shuffleOpeningDeckContextSchema,
  reduce({ state, input, accept, fx }) {
    const tx = edit(state);
    tx.dealCardsBetweenPlayerZones({
      playerId: input.data.playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: OPENING_HAND,
    });
    return accept(tx.state, {
      instructions: input.data.transitionToPlayerTurn
        ? [fx.transition("playerTurn")]
        : [],
    });
  },
});

const shuffleDeckForDrawContextSchema = z.object({
  playerId: ids.playerId,
  drawCount: z.number().int().min(0),
  transitionToPlayerTurn: z.boolean().default(false),
  transitionToCheckGameEnd: z.boolean().default(false),
});

export type ShuffleDeckForDrawContext = z.infer<
  typeof shuffleDeckForDrawContextSchema
>;

export const shufflePlayerDeckForDraw = defineEffect<GameContract>()({
  type: "shufflePlayerZone",
  id: "shuffle-player-deck-for-draw",
  context: shuffleDeckForDrawContextSchema,
  reduce({ state, input, accept, fx }) {
    const nextEffects = input.data.transitionToCheckGameEnd
      ? [fx.transition("checkGameEnd")]
      : input.data.transitionToPlayerTurn
        ? [fx.transition("playerTurn")]
        : [];

    const tx = edit(state);
    tx.dealCardsBetweenPlayerZones({
      playerId: input.data.playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: input.data.drawCount,
    });
    return accept(tx.state, { instructions: nextEffects });
  },
});
