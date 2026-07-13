import type { EdgeId, ResourceId } from "../../shared/manifest-contract";
import { setupTrailAuthoring } from "../authoring";
import { startingTrailTarget } from "../eligibility";
import { producingHexesAtIntersection } from "../model";
import {
  appendHistory,
  detachedPiece,
  edit,
  setupPlayerId,
  systemEvent,
} from "../reducer-support";

const placeStartingTrail = setupTrailAuthoring.interaction({
  inputs: {
    edgeId: setupTrailAuthoring.inputs.board.edge<EdgeId>({
      target: startingTrailTarget,
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
  reduce({ state, input, accept, fx, q }) {
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
    const tx = edit(state);
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
    const next = appendHistory(tx.state, {
      kind: "startingTrail",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} completed a starting camp-and-trail pair.`,
    });
    return accept(next, {
      instructions: [fx.transition(finalPlacement ? "roll" : "setupCamp")],
      events: [
        systemEvent({
          procedureId: "stormtrail-setup",
          title: "Starting trail placed",
          summary: `${input.playerId} gained ${Object.values(grants).reduce(
            (sum, count) => sum + (count ?? 0),
            0,
          )} adjacent supplies.`,
        }),
      ],
    });
  },
});

export const setupTrail = setupTrailAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => setupPlayerId(state, q),
  enter({ state, accept, q }) {
    const tx = edit(state);
    tx.setActivePlayers([setupPlayerId(state, q)]);
    return accept(tx.state);
  },
  interactions: { placeStartingTrail },
});
