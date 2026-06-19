import { type InputFieldRef } from "@dreamboard-games/sdk/reducer";
import { playerTurn } from "../../authoring";
import type { GameState } from "../../game-contract";
import { buildingAt, coloniesByVertexId, type Q } from "../../reducer-support";
import { computeBankTradeRates, portsByVertex } from "../../derived";
import {
  literals,
  type PlayerId,
  type ResourceId,
  type SpaceId,
} from "../../../shared/manifest-contract";

export type StormSeizeTarget = PlayerId;
export const NO_STORM_SEIZE_TARGET = "none";
export type StormSeizeTargetInputValue =
  | StormSeizeTarget
  | typeof NO_STORM_SEIZE_TARGET;

function resourceMapDomain(
  maxFor: (q: Q, playerId: PlayerId, resourceId: ResourceId) => number,
) {
  return playerTurn.inputs.form.resourceMap({
    resources: literals.resourceIds.map((resourceId) => ({
      resourceId,
      max: ({ q, playerId }) =>
        maxFor(q as Q, playerId as PlayerId, resourceId),
    })),
  });
}

export function ownedResourceMapDomain() {
  return resourceMapDomain((q, playerId, resourceId) =>
    q.player.resource(playerId, resourceId),
  );
}

export function openResourceMapDomain() {
  return resourceMapDomain((q, playerId) => q.player.resourceTotal(playerId));
}

export function otherPlayerChoices(q: Q, playerId: PlayerId) {
  return q.player
    .order()
    .filter((pid) => pid !== playerId)
    .map((pid) => ({ value: pid, label: pid }));
}

export function bankTradeResourceChoices() {
  return playerTurn.inputs.form.resourceChoices({
    decorate: ({ state, playerId, q, derived, resourceId }) => {
      const typedResourceId = resourceId as ResourceId;
      const rate = computeBankTradeRates(
        coloniesByVertexId(state, q as Q),
        derived(portsByVertex),
        playerId as PlayerId,
      )[typedResourceId];
      const label =
        literals.resourcePresentationById[typedResourceId]?.label ??
        typedResourceId;
      const affordable =
        (q as Q).player.resource(playerId as PlayerId, typedResourceId) >= rate;
      return {
        badge: `${rate}:1`,
        description: `Give ${rate} ${label} to receive 1 resource.`,
        disabled: !affordable,
        disabledReason: affordable ? undefined : `Need ${rate} ${label}.`,
      };
    },
  });
}

export function stormSeizeTargetInput(
  stormSpaceRef: InputFieldRef<string, SpaceId>,
) {
  return playerTurn.inputs.form.choice<
    StormSeizeTargetInputValue,
    readonly [typeof stormSpaceRef]
  >({
    dependsOn: [stormSpaceRef],
    choices: ({ state, q, playerId, values }) => {
      const players = seizablePlayersForStormSpace(
        state,
        q as Q,
        playerId as PlayerId,
        values[stormSpaceRef.key],
      );
      if (players.length === 0) {
        return [
          {
            value: NO_STORM_SEIZE_TARGET,
            label: "No eligible captain",
          },
        ];
      }
      return players.map((pid) => ({ value: pid, label: pid }));
    },
    defaultValue: ({ choices }) => choices[0]?.value,
  });
}

export function resolveStormSeizeTarget(
  state: GameState,
  q: Q,
  thiefId: PlayerId,
  target: StormSeizeTargetInputValue,
  spaceId: SpaceId,
): PlayerId | null | undefined {
  const players = seizablePlayersForStormSpace(state, q, thiefId, spaceId);
  if (target === NO_STORM_SEIZE_TARGET) {
    return players.length === 0 ? null : undefined;
  }
  return players.includes(target) ? target : undefined;
}

export function canSeizeFromPlayer(
  state: GameState,
  q: Q,
  thiefId: PlayerId,
  victimId: PlayerId,
  spaceId: SpaceId,
): boolean {
  if (victimId === thiefId) return false;
  return seizablePlayersForStormSpace(state, q, thiefId, spaceId).includes(
    victimId,
  );
}

export function seizablePlayersForStormSpace(
  state: GameState,
  q: Q,
  thiefId: PlayerId,
  spaceId: SpaceId,
): PlayerId[] {
  const owners = new Set<PlayerId>();
  for (const vertexId of q.board.spaceVertices("frontier", spaceId)) {
    const building = buildingAt(state, q, vertexId);
    if (building && building.ownerId !== thiefId) {
      owners.add(building.ownerId);
    }
  }
  return q.player.order().filter((pid) => owners.has(pid));
}
