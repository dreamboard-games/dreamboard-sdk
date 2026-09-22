import { defineInputs } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import {
  ids,
  literals,
  type PlayerId,
  type ResourceId,
} from "../../shared/manifest-contract";
import {
  connectedNetwork,
  connectedTrail,
  emptyBuildIntersection,
  emptyEdge,
} from "../eligibility";
import { resourceCountsSchema, type ResourceCounts } from "../game-model";
import { hasPositiveResource, resourceMapsOverlap } from "../model";
import {
  appendHistory,
  campCount,
  CAMP_COST,
  detachedPiece,
  fourthCampOutcome,
  remainingPieceCount,
  systemEvent,
  TRAIL_COST,
  turnOwnerPlayerId,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const main = stormtrail.phase("main");

const buildTrail = main.interaction({
  inputs: {
    edgeId: main.inputs.board.edge({
      boardId: "frontier",
      where: [emptyEdge, connectedNetwork],
    }),
  },
  rules: [
    {
      id: "trail-piece-available",
      errorCode: "TRAIL_PIECES_EXHAUSTED",
      validate: ({ state, input }) =>
        remainingPieceCount(state, input.playerId, "trail") > 0,
    },
    {
      id: "trail-cost",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, TRAIL_COST),
    },
  ],
  reduce({ state, tx, input }) {
    const trailId = detachedPiece(state, input.playerId, "trail");
    if (!trailId) throw new Error("Trail piece is unavailable.");
    tx.spendResources({ playerId: input.playerId, amounts: TRAIL_COST });
    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId: input.params.edgeId,
    });
    appendHistory(tx, {
      kind: "buildTrail",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} built a trail.`,
    });
  },
});

const buildCamp = main.interaction({
  inputs: {
    intersectionId: main.inputs.board.vertex({
      boardId: "frontier",
      where: [emptyBuildIntersection, connectedTrail],
    }),
  },
  rules: [
    {
      id: "camp-piece-available",
      errorCode: "CAMP_PIECES_EXHAUSTED",
      validate: ({ state, input }) =>
        remainingPieceCount(state, input.playerId, "camp") > 0,
    },
    {
      id: "camp-cost",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) => q.player.canAfford(input.playerId, CAMP_COST),
    },
  ],
  reduce({ state, tx, input, q }) {
    const campId = detachedPiece(state, input.playerId, "camp");
    if (!campId) throw new Error("Camp piece is unavailable.");
    tx.spendResources({ playerId: input.playerId, amounts: CAMP_COST });
    tx.moveComponentToVertex({
      componentId: campId,
      boardId: "frontier",
      vertexId: input.params.intersectionId,
    });
    appendHistory(tx, {
      kind: "buildCamp",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} built camp ${campCount(tx.state, input.playerId)}.`,
    });
    if (campCount(tx.state, input.playerId) < 4) return;

    const outcome = fourthCampOutcome(q.player.order(), input.playerId);
    tx.patchPublicState({ outcome });
    tx.setActivePlayers([]);
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-victory",
        title: "Fourth camp established",
        summary: `${input.playerId} wins immediately.`,
      }),
    );
    return tx.endGame(outcome, { transition: "gameOver" });
  },
});

const tradeWithSupplyDepot = main.interaction({
  inputs: defineInputs((input) => {
    const giveResource = input.add(
      "giveResource",
      main.inputs.form.choice<ResourceId>({
        choices: ({ q, playerId }) =>
          literals.resourceIds
            .filter(
              (resourceId) => q.player.resource(playerId, resourceId) >= 3,
            )
            .map((resourceId) => ({ value: resourceId, label: resourceId })),
        defaultValue: ({ choices }) => choices[0]?.value,
      }),
    );
    return {
      giveResource,
      receiveResource: input.add(
        "receiveResource",
        main.inputs.form.choice({
          dependsOn: [giveResource],
          choices: ({ values }) =>
            literals.resourceIds
              .filter((resourceId) => resourceId !== values.giveResource)
              .map((resourceId) => ({
                value: resourceId,
                label: resourceId,
              })),
          defaultValue: ({ choices }) => choices[0]?.value,
        }),
      ),
    };
  }),
  paramsSchema: z.object({
    giveResource: ids.resourceId,
    receiveResource: ids.resourceId,
  }),
  rules: [
    {
      id: "different-resources",
      errorCode: "INVALID_DEPOT_TRADE",
      validate: ({ input }) =>
        input.params.giveResource !== input.params.receiveResource,
    },
    {
      id: "three-for-one",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.resource(input.playerId, input.params.giveResource) >= 3,
    },
  ],
  reduce({ tx, input }) {
    tx.spendResources({
      playerId: input.playerId,
      amounts: { [input.params.giveResource]: 3 },
    });
    tx.addResources({
      playerId: input.playerId,
      amounts: { [input.params.receiveResource]: 1 },
    });
    appendHistory(tx, {
      kind: "depotTrade",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} exchanged 3 ${input.params.giveResource} for 1 ${input.params.receiveResource}.`,
    });
  },
});

const offerTrade = main.interaction({
  inputs: defineInputs((input) => {
    const targetPlayerId = input.add(
      "targetPlayerId",
      main.inputs.form.choice<PlayerId>({
        choices: ({ q, playerId }) =>
          q.player
            .order()
            .filter((candidate) => candidate !== playerId)
            .map((candidate) => ({ value: candidate, label: candidate })),
        defaultValue: ({ choices }) => choices[0]?.value,
      }),
    );
    return {
      targetPlayerId,
      give: input.add(
        "give",
        main.inputs.form.resourceMap({
          resources: literals.resourceIds.map((resourceId) => ({
            resourceId,
            min: 0,
            max: ({ q, playerId }) => q.player.resource(playerId, resourceId),
          })),
        }),
      ),
      want: input.add(
        "want",
        main.inputs.form.resourceMap({
          resources: literals.resourceIds.map((resourceId) => ({
            resourceId,
            min: 0,
            max: ({ q }) =>
              Math.max(
                0,
                ...q.player
                  .order()
                  .map((playerId) => q.player.resource(playerId, resourceId)),
              ) + 1,
          })),
        }),
      ),
    };
  }),
  paramsSchema: z.object({
    targetPlayerId: ids.playerId,
    give: resourceCountsSchema,
    want: resourceCountsSchema,
  }),
  rules: [
    {
      id: "one-opponent",
      errorCode: "TRADE_TARGET_INVALID",
      validate: ({ input, q }) =>
        input.params.targetPlayerId !== input.playerId &&
        q.player.order().includes(input.params.targetPlayerId),
    },
    {
      id: "non-empty-maps",
      errorCode: "INVALID_TRADE_OFFER",
      validate: ({ input }) =>
        hasPositiveResource(input.params.give) &&
        hasPositiveResource(input.params.want),
    },
    {
      id: "disjoint-maps",
      errorCode: "GIVE_AND_WANT_OVERLAP",
      validate: ({ input }) =>
        !resourceMapsOverlap(input.params.give, input.params.want),
    },
    {
      id: "offer-affordable",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, input.params.give),
    },
  ],
  reduce({ tx, input }) {
    const offer = {
      offerorPlayerId: input.playerId,
      targetPlayerId: input.params.targetPlayerId,
      give: input.params.give as ResourceCounts,
      want: input.params.want as ResourceCounts,
    };
    tx.patchPublicState({ currentTrade: offer });
    appendHistory(tx, {
      kind: "tradeOffered",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} offered a bilateral trade to ${input.params.targetPlayerId}.`,
    });
    return tx.transition("pendingTrade");
  },
});

const endTurn = main.interaction({
  inputs: {},
  reduce({ state, tx, input, q }) {
    const nextIndex =
      (state.publicState.activePlayerIndex + 1) % q.player.order().length;
    tx.patchPublicState({
      activePlayerIndex: nextIndex,
      turnNumber: state.publicState.turnNumber + 1,
      lastRoll: null,
      lastProduction: [],
      lastSteal: null,
    });
    tx.setActivePlayers([q.player.order()[nextIndex]!]);
    appendHistory(tx, {
      kind: "endTurn",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} ended the turn.`,
    });
    return tx.transition("roll");
  },
});

export default main.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, tx, q }) {
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
  },
  interactions: {
    buildTrail,
    buildCamp,
    tradeWithSupplyDepot,
    offerTrade,
    endTurn,
  },
});
