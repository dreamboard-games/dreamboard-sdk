import { tileSpaceId } from "@dreamboard-games/sdk/reducer";
import { emptyIntersection } from "../eligibility";
import {
  appendHistory,
  supplyPiece,
  setupPlayerId,
  systemEvent,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const setupCamp = stormtrail.phase("setupCamp");

const placeStartingCamp = setupCamp.interaction({
  inputs: {
    intersectionId: setupCamp.inputs.board.vertex({
      boardId: "frontier",
      where: emptyIntersection,
    }),
  },
  rules: [
    {
      id: "camp-piece-available",
      errorCode: "CAMP_PIECES_EXHAUSTED",
      validate: ({ input, q }) =>
        supplyPiece(q, input.playerId, "camp") !== null,
    },
  ],
  reduce({ tx, input, q }) {
    const campId = supplyPiece(q, input.playerId, "camp");
    if (!campId) throw new Error("Starting camp piece is unavailable.");
    tx.moveComponentToVertex({
      componentId: campId,
      boardId: "frontier",
      vertexId: input.params.intersectionId,
    });
    tx.patchPublicState((publicState) => ({
      ...publicState,
      setup: publicState.setup
        ? {
            ...publicState.setup,
            pendingIntersectionId: input.params.intersectionId,
          }
        : null,
    }));
    appendHistory(tx, {
      kind: "startingCamp",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} established a starting camp.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-setup",
        title: "Starting camp placed",
        summary: `${input.playerId} chose ${input.params.intersectionId}.`,
      }),
    );
    return tx.transition("setupTrail");
  },
});

export default setupCamp.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => setupPlayerId(state, q),
  enter({ tx, event, q }) {
    if (event === "initialize") {
      tx.moveComponentToSpace({
        componentId: "bandits",
        boardId: "frontier",
        spaceId: tileSpaceId("centralBarrens", "cell"),
      });
    }
    tx.setActivePlayers([setupPlayerId(tx.state, q)]);
  },
  interactions: { placeStartingCamp },
});
