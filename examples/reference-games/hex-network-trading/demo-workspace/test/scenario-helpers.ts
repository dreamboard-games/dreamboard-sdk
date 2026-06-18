import { NO_STORM_SEIZE_TARGET } from "../app/phases/player-turn/inputs";
import {
  literals,
  boardHelpers,
  staticBoards,
  type CardType,
  type EdgeId,
  type PlayerId,
  type ResourceId,
  type SpaceId,
  type VertexId,
} from "../shared/manifest-contract";
import type {
  InteractionDescriptorFor,
  ScenarioContext,
} from "./testing-types";

export type ResourceCounts = Record<ResourceId, number>;

export type ScenarioView = ReturnType<ScenarioContext["view"]>;

const RESOURCE_IDS = literals.resourceIds;
const SPACE_KINDS = boardHelpers.spaceKinds("frontier");
export const COST_TRAIL: Partial<ResourceCounts> = { clay: 1, timber: 1 };
export const COST_CAMP: Partial<ResourceCounts> = {
  clay: 1,
  timber: 1,
  cloth: 1,
  grain: 1,
};
export const COST_TOWN: Partial<ResourceCounts> = { iron: 3, grain: 2 };

function resourceTotal(
  resources: Readonly<Record<ResourceId, number>>,
): number {
  return RESOURCE_IDS.reduce(
    (total, resourceId) => total + (resources[resourceId] ?? 0),
    0,
  );
}

export function canAfford(
  resources: Readonly<Record<ResourceId, number>>,
  cost: Partial<ResourceCounts>,
): boolean {
  return RESOURCE_IDS.every(
    (resourceId) => (resources[resourceId] ?? 0) >= (cost[resourceId] ?? 0),
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function setPlayerResources(
  ctx: ScenarioContext,
  playerId: PlayerId,
  resources: ResourceCounts,
): Promise<void> {
  await ctx.game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain);
    const table = asRecord(domain.table);
    const tableResources = asRecord(table.resources);
    const entries = tableResources.entries;
    if (!Array.isArray(entries)) {
      throw new Error("Expected per-player resource entries in test state.");
    }
    const entry = entries.find((candidate): candidate is [string, unknown] => {
      return Array.isArray(candidate) && candidate[0] === playerId;
    });
    if (!entry) {
      throw new Error(`No resource entry found for ${playerId}.`);
    }
    entry[1] = { ...resources };
  });
}

function discardPayload(
  resources: Readonly<Record<ResourceId, number>>,
  required: number,
): Partial<ResourceCounts> {
  const toDiscard: Partial<ResourceCounts> = {};
  let remaining = required;
  for (const resourceId of RESOURCE_IDS) {
    if (remaining === 0) break;
    const amount = Math.min(resources[resourceId] ?? 0, remaining);
    if (amount > 0) {
      toDiscard[resourceId] = amount;
      remaining -= amount;
    }
  }
  return toDiscard;
}

function interaction(
  ctx: ScenarioContext,
  playerId: PlayerId,
  interactionId: string,
): InteractionDescriptorFor | undefined {
  return ctx
    .interactions(playerId)
    .find((descriptor) => descriptor.interactionId === interactionId);
}

export function firstTarget(
  descriptor: InteractionDescriptorFor | undefined,
  inputKey: string,
): string | null {
  const input = descriptor?.inputs.find(
    (candidate) => candidate.key === inputKey,
  );
  if (
    !input ||
    (input.domain.type !== "cardTarget" &&
      input.domain.type !== "boardTarget") ||
    input.domain.projection !== "resolved"
  ) {
    return null;
  }
  return input.domain.eligibleTargets[0] ?? null;
}

export function firstChoice(
  descriptor: InteractionDescriptorFor | undefined,
  inputKey: string,
  predicate: (value: string) => boolean = () => true,
): string | null {
  const input = descriptor?.inputs.find(
    (candidate) => candidate.key === inputKey,
  );
  const choices =
    input?.domain.type === "choice" || input?.domain.type === "choiceList"
      ? (input.domain.choices ?? [])
      : [];
  return (
    choices.find(
      (choice) =>
        typeof choice.value === "string" &&
        !choice.disabled &&
        predicate(choice.value),
    )?.value ?? null
  );
}

function chooseStormMove(
  ctx: ScenarioContext,
  playerId: PlayerId,
): {
  spaceId: SpaceId;
  stealFromPlayerId: PlayerId | typeof NO_STORM_SEIZE_TARGET;
} {
  const playerView = ctx.view(playerId);
  const candidates: Array<{ spaceId: SpaceId; stealFromPlayerId: PlayerId }> =
    [];
  for (const vertex of staticBoards.hex.frontier.vertices) {
    const building = playerView.coloniesByVertexId[vertex.id];
    if (!building || building.ownerId === playerId) continue;
    for (const spaceId of vertex.spaceIds) {
      if (SPACE_KINDS[spaceId] !== "land") continue;
      if (spaceId === playerView.stormSpaceId) continue;
      candidates.push({ spaceId, stealFromPlayerId: building.ownerId });
    }
  }

  const target = candidates.find((candidate) => {
    const victimView = ctx.view(candidate.stealFromPlayerId);
    return resourceTotal(victimView.myResources) > 0;
  });
  if (target) return target;

  const emptyHex = literals.spaceIds.find(
    (spaceId) =>
      SPACE_KINDS[spaceId] === "land" &&
      spaceId !== playerView.stormSpaceId &&
      !candidates.some((candidate) => candidate.spaceId === spaceId),
  );
  return {
    spaceId: (emptyHex ??
      candidates[0]?.spaceId ??
      literals.spaceIds[0]) as SpaceId,
    stealFromPlayerId: NO_STORM_SEIZE_TARGET,
  };
}

export async function resolveRollBlockers(
  ctx: ScenarioContext,
  playerId: PlayerId,
): Promise<void> {
  for (const candidate of ctx.players()) {
    const candidateView = ctx.view(candidate);
    if (candidateView.myDiscardRequired > 0) {
      await ctx.game.submit(candidate, "discardCards", {
        toDiscard: discardPayload(
          candidateView.myResources,
          candidateView.myDiscardRequired,
        ),
      });
    }
  }

  if (ctx.view(playerId).stormPending) {
    await ctx.game.submit(
      playerId,
      "moveStorm",
      chooseStormMove(ctx, playerId),
    );
  }
}

export async function rollIntoMainStep(
  ctx: ScenarioContext,
  playerId: PlayerId,
): Promise<void> {
  if (!ctx.view(playerId).diceRolled) {
    await ctx.game.submit(playerId, "rollDice", {});
  }
  await resolveRollBlockers(ctx, playerId);
}

export async function findReadyTurn(
  ctx: ScenarioContext,
  playerId: PlayerId,
  predicate: () => boolean,
  options: { maxTurns?: number } = {},
): Promise<void> {
  const maxTurns = options.maxTurns ?? 120;
  const seats = ctx.players();
  for (let turn = 0; turn < maxTurns; turn++) {
    const active = seats[turn % seats.length]!;
    await rollIntoMainStep(ctx, active);
    if (active === playerId && predicate()) return;
    await ctx.game.submit(active, "endTurn", {});
  }
  throw new Error(
    `Unable to reach requested ready turn within ${maxTurns} turns.`,
  );
}

export async function readyForInteraction(
  ctx: ScenarioContext,
  playerId: PlayerId,
  interactionId: string,
): Promise<InteractionDescriptorFor> {
  await findReadyTurn(ctx, playerId, () => {
    const descriptor = interaction(ctx, playerId, interactionId);
    return descriptor?.availability.status === "available";
  });
  const descriptor = interaction(ctx, playerId, interactionId);
  if (descriptor?.availability.status !== "available") {
    throw new Error(
      `Expected ${interactionId} to be available for ${playerId}.`,
    );
  }
  return descriptor;
}

export async function readyForPaidInteraction(
  ctx: ScenarioContext,
  playerId: PlayerId,
  interactionId: string,
  cost: Partial<ResourceCounts>,
  targetInputKey: string,
): Promise<InteractionDescriptorFor> {
  await findReadyTurn(ctx, playerId, () => {
    const descriptor = interaction(ctx, playerId, interactionId);
    return (
      descriptor?.availability.status === "available" &&
      firstTarget(descriptor, targetInputKey) != null &&
      canAfford(ctx.view(playerId).myResources, cost)
    );
  });
  const descriptor = interaction(ctx, playerId, interactionId);
  if (
    descriptor?.availability.status !== "available" ||
    firstTarget(descriptor, targetInputKey) == null ||
    !canAfford(ctx.view(playerId).myResources, cost)
  ) {
    throw new Error(`Expected ${interactionId} to be payable for ${playerId}.`);
  }
  return descriptor;
}

export async function readyForCharterCard(
  ctx: ScenarioContext,
  playerId: PlayerId,
  cardType: CardType,
): Promise<void> {
  await findReadyTurn(ctx, playerId, () => {
    const view = ctx.view(playerId);
    return view.myCharterCardIds.some(
      (cardId) => view.myCharterCardTypesById[cardId] === cardType,
    );
  });
}

export function firstEligibleEdge(
  descriptor: InteractionDescriptorFor | undefined,
  inputKey = "edgeId",
): EdgeId {
  const target = firstTarget(descriptor, inputKey);
  if (!target) throw new Error(`Expected an eligible edge for ${inputKey}.`);
  return target as EdgeId;
}

export function firstEligibleVertex(
  descriptor: InteractionDescriptorFor | undefined,
  inputKey = "vertexId",
): VertexId {
  const target = firstTarget(descriptor, inputKey);
  if (!target) throw new Error(`Expected an eligible vertex for ${inputKey}.`);
  return target as VertexId;
}
