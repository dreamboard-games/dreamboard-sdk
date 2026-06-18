// Workspace-narrowed scenario helpers.
import {
  literals,
  type PlayerId,
  type ResourceId,
} from "../shared/manifest-contract";
import type { ScenarioGameApi } from "./testing-types";

// ── Phase-action wrappers ────────────────────────────────────────────────
//
// Thin shims around `game.submit(...)` that hide the interaction id +
// param shape so multi-season test scenarios stay readable. These do NOT
// patchState — they exercise the real reducer path.

const SLOT_SPACE_ID: Record<1 | 2 | 3 | 4, string> = {
  1: "wake-up-1",
  2: "wake-up-2",
  3: "wake-up-3",
  4: "wake-up-4",
};

// The action helpers below cast through `never` so callers can pass
// plain strings without the manifest-typed unions; the reducer is
// authoritative for validation and rejects malformed ids at runtime.
export async function pickSlot(
  game: ScenarioGameApi,
  playerId: PlayerId,
  slot: 1 | 2 | 3 | 4,
): Promise<void> {
  await game.submit(playerId, "selectWakeUpSlot", {
    spaceId: SLOT_SPACE_ID[slot],
  } as never);
}

export async function placeWorker(
  game: ScenarioGameApi,
  playerId: PlayerId,
  componentId: string,
  spaceId: string,
): Promise<void> {
  await game.submit(playerId, "placeWorker", {
    componentId,
    spaceId,
  } as never);
}

export async function placeApprentice(
  game: ScenarioGameApi,
  playerId: PlayerId,
  apprenticeIndex: 1 | 2 | 3 | 4,
  spaceId: string,
): Promise<void> {
  const suffix = playerId === "player-1" ? "p1" : "p2";
  await placeWorker(
    game,
    playerId,
    `apprentice-${suffix}-${apprenticeIndex}`,
    spaceId,
  );
}

export async function placeMaster(
  game: ScenarioGameApi,
  playerId: PlayerId,
  spaceId: string,
): Promise<void> {
  const suffix = playerId === "player-1" ? "p1" : "p2";
  await placeWorker(game, playerId, `master-${suffix}`, spaceId);
}

export async function chooseMarket(
  game: ScenarioGameApi,
  playerId: PlayerId,
  choice: "gain-coin" | "sell-stone",
): Promise<void> {
  await game.submit(playerId, "chooseMarketAction", { choice } as never);
}

export async function craftItem(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cellSpaceId: string,
  itemId: string,
): Promise<void> {
  await game.submit(playerId, "craftAtWorkshop", {
    itemId,
    cell: {
      boardId: "workshop-mat",
      playerId,
      spaceId: cellSpaceId,
    },
  } as never);
}

export async function fulfillOrder(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cardId: string,
): Promise<void> {
  await game.submit(playerId, "fulfillOrder", { cardId } as never);
}

export async function playApprentice(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cardId: string,
): Promise<void> {
  await game.submit(playerId, "playApprenticeCard", { cardId } as never);
}

export async function reassign(
  game: ScenarioGameApi,
  playerId: PlayerId,
  pieceId: string,
  toSpaceId: string,
): Promise<void> {
  await game.submit(playerId, "reassign", {
    cardId: "reassign",
    pieceId,
    toSpaceId,
  } as never);
}

export async function passPlacement(
  game: ScenarioGameApi,
  playerId: PlayerId,
): Promise<void> {
  await game.submit(playerId, "passPlacement");
}

// ── Variable-pool action wrappers (T210) ─────────────────────────────────
export async function chooseTradePostExchange(
  game: ScenarioGameApi,
  playerId: PlayerId,
  give: { wood?: number; stone?: number; coin?: number },
  want: { wood?: number; stone?: number; coin?: number },
): Promise<void> {
  await game.submit(playerId, "chooseTradePostExchange", {
    giveWood: give.wood ?? 0,
    giveStone: give.stone ?? 0,
    giveCoin: give.coin ?? 0,
    wantWood: want.wood ?? 0,
    wantStone: want.stone ?? 0,
    wantCoin: want.coin ?? 0,
  } as never);
}

export async function chooseLibraryDiscard(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cardId: string,
): Promise<void> {
  await game.submit(playerId, "chooseLibraryDiscard", { cardId } as never);
}

export async function recallWorker(
  game: ScenarioGameApi,
  playerId: PlayerId,
  pieceId: string,
): Promise<void> {
  await game.submit(playerId, "recallWorker", { pieceId } as never);
}

export type ResourceCounts = Record<ResourceId, number>;

const RESOURCE_IDS = literals.resourceIds;

export function resourceTotal(
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

/**
 * Forcefully overwrite a player's per-resource balances on the test
 * snapshot. Useful for crafting / scoring scenarios where reaching a
 * specific resource state via gameplay would explode the scenario into
 * multiple seasons. Available on reducer-runtime scenarios only — the
 * browser/embedded runners reject `patchState`.
 */
export async function setPlayerResources(
  game: ScenarioGameApi,
  playerId: PlayerId,
  resources: ResourceCounts,
): Promise<void> {
  await game.patchState((snapshot) => {
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

/**
 * Plant a fully-occupied mat layout on `playerId`'s side of the
 * workshop-mat. Each `[cellSpaceId, itemId]` entry becomes a
 * `matOccupancyByPlayer[playerId][cellSpaceId] = itemId` mapping. Used by
 * order-fulfilment scenarios that don't want to drive through real
 * crafting to reach a target state.
 */
export async function patchMatOccupancy(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cells: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  await game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain);
    const publicState = asRecord(domain.publicState);
    const matOccupancyByPlayer = asRecord(publicState.matOccupancyByPlayer);
    const playerMat = asRecord(matOccupancyByPlayer[playerId]);
    for (const [cellId, itemId] of cells) {
      playerMat[cellId] = itemId;
    }
    matOccupancyByPlayer[playerId] = playerMat;
    publicState.matOccupancyByPlayer = matOccupancyByPlayer;
  });
}

/**
 * Force-enable a variable-pool action space. Patches both
 * `enabledActionSpaces` (the live set used by eligibility) and
 * `setupVariablePoolDraw` (the public-facing record of which
 * 3-of-6 were drawn at setup) so the UI and reducer agree. The
 * 6 fixed spaces stay enabled; the requested variable space is
 * promoted to position 0 of the variable draw and any duplicates
 * filtered out.
 */
export async function ensureVariableSpaceEnabled(
  game: ScenarioGameApi,
  variableSpaceId: string,
): Promise<void> {
  const FIXED_SPACE_IDS = [
    "lumberyard",
    "quarry",
    "market",
    "guild-hall",
    "training-hall",
    "workshop",
  ];
  await game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain);
    const publicState = asRecord(domain.publicState);
    const drawn = Array.isArray(publicState.setupVariablePoolDraw)
      ? (publicState.setupVariablePoolDraw as string[])
      : [];
    const filteredDrawn = drawn.filter((id) => id !== variableSpaceId);
    const nextDrawn = [variableSpaceId, ...filteredDrawn.slice(0, 2)];
    publicState.setupVariablePoolDraw = nextDrawn;
    publicState.enabledActionSpaces = [...FIXED_SPACE_IDS, ...nextDrawn];
  });
}

/**
 * Move a single named order card from `order-deck` (shared) into
 * `playerId`'s `order-hand`, updating every concurrent representation
 * (`table.zones.shared.order-deck`, `table.zones.perPlayer.order-hand`,
 * `table.decks.order-deck`, `table.hands.order-hand`, and
 * `table.componentLocations[cardId]`). Setup deals one random card; this
 * helper is for tests that need a SPECIFIC order card without rerolling
 * the seed.
 */
export async function givePlayerOrderCard(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cardId: string,
): Promise<void> {
  await game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain);
    const table = asRecord(domain.table);

    // Drop the card from each shared-zone projection (if present).
    const zones = asRecord(table.zones);
    const shared = asRecord(zones.shared);
    const sharedDeck = shared["order-deck"];
    if (Array.isArray(sharedDeck)) {
      shared["order-deck"] = sharedDeck.filter((id) => id !== cardId);
    }
    const decks = asRecord(table.decks);
    const deckList = decks["order-deck"];
    if (Array.isArray(deckList)) {
      decks["order-deck"] = deckList.filter((id) => id !== cardId);
    }

    // Push the card into each per-player hand projection.
    const pushIntoPerPlayer = (
      bucket: Record<string, unknown>,
      zoneId: string,
    ): void => {
      const zone = asRecord(bucket[zoneId]);
      const entries = zone.entries;
      if (!Array.isArray(entries)) return;
      const entry = entries.find(
        (candidate): candidate is [string, unknown[]] =>
          Array.isArray(candidate) && candidate[0] === playerId,
      );
      if (!entry || !Array.isArray(entry[1])) return;
      const cards = entry[1] as string[];
      if (!cards.includes(cardId)) cards.push(cardId);
    };

    pushIntoPerPlayer(asRecord(zones.perPlayer), "order-hand");
    pushIntoPerPlayer(asRecord(table.hands), "order-hand");

    // Update the component-location index so q.zone.playerCards picks
    // the card up under the new owner. The location schema uses
    // `handId` (not `zoneId`) plus `position` and an optional
    // `playedBy` companion (null for ordinary draws).
    const componentLocations = asRecord(table.componentLocations);
    // Determine the new card position from the post-mutation hand list.
    const handBucket = asRecord(asRecord(table.hands)["order-hand"]);
    const handEntries = Array.isArray(handBucket.entries)
      ? (handBucket.entries as Array<[string, unknown[]]>)
      : [];
    const handEntry = handEntries.find(
      (candidate) => candidate[0] === playerId,
    );
    const position = handEntry ? (handEntry[1] as string[]).indexOf(cardId) : 0;
    componentLocations[cardId] = {
      type: "InHand",
      handId: "order-hand",
      playerId,
      position: position >= 0 ? position : 0,
      playedBy: null,
    };
  });
}

/**
 * Apprentice-deck variant of `givePlayerOrderCard`. Identical mechanics
 * (drop the card from the shared deck/zone projections, push into the
 * player's apprentice-hand projections, re-anchor the
 * componentLocation), just keyed on the apprentice zones.
 */
export async function givePlayerApprenticeCard(
  game: ScenarioGameApi,
  playerId: PlayerId,
  cardId: string,
): Promise<void> {
  await game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain);
    const table = asRecord(domain.table);

    const zones = asRecord(table.zones);
    const shared = asRecord(zones.shared);
    const sharedDeck = shared["apprentice-deck"];
    if (Array.isArray(sharedDeck)) {
      shared["apprentice-deck"] = sharedDeck.filter((id) => id !== cardId);
    }
    const decks = asRecord(table.decks);
    const deckList = decks["apprentice-deck"];
    if (Array.isArray(deckList)) {
      decks["apprentice-deck"] = deckList.filter((id) => id !== cardId);
    }

    const pushIntoPerPlayer = (
      bucket: Record<string, unknown>,
      zoneId: string,
    ): void => {
      const zone = asRecord(bucket[zoneId]);
      const entries = zone.entries;
      if (!Array.isArray(entries)) return;
      const entry = entries.find(
        (candidate): candidate is [string, unknown[]] =>
          Array.isArray(candidate) && candidate[0] === playerId,
      );
      if (!entry || !Array.isArray(entry[1])) return;
      const cards = entry[1] as string[];
      if (!cards.includes(cardId)) cards.push(cardId);
    };

    pushIntoPerPlayer(asRecord(zones.perPlayer), "apprentice-hand");
    pushIntoPerPlayer(asRecord(table.hands), "apprentice-hand");

    const componentLocations = asRecord(table.componentLocations);
    const handBucket = asRecord(asRecord(table.hands)["apprentice-hand"]);
    const handEntries = Array.isArray(handBucket.entries)
      ? (handBucket.entries as Array<[string, unknown[]]>)
      : [];
    const handEntry = handEntries.find(
      (candidate) => candidate[0] === playerId,
    );
    const position = handEntry ? (handEntry[1] as string[]).indexOf(cardId) : 0;
    componentLocations[cardId] = {
      type: "InHand",
      handId: "apprentice-hand",
      playerId,
      position: position >= 0 ? position : 0,
      playedBy: null,
    };
  });
}
