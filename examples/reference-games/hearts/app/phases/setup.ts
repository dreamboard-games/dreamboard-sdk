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
    tx.shuffle({ zone: { zoneId: "draw-pile" } });
    for (let cardNumber = 0; cardNumber < 13; cardNumber += 1) {
      for (const playerId of playerIds) {
        tx.deal({
          from: { zoneId: "draw-pile" },
          to: { zoneId: "hand", hostId: playerId },
          count: 1,
        });
      }
    }

    for (const playerId of playerIds)
      for (const componentId of tx.q.zone("hand", playerId))
        tx.setComponentOwner({ componentId, ownerId: playerId });

    return tx.transition("passing");
  },
});
