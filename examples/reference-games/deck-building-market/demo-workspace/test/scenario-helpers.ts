import {
  literals,
  type CardId,
  type CardType,
  type PlayerId,
  type ZoneId,
} from "../shared/manifest-contract";
import type {
  InteractionId,
  InteractionDescriptorFor,
  ScenarioContext,
} from "./testing-types";

type CardLocation = {
  type: "InDeck" | "InHand";
  deckId?: string;
  handId?: string;
  playerId?: string;
  playedBy: string | null;
  position: number;
};

type PerPlayerZone = {
  __perPlayer: true;
  entries: Array<[string, CardId[]]>;
};

const CARD_TYPE_TO_ACTION = {
  brainstorm: "brainstorm",
  studio: "studio",
  gallery: "gallery",
  "open-mic": "openMic",
  critic: "critic",
  eraser: "eraser",
  sketchpad: "sketchpad",
  "studio-visit": "studioVisit",
} as const satisfies Partial<Record<CardType, InteractionId>>;

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an object.`);
  }
  return value as Record<string, unknown>;
}

function cardType(cardId: CardId): CardType {
  return literals.cardTypeByCardId[cardId];
}

function isCardId(value: unknown): value is CardId {
  return typeof value === "string" && value in literals.cardTypeByCardId;
}

function cardIdArray(value: unknown, label: string): CardId[] {
  if (!Array.isArray(value) || !value.every(isCardId)) {
    throw new Error(`Expected ${label} to be a card-id array.`);
  }
  return value;
}

function perPlayerEntries(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} entries.`);
  }

  return value.map((entry, index): [string, CardId[]] => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string"
    ) {
      throw new Error(
        `Expected ${label} entry ${index} to be [player, cards].`,
      );
    }
    return [entry[0], cardIdArray(entry[1], `${label} entry ${index} cards`)];
  });
}

function perPlayerZone(
  snapshot: Record<string, unknown>,
  zoneId: ZoneId,
): PerPlayerZone {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  const hands = asRecord(table.hands, "domain.table.hands");
  const zone = asRecord(hands[zoneId], `per-player zone ${zoneId}`);
  return {
    __perPlayer: true,
    entries: perPlayerEntries(zone.entries, zoneId),
  };
}

function playerCards(
  snapshot: Record<string, unknown>,
  playerId: PlayerId,
  zoneId: ZoneId,
): CardId[] {
  const zone = perPlayerZone(snapshot, zoneId);
  const entry = zone.entries.find(([candidate]) => candidate === playerId);
  if (!entry) {
    throw new Error(`Missing ${zoneId} entry for ${playerId}.`);
  }
  return entry[1];
}

function projectedPerPlayerZone(
  snapshot: Record<string, unknown>,
  zoneId: ZoneId,
): PerPlayerZone {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  const zones = asRecord(table.zones, "domain.table.zones");
  const perPlayer = asRecord(zones.perPlayer, "domain.table.zones.perPlayer");
  const zone = asRecord(perPlayer[zoneId], `projected zone ${zoneId}`);
  return {
    __perPlayer: true,
    entries: perPlayerEntries(zone.entries, `projected ${zoneId}`),
  };
}

function projectedPlayerCards(
  snapshot: Record<string, unknown>,
  playerId: PlayerId,
  zoneId: ZoneId,
): CardId[] {
  const zone = projectedPerPlayerZone(snapshot, zoneId);
  const entry = zone.entries.find(([candidate]) => candidate === playerId);
  if (!entry) {
    throw new Error(`Missing projected ${zoneId} entry for ${playerId}.`);
  }
  return entry[1];
}

function sharedZones(
  snapshot: Record<string, unknown>,
): Record<string, CardId[]> {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  return asRecord(table.decks, "domain.table.decks") as Record<
    string,
    CardId[]
  >;
}

function projectedSharedZones(
  snapshot: Record<string, unknown>,
): Record<string, CardId[]> {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  const zones = asRecord(table.zones, "domain.table.zones");
  return asRecord(zones.shared, "domain.table.zones.shared") as Record<
    string,
    CardId[]
  >;
}

function cardLocations(snapshot: Record<string, unknown>) {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  return asRecord(
    table.componentLocations,
    "table.componentLocations",
  ) as Record<CardId, CardLocation>;
}

function ownerOfCard(snapshot: Record<string, unknown>) {
  const domain = asRecord(snapshot.domain, "domain");
  const table = asRecord(domain.table, "domain.table");
  return asRecord(table.ownerOfCard, "table.ownerOfCard") as Record<
    CardId,
    PlayerId | null
  >;
}

function removeCardFromArrays(
  collections: Array<Record<string, CardId[]> | PerPlayerZone>,
  cardId: CardId,
) {
  for (const collection of collections) {
    if (isPerPlayerZone(collection)) {
      for (const [, cards] of collection.entries) {
        const index = cards.indexOf(cardId);
        if (index >= 0) cards.splice(index, 1);
      }
      continue;
    }
    for (const cards of Object.values(collection)) {
      if (!Array.isArray(cards)) continue;
      const index = cards.indexOf(cardId);
      if (index >= 0) cards.splice(index, 1);
    }
  }
}

function isPerPlayerZone(
  collection: Record<string, CardId[]> | PerPlayerZone,
): collection is PerPlayerZone {
  return Array.isArray((collection as { entries?: unknown }).entries);
}

function moveCardToPlayerZone(
  snapshot: Record<string, unknown>,
  playerId: PlayerId,
  zoneId: ZoneId,
  cardId: CardId,
) {
  const shared = sharedZones(snapshot);
  const projectedShared = projectedSharedZones(snapshot);
  const hand = perPlayerZone(snapshot, "hand");
  const deck = perPlayerZone(snapshot, "deck");
  const discard = perPlayerZone(snapshot, "discard");
  const inPlay = perPlayerZone(snapshot, "in-play");
  const projectedHand = projectedPerPlayerZone(snapshot, "hand");
  const projectedDeck = projectedPerPlayerZone(snapshot, "deck");
  const projectedDiscard = projectedPerPlayerZone(snapshot, "discard");
  const projectedInPlay = projectedPerPlayerZone(snapshot, "in-play");
  removeCardFromArrays(
    [
      shared,
      projectedShared,
      hand,
      deck,
      discard,
      inPlay,
      projectedHand,
      projectedDeck,
      projectedDiscard,
      projectedInPlay,
    ],
    cardId,
  );

  const destination = playerCards(snapshot, playerId, zoneId);
  destination.push(cardId);
  projectedPlayerCards(snapshot, playerId, zoneId).push(cardId);
  ownerOfCard(snapshot)[cardId] = playerId;
  cardLocations(snapshot)[cardId] = {
    type: "InHand",
    handId: zoneId,
    playerId,
    playedBy: null,
    position: destination.length - 1,
  };
}

export async function setPlayerTurnState(
  ctx: ScenarioContext,
  playerId: PlayerId,
  phase: {
    actionsLeft?: number;
    buysLeft?: number;
    coins?: number;
    step?: "action" | "resolve" | "buy" | "cleanup";
  } = {},
) {
  await ctx.game.patchState((snapshot) => {
    const domain = asRecord(snapshot.domain, "domain");
    const flow = asRecord(domain.flow, "domain.flow");
    flow.currentPhase = "playerTurn";
    flow.activePlayers = [playerId];
    domain.phase = {
      step: phase.step ?? "action",
      actionsLeft: phase.actionsLeft ?? 1,
      buysLeft: phase.buysLeft ?? 1,
      coins: phase.coins ?? 0,
      pendingDraw: 0,
      pendingAction: null,
    };
  });
}

export async function readyForCards(
  ctx: ScenarioContext,
  playerId: PlayerId,
  opts: {
    hand: CardId[];
    deck?: CardId[];
    discard?: CardId[];
    actionsLeft?: number;
    buysLeft?: number;
    coins?: number;
  },
) {
  await ctx.game.patchState((snapshot) => {
    playerCards(snapshot, playerId, "hand").splice(0);
    playerCards(snapshot, playerId, "deck").splice(0);
    playerCards(snapshot, playerId, "discard").splice(0);
    playerCards(snapshot, playerId, "in-play").splice(0);
    projectedPlayerCards(snapshot, playerId, "hand").splice(0);
    projectedPlayerCards(snapshot, playerId, "deck").splice(0);
    projectedPlayerCards(snapshot, playerId, "discard").splice(0);
    projectedPlayerCards(snapshot, playerId, "in-play").splice(0);

    for (const cardId of opts.hand) {
      moveCardToPlayerZone(snapshot, playerId, "hand", cardId);
    }
    for (const cardId of opts.deck ?? []) {
      moveCardToPlayerZone(snapshot, playerId, "deck", cardId);
    }
    for (const cardId of opts.discard ?? []) {
      moveCardToPlayerZone(snapshot, playerId, "discard", cardId);
    }
  });
  await setPlayerTurnState(ctx, playerId, {
    actionsLeft: opts.actionsLeft,
    buysLeft: opts.buysLeft,
    coins: opts.coins,
  });
}

export function interaction(
  ctx: ScenarioContext,
  playerId: PlayerId,
  interactionId: string,
): InteractionDescriptorFor | undefined {
  return ctx
    .interactions(playerId)
    .find((descriptor) => descriptor.interactionId === interactionId);
}

export function actionForCard(cardId: CardId): InteractionId {
  const type = cardType(cardId);
  if (!(type in CARD_TYPE_TO_ACTION)) {
    throw new Error(`${cardId} is not an action card.`);
  }
  const action = CARD_TYPE_TO_ACTION[type as keyof typeof CARD_TYPE_TO_ACTION];
  if (!action) {
    throw new Error(`${cardId} is not an action card.`);
  }
  return action;
}
