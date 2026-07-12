import type { VertexId } from "../../shared/manifest-contract";
import { setupCampAuthoring } from "../authoring";
import { startingCampTarget } from "../eligibility";
import {
  appendHistory,
  detachedPiece,
  edit,
  setupPlayerId,
  systemEvent,
} from "../reducer-support";

const placeStartingCamp = setupCampAuthoring.interaction({
  inputs: {
    intersectionId: setupCampAuthoring.inputs.board.vertex<VertexId>({
      target: startingCampTarget,
    }),
  },
  rules: [
    {
      id: "camp-piece-available",
      errorCode: "CAMP_PIECES_EXHAUSTED",
      validate: ({ state, input }) =>
        detachedPiece(state, input.playerId, "camp") !== null,
    },
  ],
  reduce({ state, input, accept, fx }) {
    const campId = detachedPiece(state, input.playerId, "camp");
    if (!campId) throw new Error("Starting camp piece is unavailable.");
    const tx = edit(state);
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
    const next = appendHistory(tx.state, {
      kind: "startingCamp",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} established a starting camp.`,
    });
    return accept(next, {
      instructions: [fx.transition("setupTrail")],
      events: [
        systemEvent({
          procedureId: "stormtrail-setup",
          title: "Starting camp placed",
          summary: `${input.playerId} chose ${input.params.intersectionId}.`,
        }),
      ],
    });
  },
});

export const setupCamp = setupCampAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => setupPlayerId(state, q),
  enter({ state, accept, event, q }) {
    const tx = edit(state);
    if (event === "initialize") {
      tx.moveComponentToSpace({
        componentId: "bandits",
        boardId: "frontier",
        spaceId: "centralBarrens",
      });
    }
    tx.setActivePlayers([setupPlayerId(tx.state, q)]);
    return accept(tx.state);
  },
  interactions: { placeStartingCamp },
});
