import type { SpaceId } from "../../shared/manifest-contract";
import type { ProductionGrant } from "../types";
import { HEX_RULES, INTERSECTIONS_BY_HEX_ID } from "../model";
import {
  appendHistory,
  banditsHexId,
  campsByIntersectionId,
  patchPrivateState,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";
import { stormtrail } from "../game-model";

const roll = stormtrail.phase("roll");

const rollDice = roll.interaction({
  inputs: { dice: roll.inputs.rng.d6(2) },
  reduce({ state, tx, input, q }) {
    const [first, second] = input.params.dice.values;
    if (first === undefined || second === undefined) {
      throw new Error("Stormtrail roll requires two dice.");
    }
    const total = first + second;
    const ownerPlayerId = turnOwnerPlayerId(state, q);
    tx.patchPublicState({
      lastRoll: { dice: [first, second], total },
      lastProduction: [],
      ...(total === 7 ? { discardCountsByPlayerId: {} } : {}),
    });
    appendHistory(tx, {
      kind: "roll",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} rolled ${first} + ${second} = ${total}.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-roll",
        title: "Stormtrail dice rolled",
        summary: `${first} + ${second} = ${total}`,
        details: [
          { label: "First die", value: first },
          { label: "Second die", value: second },
          { label: "Total", value: total },
        ],
      }),
    );

    if (total === 7) {
      for (const playerId of q.player.order()) {
        patchPrivateState(tx, playerId, { lastDiscard: null });
      }
      const hasDiscards = q.player
        .order()
        .some((playerId) => q.player.resourceTotal(playerId) > 7);
      return tx.transition(hasDiscards ? "discardBarrier" : "moveBandits");
    }

    const grants: ProductionGrant[] = [];
    const camps = campsByIntersectionId(tx.state);
    for (const [hexId, rule] of Object.entries(HEX_RULES)) {
      if (
        rule.number !== total ||
        !rule.resourceId ||
        hexId === banditsHexId(tx.state)
      ) {
        continue;
      }
      const counts = new Map<string, number>();
      for (const intersectionId of INTERSECTIONS_BY_HEX_ID[hexId as SpaceId]) {
        const playerId = camps[intersectionId];
        if (playerId) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      }
      for (const [playerId, count] of counts) {
        tx.addResources({
          playerId: playerId as never,
          amounts: { [rule.resourceId]: count },
        });
        grants.push({
          playerId: playerId as never,
          resourceId: rule.resourceId,
          count,
          hexId: hexId as never,
        });
      }
    }
    tx.patchPublicState({ lastProduction: grants });
    appendHistory(tx, {
      kind: "production",
      actorPlayerId: null,
      summary:
        grants.length === 0
          ? `Roll ${total} produced no supplies.`
          : `Roll ${total} produced ${grants.reduce(
              (sum, grant) => sum + grant.count,
              0,
            )} supplies.`,
    });
    tx.emit(
      systemEvent({
        procedureId: "stormtrail-production",
        title: "Production resolved",
        summary:
          grants.length === 0
            ? `No district produced on ${total}.`
            : `${grants.reduce((sum, grant) => sum + grant.count, 0)} supplies produced.`,
      }),
    );
    tx.setActivePlayers([ownerPlayerId]);
    return tx.transition("main");
  },
});

export default roll.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, tx, q }) {
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
  },
  interactions: { rollDice },
});
