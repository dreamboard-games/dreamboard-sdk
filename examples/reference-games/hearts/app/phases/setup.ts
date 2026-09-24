import { hearts } from "../game-model";

const setup = hearts.phase("setup");

export default setup.define({
  kind: "auto",
  initialState: () => ({}),
  enter({ tx, q }) {
    const playerIds = q.player.order();
    if (playerIds.length !== 4) {
      throw new Error(
        `Hearts requires exactly four players; got ${playerIds.length}.`,
      );
    }

    const zeroByPlayer = Object.fromEntries(
      playerIds.map((playerId) => [playerId, 0]),
    );
    tx.patchPublicState({
      playerIds,
      capturedHeartsByPlayer: zeroByPlayer,
      tricksWonByPlayer: zeroByPlayer,
      pointsByPlayer: zeroByPlayer,
    });

    // Shuffle once, then deal one card at a time in seat order.
    tx.shuffle({ zoneId: "draw-pile" });
    for (let cardNumber = 0; cardNumber < 13; cardNumber += 1) {
      for (const playerId of playerIds) {
        tx.deal({
          fromZoneId: "draw-pile",
          playerId,
          toZoneId: "hand",
          count: 1,
        });
      }
    }

    return tx.transition("passing");
  },
});
