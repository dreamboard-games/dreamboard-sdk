import type { ResourceId } from "../manifest";
import { emptyEdge, touchesStartingCamp } from "../eligibility";
import { producingHexesAtIntersection } from "../model";
import {
  appendHistory,
  detachedPiece,
  setupPlayerId,
  systemEvent,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const setupTrail = stormtrail.phase("setupTrail");

const placeStartingTrail = setupTrail.interaction({
  inputs: {
    edgeId: setupTrail.inputs.board.edge({
      boardId: "frontier",
      where: [emptyEdge, touchesStartingCamp],
    }),
  },
  rules: [
    {
      id: "trail-piece-available",
      errorCode: "TRAIL_PIECES_EXHAUSTED",
      validate: ({ state, input }) =>
        detachedPiece(state, input.playerId, "trail") !== null,
    },
  ],
  reduce({ state, tx, input, q }) {
    const trailId = detachedPiece(state, input.playerId, "trail");
    const setup = state.publicState.setup;
    const intersectionId = setup?.pendingIntersectionId;
    if (!trailId || !setup || !intersectionId) {
      throw new Error(
        "Starting trail requires a pending camp and trail piece.",
      );
    }
    const grants = producingHexesAtIntersection(intersectionId).reduce<
      Partial<Record<ResourceId, number>>
    >((counts, { resourceId }) => {
      counts[resourceId] = (counts[resourceId] ?? 0) + 1;
      return counts;
    }, {});
    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId: input.params.edgeId,
    });
    if (Object.keys(grants).length > 0) {
      tx.addResources({ playerId: input.playerId, amounts: grants });
    }

    const finalPlacement = setup.playerIndex === q.player.order().length - 1;
    tx.patchPublicState({
      setup: finalPlacement
        ? null
        : {
            playerIndex: setup.playerIndex + 1,
            pendingIntersectionId: null,
          },
      ...(finalPlacement ? { activePlayerIndex: 0 } : {}),
    });
    if (finalPlacement) {
      tx.setActivePlayers([q.player.order()[0]!]);
    }
    appendHistory(tx, {
      kind: "startingTrail",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} completed a starting camp-and-trail pair.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-setup",
        title: "Starting trail placed",
        summary: `${input.playerId} gained ${Object.values(grants).reduce(
          (sum, count) => sum + (count ?? 0),
          0,
        )} adjacent supplies.`,
      }),
    );
    return tx.transition(finalPlacement ? "roll" : "setupCamp");
  },
});

export default setupTrail.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => setupPlayerId(state, q),
  enter({ state, tx, q }) {
    tx.setActivePlayers([setupPlayerId(state, q)]);
  },
  interactions: { placeStartingTrail },
});
