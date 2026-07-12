import type {
  PieceId,
  PlayerId,
  ResourceId,
  SpaceId,
} from "../../shared/manifest-contract";
import type { GameState, ItemType, ResourceMap } from "../game-contract";

export const ACTION_SPACE_IDS = [
  "timberYard",
  "stoneYard",
  "patronSquare",
  "exchangeHouse",
  "mosaicBench",
] as const satisfies readonly SpaceId[];

export const CELL_IDS = [
  "cell-r0-c0",
  "cell-r0-c1",
  "cell-r0-c2",
  "cell-r1-c0",
  "cell-r1-c1",
  "cell-r1-c2",
] as const satisfies readonly SpaceId[];

export const RESOURCE_IDS = [
  "wood",
  "stone",
  "coin",
] as const satisfies readonly ResourceId[];

export const ITEM_TYPES = [
  "timberFrame",
  "stoneRelief",
  "joinedMosaic",
] as const satisfies readonly ItemType[];

export const ITEMS: Readonly<
  Record<
    ItemType,
    {
      label: string;
      prestige: number;
      cost: Readonly<Partial<Record<ResourceId, number>>>;
    }
  >
> = {
  timberFrame: {
    label: "Timber Frame",
    prestige: 2,
    cost: { wood: 2 },
  },
  stoneRelief: {
    label: "Stone Relief",
    prestige: 3,
    cost: { stone: 2, coin: 1 },
  },
  joinedMosaic: {
    label: "Joined Mosaic",
    prestige: 4,
    cost: { wood: 1, stone: 1, coin: 2 },
  },
};

const OWNER_BY_WORKER: Readonly<Record<PieceId, PlayerId>> = {
  "ordinary-p1-1": "player-1",
  "ordinary-p1-2": "player-1",
  "master-p1": "player-1",
  "ordinary-p2-1": "player-2",
  "ordinary-p2-2": "player-2",
  "master-p2": "player-2",
};

export function workerOwner(workerId: PieceId): PlayerId {
  return OWNER_BY_WORKER[workerId];
}

export function workerKind(workerId: PieceId): "ordinary" | "master" {
  return workerId.startsWith("master-") ? "master" : "ordinary";
}

export function unusedWorkers(
  state: GameState,
  playerId: PlayerId,
): readonly PieceId[] {
  return (Object.keys(state.publicState.workerLocations) as PieceId[]).filter(
    (workerId) =>
      workerOwner(workerId) === playerId &&
      state.publicState.workerLocations[workerId] === null,
  );
}

export function occupantsAt(
  state: GameState,
  spaceId: SpaceId,
): readonly PieceId[] {
  return (
    Object.entries(state.publicState.workerLocations) as Array<
      [PieceId, SpaceId | null]
    >
  )
    .filter(([, location]) => location === spaceId)
    .map(([workerId]) => workerId);
}

export function workerMayOccupy(
  state: GameState,
  workerId: PieceId,
  spaceId: SpaceId,
): boolean {
  if (
    !ACTION_SPACE_IDS.includes(spaceId as (typeof ACTION_SPACE_IDS)[number])
  ) {
    return false;
  }
  const occupants = occupantsAt(state, spaceId);
  if (workerKind(workerId) === "ordinary") return occupants.length === 0;
  return (
    occupants.length === 0 ||
    (occupants.length === 1 && workerKind(occupants[0]!) === "ordinary")
  );
}

export function otherPlayer(
  playerIds: readonly PlayerId[],
  playerId: PlayerId,
): PlayerId {
  const other = playerIds.find((candidate) => candidate !== playerId);
  if (!other) throw new Error("Mosaic Workshop requires two players.");
  return other;
}

export function totalResources(map: Readonly<Record<string, number>>): number {
  return Object.values(map).reduce((sum, amount) => sum + amount, 0);
}

export function mapsOverlap(
  left: Readonly<Record<string, number>>,
  right: Readonly<Record<string, number>>,
): boolean {
  return RESOURCE_IDS.some(
    (resourceId) => (left[resourceId] ?? 0) > 0 && (right[resourceId] ?? 0) > 0,
  );
}

export function isValidExchange(
  give: ResourceMap,
  receive: ResourceMap,
  canAfford: (amounts: ResourceMap) => boolean,
): boolean {
  const giveTotal = totalResources(give);
  return (
    (giveTotal === 1 || giveTotal === 2) &&
    totalResources(receive) === giveTotal &&
    !mapsOverlap(give, receive) &&
    canAfford(give)
  );
}

export function adjacentCellIds(cellId: SpaceId): readonly SpaceId[] {
  const match = /^cell-r([01])-c([012])$/.exec(cellId);
  if (!match) return [];
  const row = Number(match[1]);
  const col = Number(match[2]);
  return CELL_IDS.filter((candidate) => {
    const candidateMatch = /^cell-r([01])-c([012])$/.exec(candidate)!;
    const candidateRow = Number(candidateMatch[1]);
    const candidateCol = Number(candidateMatch[2]);
    return Math.abs(candidateRow - row) + Math.abs(candidateCol - col) === 1;
  });
}

export function legalCraftCells(
  state: GameState,
  playerId: PlayerId,
  itemType: ItemType,
): readonly SpaceId[] {
  const tableau = state.publicState.tableauByPlayer[playerId] ?? {};
  return CELL_IDS.filter((cellId) => {
    if (tableau[cellId]) return false;
    if (itemType !== "joinedMosaic") return true;
    return adjacentCellIds(cellId).some((adjacent) => tableau[adjacent]);
  });
}

export function legalCraftItems(
  state: GameState,
  playerId: PlayerId,
  canAfford: (
    amounts: Readonly<Partial<Record<ResourceId, number>>>,
  ) => boolean,
): readonly ItemType[] {
  return ITEM_TYPES.filter(
    (itemType) =>
      canAfford(ITEMS[itemType].cost) &&
      legalCraftCells(state, playerId, itemType).length > 0,
  );
}

export function emptyResourceMap(): ResourceMap {
  return {};
}
