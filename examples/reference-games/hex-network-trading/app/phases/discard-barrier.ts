import { literals } from "../manifest";
import { resourceTotal } from "../model";
import {
  appendHistory,
  patchPrivateState,
  resourceTotalFromState,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const discardBarrier = stormtrail.phase("discardBarrier");

const discardSupplies = discardBarrier.interaction({
  actor: ({ state }) =>
    state.table.playerOrder.filter(
      (playerId) =>
        state.phase.requiredByPlayerId?.[playerId] !== undefined &&
        !(state.phase.completedPlayerIds ?? []).includes(playerId),
    ),
  inputs: {
    resources: discardBarrier.inputs.form.resourceMap({
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
  reduce({ tx, input, q }) {
    const count = resourceTotal(input.params.resources);
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
    patchPrivateState(tx, input.playerId, {
      lastDiscard: input.params.resources,
    });
    appendHistory(tx, {
      kind: "discard",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} discarded ${count} supplies.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-discard",
        title: "Supplies discarded",
        summary: `${input.playerId} returned ${count} supplies.`,
        details: [{ label: "Discarded count", value: count }],
      }),
    );
    const next = tx.state;
    const remaining = q.player
      .order()
      .filter(
        (playerId) =>
          next.phase.requiredByPlayerId?.[playerId] !== undefined &&
          !(next.phase.completedPlayerIds ?? []).includes(playerId),
      );
    return remaining.length === 0 ? tx.transition("moveBandits") : tx.accept();
  },
});

export default discardBarrier.define({
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
  enter({ state, tx, q }) {
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
  },
  interactions: { discardSupplies },
});
