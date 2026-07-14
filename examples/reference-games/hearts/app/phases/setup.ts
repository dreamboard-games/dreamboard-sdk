import { definePhase } from "@dreamboard-games/sdk/reducer";
import { setupPhaseStateSchema, type GameContract } from "../game-contract";

export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const playerIds = q.player.order();
    if (playerIds.length !== 4) {
      throw new Error(
        `Hearts requires exactly four players; got ${playerIds.length}.`,
      );
    }

    const tx = edit(state);
    const zeroByPlayer = Object.fromEntries(
      playerIds.map((playerId) => [playerId, 0]),
    );
    tx.patchPublicState({
      playerIds,
      capturedHeartsByPlayer: zeroByPlayer,
      tricksWonByPlayer: zeroByPlayer,
      pointsByPlayer: zeroByPlayer,
    });

    // Deal one card at a time in seat order. The setup profile has already
    // performed the one trusted seeded shuffle of the shared draw pile.
    for (let cardNumber = 0; cardNumber < 13; cardNumber += 1) {
      for (const playerId of playerIds) {
        tx.dealCardsToPlayerZone({
          fromZoneId: "draw-pile",
          playerId,
          toZoneId: "hand",
          count: 1,
        });
      }
    }

    return accept(tx.state, { instructions: [fx.transition("passing")] });
  },
});
