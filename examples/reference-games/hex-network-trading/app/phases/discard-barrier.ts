import { literals } from "../../shared/manifest-contract";
import { discardBarrierAuthoring } from "../authoring";
import { resourceTotal } from "../model";
import {
  appendHistory,
  edit,
  patchPrivateState,
  resourceTotalFromState,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";

const discardSupplies = discardBarrierAuthoring.interaction({
  to: ({ state }) =>
    state.table.playerOrder.filter(
      (playerId) =>
        state.phase.requiredByPlayerId?.[playerId] !== undefined &&
        !(state.phase.completedPlayerIds ?? []).includes(playerId),
    ),
  visibility: "actorsOnly",
  inputs: {
    resources: discardBarrierAuthoring.inputs.form.resourceMap({
      resources: literals.resourceIds.map((resourceId) => ({
        resourceId,
        label: resourceId,
        min: 0,
        max: ({ q, playerId }) => q.player.resource(playerId, resourceId),
      })),
    }),
  },
  rules: [
    {
      id: "discard-required",
      errorCode: "NOT_REQUIRED_TO_DISCARD",
      validate: ({ state, input }) =>
        state.phase.requiredByPlayerId?.[input.playerId] !== undefined &&
        !(state.phase.completedPlayerIds ?? []).includes(input.playerId),
    },
    {
      id: "exact-half",
      errorCode: "DISCARD_COUNT_INCORRECT",
      validate: ({ state, input }) =>
        resourceTotal(input.params.resources) ===
        state.phase.requiredByPlayerId?.[input.playerId],
    },
    {
      id: "discard-affordable",
      errorCode: "INSUFFICIENT_RESOURCES",
      validate: ({ input, q }) =>
        q.player.canAfford(input.playerId, input.params.resources),
    },
  ],
  reduce({ state, input, accept, fx, q }) {
    const count = resourceTotal(input.params.resources);
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: input.params.resources,
    });
    tx.patchPublicState((publicState) => ({
      ...publicState,
      discardCountsByPlayerId: {
        ...publicState.discardCountsByPlayerId,
        [input.playerId]: count,
      },
    }));
    tx.patchPhaseState((phaseState) => ({
      ...phaseState,
      completedPlayerIds: [
        ...(phaseState.completedPlayerIds ?? []),
        input.playerId,
      ],
    }));
    let next = patchPrivateState(tx.state, input.playerId, {
      lastDiscard: input.params.resources,
    });
    next = appendHistory(next, {
      kind: "discard",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} discarded ${count} supplies.`,
    });
    const remaining = q.player
      .order()
      .filter(
        (playerId) =>
          next.phase.requiredByPlayerId?.[playerId] !== undefined &&
          !(next.phase.completedPlayerIds ?? []).includes(playerId),
      );
    return accept(next, {
      ...(remaining.length === 0
        ? { instructions: [fx.transition("moveBandits")] }
        : {}),
      events: [
        systemEvent({
          procedureId: "stormtrail-discard",
          title: "Supplies discarded",
          summary: `${input.playerId} returned ${count} supplies.`,
          details: [{ label: "Discarded count", value: count }],
        }),
      ],
    });
  },
});

export const discardBarrier = discardBarrierAuthoring.define({
  kind: "player",
  initialState: ({ state, playerIds }) => ({
    requiredByPlayerId: Object.fromEntries(
      playerIds.flatMap((playerId) => {
        const total = resourceTotalFromState(state, playerId);
        return total > 7 ? [[playerId, Math.floor(total / 2)] as const] : [];
      }),
    ),
    completedPlayerIds: [],
  }),
  enter({ state, accept, q }) {
    const tx = edit(state);
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
    return accept(tx.state);
  },
  interactions: { discardSupplies },
});
