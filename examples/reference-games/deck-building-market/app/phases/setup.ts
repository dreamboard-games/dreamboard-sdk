import { definePhase } from "@dreamboard-games/sdk/reducer";
import {
  sketchbookPhaseStateSchema,
  type GameContract,
} from "../game-contract";
import { shuffleOpeningDeck } from "../effects/deck";
import { FRESH_TURN } from "./player-turn/state";
import { appendHistory, edit } from "../reducer-support";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: sketchbookPhaseStateSchema,
  initialState: () => ({ ...FRESH_TURN }),
  enter({ state, accept, q, fx }) {
    const playerIds = q.player.order();
    if (playerIds.length !== 2) {
      throw new Error("Sketchbook requires exactly two players.");
    }
    const doodles = q.zone.sharedCards("supply-doodle");
    const ideas = q.zone.sharedCards("supply-idea");
    const tx = edit(state);
    tx.setActivePlayers([playerIds[0]!]);
    for (const [seat, playerId] of playerIds.entries()) {
      for (const cardId of doodles.slice(seat * 7, seat * 7 + 7)) {
        tx.moveCardFromSharedZoneToPlayerZone({
          playerId,
          fromZoneId: "supply-doodle",
          toZoneId: "deck",
          cardId,
        });
      }
      for (const cardId of ideas.slice(seat * 3, seat * 3 + 3)) {
        tx.moveCardFromSharedZoneToPlayerZone({
          playerId,
          fromZoneId: "supply-idea",
          toZoneId: "deck",
          cardId,
        });
      }
    }
    const next = appendHistory(tx.state, {
      kind: "setup",
      actorPlayerId: null,
      cardId: null,
      summary: "Both artists shuffled ten-card starting decks and drew five.",
    });
    return accept(next, {
      instructions: playerIds.map((playerId, seat) =>
        fx.effect(shuffleOpeningDeck, {
          playerId,
          zoneId: "deck",
          context: { playerId, startGame: seat === playerIds.length - 1 },
        }),
      ),
    });
  },
});
