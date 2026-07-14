import { defineInputs } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import {
  ids,
  literals,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type VertexId,
} from "../../shared/manifest-contract";
import { mainAuthoring } from "../authoring";
import { buildCampTarget, buildTrailTarget } from "../eligibility";
import { resourceCountsSchema, type ResourceCounts } from "../game-contract";
import { hasPositiveResource, resourceMapsOverlap } from "../model";
import {
  appendHistory,
  campCount,
  CAMP_COST,
  detachedPiece,
  edit,
  fourthCampOutcome,
  remainingPieceCount,
  systemEvent,
  TRAIL_COST,
  turnOwnerPlayerId,
} from "../reducer-support";

const buildTrail = mainAuthoring.interaction({
  inputs: {
    edgeId: mainAuthoring.inputs.board.edge<EdgeId>({
      target: buildTrailTarget,
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
  reduce({ state, input, accept }) {
    const trailId = detachedPiece(state, input.playerId, "trail");
    if (!trailId) throw new Error("Trail piece is unavailable.");
    const tx = edit(state);
    tx.spendResources({ playerId: input.playerId, amounts: TRAIL_COST });
    tx.moveComponentToEdge({
      componentId: trailId,
      boardId: "frontier",
      edgeId: input.params.edgeId,
    });
    const next = appendHistory(tx.state, {
      kind: "buildTrail",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} built a trail.`,
    });
    return accept(next);
  },
});

const buildCamp = mainAuthoring.interaction({
  inputs: {
    intersectionId: mainAuthoring.inputs.board.vertex<VertexId>({
      target: buildCampTarget,
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
  reduce({ state, input, accept, endGame, fx, q }) {
    const campId = detachedPiece(state, input.playerId, "camp");
    if (!campId) throw new Error("Camp piece is unavailable.");
    const tx = edit(state);
    tx.spendResources({ playerId: input.playerId, amounts: CAMP_COST });
    tx.moveComponentToVertex({
      componentId: campId,
      boardId: "frontier",
      vertexId: input.params.intersectionId,
    });
    let next = appendHistory(tx.state, {
      kind: "buildCamp",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} built camp ${campCount(tx.state, input.playerId)}.`,
    });
    if (campCount(next, input.playerId) < 4) return accept(next);

    const outcome = fourthCampOutcome(q.player.order(), input.playerId);
    const finalTx = edit(next);
    finalTx.patchPublicState({ outcome });
    finalTx.setActivePlayers([]);
    next = finalTx.state;
    return endGame(next, outcome, {
      instructions: [fx.transition("gameOver")],
      events: [
        systemEvent({
          procedureId: "stormtrail-victory",
          title: "Fourth camp established",
          summary: `${input.playerId} wins immediately.`,
        }),
      ],
    });
  },
});

const tradeWithSupplyDepot = mainAuthoring.interaction({
  inputs: defineInputs((input) => {
    const giveResource = input.add(
      "giveResource",
      mainAuthoring.inputs.form.choice<ResourceId>({
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
        mainAuthoring.inputs.form.choice({
          dependsOn: [giveResource],
          choices: ({ values }) =>
            literals.resourceIds
              .filter((resourceId) => resourceId !== values.giveResource)
              .map((resourceId) => ({ value: resourceId, label: resourceId })),
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
  reduce({ state, input, accept }) {
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: { [input.params.giveResource]: 3 },
    });
    tx.addResources({
      playerId: input.playerId,
      amounts: { [input.params.receiveResource]: 1 },
    });
    const next = appendHistory(tx.state, {
      kind: "depotTrade",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} exchanged 3 ${input.params.giveResource} for 1 ${input.params.receiveResource}.`,
    });
    return accept(next);
  },
});

const offerTrade = mainAuthoring.interaction({
  inputs: defineInputs((input) => {
    const targetPlayerId = input.add(
      "targetPlayerId",
      mainAuthoring.inputs.form.choice<PlayerId>({
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
        mainAuthoring.inputs.form.resourceMap({
          resources: literals.resourceIds.map((resourceId) => ({
            resourceId,
            min: 0,
            max: ({ q, playerId }) => q.player.resource(playerId, resourceId),
          })),
        }),
      ),
      want: input.add(
        "want",
        mainAuthoring.inputs.form.resourceMap({
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
  reduce({ state, input, accept, fx }) {
    const offer = {
      offerorPlayerId: input.playerId,
      targetPlayerId: input.params.targetPlayerId,
      give: input.params.give as ResourceCounts,
      want: input.params.want as ResourceCounts,
    };
    const tx = edit(state);
    tx.patchPublicState({ currentTrade: offer });
    const next = appendHistory(tx.state, {
      kind: "tradeOffered",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} offered a bilateral trade to ${input.params.targetPlayerId}.`,
    });
    return accept(next, { instructions: [fx.transition("pendingTrade")] });
  },
});

const endTurn = mainAuthoring.interaction({
  inputs: {},
  reduce({ state, input, accept, fx, q }) {
    const nextIndex =
      (state.publicState.activePlayerIndex + 1) % q.player.order().length;
    const tx = edit(state);
    tx.patchPublicState({
      activePlayerIndex: nextIndex,
      turnNumber: state.publicState.turnNumber + 1,
      lastRoll: null,
      lastProduction: [],
      lastSteal: null,
    });
    tx.setActivePlayers([q.player.order()[nextIndex]!]);
    const next = appendHistory(tx.state, {
      kind: "endTurn",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} ended the turn.`,
    });
    return accept(next, { instructions: [fx.transition("roll")] });
  },
});

export const main = mainAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, accept, q }) {
    const tx = edit(state);
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
    return accept(tx.state);
  },
  interactions: {
    buildTrail,
    buildCamp,
    tradeWithSupplyDepot,
    offerTrade,
    endTurn,
  },
});
