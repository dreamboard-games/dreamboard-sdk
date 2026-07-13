import type { SpaceId } from "../../shared/manifest-contract";
import type { ProductionGrant } from "../types";
import { rollAuthoring } from "../authoring";
import { HEX_RULES, INTERSECTIONS_BY_HEX_ID } from "../model";
import {
  appendHistory,
  banditsHexId,
  campsByIntersectionId,
  edit,
  patchPrivateState,
  systemEvent,
  turnOwnerPlayerId,
} from "../reducer-support";

const rollDice = rollAuthoring.interaction({
  inputs: { dice: rollAuthoring.inputs.rng.d6(2) },
  reduce({ state, input, accept, fx, q }) {
    const [first, second] = input.params.dice.values;
    if (first === undefined || second === undefined) {
      throw new Error("Stormtrail roll requires two dice.");
    }
    const total = first + second;
    const ownerPlayerId = turnOwnerPlayerId(state, q);
    const tx = edit(state);
    tx.patchPublicState({
      lastRoll: { dice: [first, second], total },
      lastProduction: [],
      ...(total === 7 ? { discardCountsByPlayerId: {} } : {}),
    });
    let next = appendHistory(tx.state, {
      kind: "roll",
      actorPlayerId: input.playerId,
      summary: `${input.playerId} rolled ${first} + ${second} = ${total}.`,
    });
    const events = [
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
    ];

    if (total === 7) {
      next = q.player
        .order()
        .reduce(
          (current, playerId) =>
            patchPrivateState(current, playerId, { lastDiscard: null }),
          next,
        );
      const hasDiscards = q.player
        .order()
        .some((playerId) => q.player.resourceTotal(playerId) > 7);
      return accept(next, {
        instructions: [
          fx.transition(hasDiscards ? "discardBarrier" : "moveBandits"),
        ],
        events,
      });
    }

    const grants: ProductionGrant[] = [];
    const camps = campsByIntersectionId(next);
    const productionTx = edit(next);
    for (const [hexId, rule] of Object.entries(HEX_RULES)) {
      if (
        rule.number !== total ||
        !rule.resourceId ||
        hexId === banditsHexId(next)
      ) {
        continue;
      }
      const counts = new Map<string, number>();
      for (const intersectionId of INTERSECTIONS_BY_HEX_ID[hexId as SpaceId]) {
        const playerId = camps[intersectionId];
        if (playerId) counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      }
      for (const [playerId, count] of counts) {
        productionTx.addResources({
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
    productionTx.patchPublicState({ lastProduction: grants });
    next = appendHistory(productionTx.state, {
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
    events.push(
      systemEvent({
        procedureId: "stormtrail-production",
        title: "Production resolved",
        summary:
          grants.length === 0
            ? `No district produced on ${total}.`
            : `${grants.reduce((sum, grant) => sum + grant.count, 0)} supplies produced.`,
      }),
    );
    const finalTx = edit(next);
    finalTx.setActivePlayers([ownerPlayerId]);
    return accept(finalTx.state, {
      instructions: [fx.transition("main")],
      events,
    });
  },
});

export const roll = rollAuthoring.define({
  kind: "player",
  initialState: () => ({}),
  actor: ({ state, q }) => turnOwnerPlayerId(state, q),
  enter({ state, accept, q }) {
    const tx = edit(state);
    tx.setActivePlayers([turnOwnerPlayerId(state, q)]);
    return accept(tx.state);
  },
  interactions: { rollDice },
});
