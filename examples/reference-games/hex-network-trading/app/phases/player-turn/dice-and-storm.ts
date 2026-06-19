import { playerTurn } from "../../authoring";
import { z } from "zod";
import { defineInputs } from "@dreamboard-games/sdk/reducer";
import { countsByIdSchema } from "../../game-contract";
import {
  TERRAIN_RESOURCE,
  coloniesByVertexId,
  edit,
  stormSpaceId,
  type Q,
} from "../../reducer-support";
import { stormSpaceTarget } from "../../eligibility";
import {
  literals,
  type PlayerId,
  type SpaceId,
} from "../../../shared/manifest-contract";
import {
  ownedResourceMapDomain,
  stormSeizeTargetInput,
  resolveStormSeizeTarget,
} from "./inputs";

// Exported param schema used by unit tests and shared with the interaction
// `inputs` declaration.
export const discardCardsParamsSchema = z.object({
  toDiscard: countsByIdSchema,
});

// ── Roll Dice ────────────────────────────────────────────────────────────────
// Engine-authoritative dice: `playerTurn.inputs.rng.d6(2)` samples both dice on submit
// inside the trusted reducer bundle, so clients cannot influence the roll.
// The resulting `values` flows into `input.params.dice.values`.

export const rollDice = playerTurn.interaction({
  visibility: "all",
  inputs: {
    dice: playerTurn.inputs.rng.d6(2),
  },
  // Actor authorization (NOT_YOUR_TURN) is enforced by the bundle — no
  // per-interaction `state.flow.activePlayers.includes(...)` check needed.
  rules: [
    {
      id: "dice-not-already-rolled",
      errorCode: "ALREADY_ROLLED",
      message: "Already rolled this turn.",
      validate: ({ state }) => !state.phase.diceRolled,
    },
  ],
  reduce({ state, input, accept, q }) {
    const [d1, d2] = input.params.dice.values;
    const diceValues: [number, number] = [d1!, d2!];
    const sum = diceValues[0] + diceValues[1];

    if (sum === 7) {
      const discardPending: PlayerId[] = [];
      for (const pid of q.player.order()) {
        if (q.player.resourceTotal(pid) > 7) discardPending.push(pid);
      }
      const tx = edit(state);
      tx.patchPhaseState({
        diceRolled: true,
        diceValues,
        step: discardPending.length > 0 ? "discard" : "storm",
        stormPending: true,
        discardPending,
      });
      return accept(tx.state);
    }

    // Resource production: each land tile whose number token matches the
    // dice sum (and is not blocked by the storm) yields one resource per
    // camp and two per town on its incident vertices.
    const tx = edit(state);
    const stormSpace = stormSpaceId(state);
    const buildings = coloniesByVertexId(state, q);
    for (const spaceId of literals.spaceIds) {
      if (spaceId === stormSpace) continue;
      const terrain = state.publicState.terrainBySpaceId[spaceId];
      const numberToken =
        state.publicState.numberTokenBySpaceId[spaceId] ?? null;
      if (numberToken !== sum) continue;
      const resource = terrain ? TERRAIN_RESOURCE[terrain] : null;
      if (!resource) continue;

      for (const vertexId of q.board.spaceVertices("frontier", spaceId)) {
        const building = buildings[vertexId];
        if (!building) continue;
        const amount = building.kind === "town" ? 2 : 1;
        tx.addResources({
          playerId: building.ownerId,
          amounts: { [resource]: amount },
        });
      }
    }

    tx.patchPhaseState({ step: "main", diceRolled: true, diceValues });
    return accept(tx.state);
  },
});

// ── Discard ──────────────────────────────────────────────────────────────────

export const discardCards = playerTurn.interaction({
  inputs: {
    toDiscard: ownedResourceMapDomain(),
  },
  // Actor-authorized. Every listed seat can submit regardless of whose turn it
  // is, which models an after-7 forced discard without prompt routing.
  actor: ({ state }) => state.phase.discardPending,
  visibility: "actorsOnly",
  rules: [
    {
      id: "discard-requirements",
      errorCode: "INVALID_DISCARD",
      validate({ state, input, q }) {
        if (!state.phase.discardPending.includes(input.playerId)) {
          return {
            errorCode: "NOT_REQUIRED_TO_DISCARD",
            message: "You don't need to discard.",
          };
        }
        const required = Math.floor(q.player.resourceTotal(input.playerId) / 2);
        const given = Object.values(input.params.toDiscard).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        if (given !== required) {
          return {
            errorCode: "WRONG_DISCARD_COUNT",
            message: `Must discard exactly ${required} cards.`,
          };
        }
        if (!q.player.canAfford(input.playerId, input.params.toDiscard)) {
          const missing = q.player.missingResources(
            input.playerId,
            input.params.toDiscard,
          );
          const [res] = Object.keys(missing);
          return {
            errorCode: "INSUFFICIENT_RESOURCES",
            message: `Not enough ${res ?? "resources"}.`,
          };
        }
        return null;
      },
    },
  ],
  reduce({ state, input, accept }) {
    const discardPending = state.phase.discardPending.filter(
      (p) => p !== input.playerId,
    );
    const tx = edit(state);
    tx.spendResources({
      playerId: input.playerId,
      amounts: input.params.toDiscard,
    });
    tx.patchPhaseState({
      step: discardPending.length === 0 ? "storm" : "discard",
      discardPending,
    });
    return accept(tx.state);
  },
});

// ── Move Storm ──────────────────────────────────────────────────────────────

export const moveStorm = playerTurn.interaction({
  inputs: defineInputs((input) => {
    const spaceId = input.add(
      "spaceId",
      playerTurn.inputs.board.space<SpaceId>({
        target: stormSpaceTarget,
      }),
    );
    return {
      spaceId,
      stealFromPlayerId: input.add(
        "stealFromPlayerId",
        stormSeizeTargetInput(spaceId),
      ),
    };
  }),
  rules: [
    {
      id: "storm-move-required",
      errorCode: "STORM_NOT_PENDING",
      validate({ state }) {
        if (!state.phase.stormPending) {
          return {
            errorCode: "STORM_NOT_PENDING",
            message: "No storm move required.",
          };
        }
        if (state.phase.discardPending.length > 0) {
          return {
            errorCode: "WAITING_FOR_DISCARDS",
            message: "Waiting for discards.",
          };
        }
        return null;
      },
    },
    {
      id: "storm-steal-target",
      errorCode: "INVALID_STORM_SEIZE_TARGET",
      validate({ state, input, q }) {
        return resolveStormSeizeTarget(
          state,
          q,
          input.playerId,
          input.params.stealFromPlayerId,
          input.params.spaceId,
        ) !== undefined
          ? null
          : {
              errorCode: "INVALID_STORM_SEIZE_TARGET",
              message: "Choose a player with a camp or town on the storm hex.",
            };
      },
    },
  ],
  reduce({ state, input, accept, q }) {
    const stealTarget =
      resolveStormSeizeTarget(
        state,
        q,
        input.playerId,
        input.params.stealFromPlayerId,
        input.params.spaceId,
      ) ?? null;
    const tx = edit(state);
    const stolen = stealableResource(q, stealTarget);
    if (stealTarget && stolen) {
      tx.transferResources({
        fromPlayerId: stealTarget,
        toPlayerId: input.playerId,
        amounts: { [stolen]: 1 },
      });
    }
    tx.moveComponentToSpace({
      componentId: "storm",
      boardId: "frontier",
      spaceId: input.params.spaceId,
    });
    tx.patchPhaseState({ step: "main", stormPending: false });
    return accept(tx.state);
  },
});

/**
 * Build the transfer op for Frontier Trails simplified steal rule. The real board
 * game steals a random card; this fixture chooses the first available
 * resource in manifest order so reducer tests stay deterministic. Returns an
 * empty array when the victim has no resources (still a legal move — it just
 * yields no seize).
 */
export function stealableResource(q: Q, victim: PlayerId | null) {
  if (!victim) return null;
  const victimResources = q.player.resources(victim);
  return (
    literals.resourceIds.find(
      (resourceId) => (victimResources[resourceId] ?? 0) > 0,
    ) ?? null
  );
}
