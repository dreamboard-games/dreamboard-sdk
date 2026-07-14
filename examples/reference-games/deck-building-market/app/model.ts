import {
  cardTypes,
  literals,
  type CardId,
  type CardType,
  type SharedZoneId,
} from "../shared/manifest-contract";

export const SUPPLY_ZONE_IDS = [
  "supply-doodle",
  "supply-sketch",
  "supply-inkwork",
  "supply-idea",
  "supply-concept",
  "supply-masterpiece",
  "supply-brainstorm",
  "supply-studio",
  "supply-gallery",
  "supply-eraser",
  "supply-studio-visit",
] as const satisfies readonly SharedZoneId[];

export const TECHNIQUE_CARD_TYPES = [
  cardTypes.brainstorm,
  cardTypes.studio,
  cardTypes.gallery,
  cardTypes.eraser,
  cardTypes.studioVisit,
] as const;

export const INSPIRATION_CARD_TYPES = [
  cardTypes.doodle,
  cardTypes.sketch,
  cardTypes.inkwork,
] as const;

export const PORTFOLIO_CARD_TYPES = [
  cardTypes.idea,
  cardTypes.concept,
  cardTypes.masterpiece,
] as const;

export function supplyZoneForCardType(cardType: CardType): SharedZoneId {
  return literals.homeSharedZoneIdByCardType[cardType];
}

export function isTechniqueCardType(cardType: CardType): boolean {
  return (TECHNIQUE_CARD_TYPES as readonly CardType[]).includes(cardType);
}

export function isInspirationCardType(cardType: CardType): boolean {
  return (INSPIRATION_CARD_TYPES as readonly CardType[]).includes(cardType);
}

export function topCardBySupplyZone(
  cardsByZone: Readonly<Record<SharedZoneId, readonly CardId[]>>,
): Partial<Record<SharedZoneId, CardId>> {
  return Object.fromEntries(
    SUPPLY_ZONE_IDS.flatMap((zoneId) => {
      const cardId = cardsByZone[zoneId][0];
      return cardId ? [[zoneId, cardId] as const] : [];
    }),
  );
}
