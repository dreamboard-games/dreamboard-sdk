import { defineInputs } from "@dreamboard-games/sdk/reducer";
import { z } from "zod";
import { ids } from "../manifest";
import { differentHex } from "../eligibility";
import {
  appendHistory,
  clearStealSecrets,
  eligibleBanditVictims,
  patchPrivateState,
  resourceCards,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const moveBanditsPhase = stormtrail.phase("moveBandits");

const moveBandits = moveBanditsPhase.interaction({
  inputs: defineInputs((input) => {
    const hexId = input.add(
      "hexId",
      moveBanditsPhase.inputs.board.space({
        boardId: "frontier",
        where: differentHex,
      }),
    );
    const victimChoice = moveBanditsPhase.inputs.form.choice({
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
  reduce({ state, tx, input, q, random }) {
    const ownerPlayerId = turnOwnerPlayerId(state, q);
    tx.moveComponentToSpace({
      componentId: "bandits",
      boardId: "frontier",
      spaceId: input.params.hexId,
    });
    clearStealSecrets(tx);
    const victimPlayerId = input.params.targetPlayerId;
    if (victimPlayerId) {
      const cards = resourceCards(q.player.resources(victimPlayerId));
      if (cards.length === 0) {
        throw new Error("Eligible Bandits victim has no supply cards.");
      }
      const resourceId = random.subset({ from: cards, count: 1 })[0]!;
      tx.transferResources({
        fromPlayerId: victimPlayerId,
        toPlayerId: ownerPlayerId,
        amounts: { [resourceId]: 1 },
      });
      tx.patchPublicState({
        lastSteal: {
          thiefPlayerId: ownerPlayerId,
          victimPlayerId,
        },
      });
      patchPrivateState(tx, ownerPlayerId, {
        lastStolenResourceId: resourceId,
      });
      patchPrivateState(tx, victimPlayerId, {
        lastStolenResourceId: resourceId,
      });
    } else {
      tx.patchPublicState({ lastSteal: null });
    }
    appendHistory(tx, {
      kind: "bandits",
      actorPlayerId: ownerPlayerId,
      summary: victimPlayerId
        ? `${ownerPlayerId} moved the Bandits and stole one supply from ${victimPlayerId}.`
        : `${ownerPlayerId} moved the Bandits without a victim.`,
    });
    tx.setActivePlayers([ownerPlayerId]);
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-bandits",
        title: "Bandits moved",
        summary: victimPlayerId
          ? `${ownerPlayerId} stole one hidden supply from ${victimPlayerId}.`
          : `${ownerPlayerId} moved to ${input.params.hexId} without stealing.`,
      }),
    );
    return tx.transition("main");
  },
});

export default moveBanditsPhase.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, tx, q }) {
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
  },
  interactions: { moveBandits },
});
