import { defineInputs } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import {
  ids,
  type PlayerId,
  type SpaceId,
} from "../../shared/manifest-contract";
import { moveBanditsAuthoring } from "../authoring";
import { banditsDestinationTarget } from "../eligibility";
import {
  appendHistory,
  clearStealSecrets,
  edit,
  eligibleBanditVictims,
  patchPrivateState,
  resourceCards,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";

const moveBandits = moveBanditsAuthoring.interaction({
  inputs: defineInputs((input) => {
    const hexId = input.add(
      "hexId",
      moveBanditsAuthoring.inputs.board.space<SpaceId>({
        target: banditsDestinationTarget,
      }),
    );
    const victimChoice = moveBanditsAuthoring.inputs.form.choice({
      dependsOn: [hexId],
      choices: ({ state, playerId, q, values }) => {
        const parsedHexId = ids.spaceId.safeParse(values.hexId);
        if (!parsedHexId.success) {
          return [];
        }
        return eligibleBanditVictims(state, q, playerId, parsedHexId.data).map(
          (targetPlayerId) => ({
            value: targetPlayerId,
            label: targetPlayerId,
          }),
        );
      },
      defaultValue: ({ choices }) => choices[0]?.value,
    });
    return {
      hexId,
      targetPlayerId: input.add("targetPlayerId", {
        ...victimChoice,
        schema: ids.playerId.optional(),
      }),
    };
  }),
  paramsSchema: z.object({
    hexId: ids.spaceId,
    targetPlayerId: ids.playerId.optional(),
  }),
  rules: [
    {
      id: "victim-cardinality",
      errorCode: "STEAL_TARGET_REQUIRED",
      validate: ({ state, input, q }) => {
        const victims = eligibleBanditVictims(
          state,
          q,
          input.playerId,
          input.params.hexId,
        );
        if (victims.length === 0) {
          return input.params.targetPlayerId === undefined
            ? null
            : { errorCode: "STEAL_TARGET_FORBIDDEN" };
        }
        return input.params.targetPlayerId &&
          victims.includes(input.params.targetPlayerId)
          ? null
          : { errorCode: "STEAL_TARGET_REQUIRED" };
      },
    },
  ],
  reduce({ state, input, accept, fx, q, random }) {
    const ownerPlayerId = turnOwnerPlayerId(state, q);
    const tx = edit(state);
    tx.moveComponentToSpace({
      componentId: "bandits",
      boardId: "frontier",
      spaceId: input.params.hexId,
    });
    let next = clearStealSecrets(tx.state);
    const victimPlayerId = input.params.targetPlayerId;
    if (victimPlayerId) {
      const cards = resourceCards(q.player.resources(victimPlayerId));
      if (cards.length === 0) {
        throw new Error("Eligible Bandits victim has no supply cards.");
      }
      const resourceId = random.subset({ from: cards, count: 1 })[0]!;
      const transferTx = edit(next);
      transferTx.transferResources({
        fromPlayerId: victimPlayerId,
        toPlayerId: ownerPlayerId,
        amounts: { [resourceId]: 1 },
      });
      transferTx.patchPublicState({
        lastSteal: {
          thiefPlayerId: ownerPlayerId,
          victimPlayerId,
        },
      });
      next = patchPrivateState(transferTx.state, ownerPlayerId, {
        lastStolenResourceId: resourceId,
      });
      next = patchPrivateState(next, victimPlayerId, {
        lastStolenResourceId: resourceId,
      });
    } else {
      const publicTx = edit(next);
      publicTx.patchPublicState({ lastSteal: null });
      next = publicTx.state;
    }
    next = appendHistory(next, {
      kind: "bandits",
      actorPlayerId: ownerPlayerId,
      summary: victimPlayerId
        ? `${ownerPlayerId} moved the Bandits and stole one supply from ${victimPlayerId}.`
        : `${ownerPlayerId} moved the Bandits without a victim.`,
    });
    const finalTx = edit(next);
    finalTx.setActivePlayers([ownerPlayerId]);
    return accept(finalTx.state, {
      instructions: [fx.transition("main")],
      events: [
        systemEvent({
          procedureId: "stormtrail-bandits",
          title: "Bandits moved",
          summary: victimPlayerId
            ? `${ownerPlayerId} stole one hidden supply from ${victimPlayerId}.`
            : `${ownerPlayerId} moved to ${input.params.hexId} without stealing.`,
        }),
      ],
    });
  },
});

export const moveBanditsPhase = moveBanditsAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, accept, q }) {
    const tx = edit(state);
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
    return accept(tx.state);
  },
  interactions: { moveBandits },
});
