import { z } from "zod";
import {
  asPlayerId,
  perPlayer,
  type PerPlayer,
} from "@dreamboard-games/sdk/reducer";
import type {
  ReducerManifestContract,
  RuntimeTableRecord,
} from "@dreamboard-games/sdk/reducer/advanced";

export const literals = {
  playerIds: ["player-1"] as const,
  phaseNames: [] as readonly string[],
  boardLayouts: ["generic", "hex", "square"] as const,
  setupOptionIds: [] as const,
  setupProfileIds: ["standard"] as const,
  setupChoiceIdsByOptionId: {} as const,
  cardSetIds: [] as const,
  cardTypes: [] as const,
  cardIds: [] as const,
  deckIds: [] as const,
  handIds: [] as const,
  sharedZoneIds: [] as const,
  playerZoneIds: [] as const,
  zoneIds: [] as const,
  resourceIds: [] as const,
  pieceTypeIds: [] as const,
  pieceIds: [] as const,
  dieTypeIds: [] as const,
  dieIds: [] as const,
  boardBaseIds: [] as const,
  boardTemplateIds: [] as const,
  boardIds: [] as const,
  boardContainerIds: [] as const,
  boardTypeIds: [] as const,
  tileIds: [] as const,
  tileTypeIds: [] as const,
  edgeIds: [] as const,
  edgeTypeIds: [] as const,
  vertexIds: [] as const,
  vertexTypeIds: [] as const,
  portIds: [] as const,
  portTypeIds: [] as const,
  spaceIds: [] as const,
  spaceTypeIds: [] as const,
  relationTypeIds: [] as const,
  handVisibilityById: {} as const,
  zoneVisibilityById: {} as const,
  cardSetIdByCardId: {} as const,
  cardTypeByCardId: {} as const,
  cardSetIdsBySharedZoneId: {} as const,
  cardSetIdsByPlayerZoneId: {} as const,
  resourcePresentationById: {} as const,
};

export type PlayerId = (typeof literals.playerIds)[number];
export type SetupProfileId = (typeof literals.setupProfileIds)[number];

export const ids = {
  playerId: z.enum(literals.playerIds),
  phaseName: z.string(),
  boardLayout: z.enum(literals.boardLayouts),
  setupOptionId: z.string(),
  setupProfileId: z.enum(literals.setupProfileIds),
  cardSetId: z.string(),
  cardType: z.string(),
  cardId: z.string(),
  deckId: z.string(),
  handId: z.string(),
  sharedZoneId: z.string(),
  playerZoneId: z.string(),
  zoneId: z.string(),
  resourceId: z.string(),
  dieTypeId: z.string(),
  dieId: z.string(),
  boardBaseId: z.string(),
  boardId: z.string(),
  boardContainerId: z.string(),
  boardTypeId: z.string(),
  tileId: z.string(),
  tileTypeId: z.string(),
  edgeId: z.string(),
  edgeTypeId: z.string(),
  vertexId: z.string(),
  vertexTypeId: z.string(),
  portId: z.string(),
  portTypeId: z.string(),
  spaceId: z.string(),
  spaceTypeId: z.string(),
  pieceId: z.string(),
  pieceTypeId: z.string(),
  relationTypeId: z.string(),
};

export function createEmptyTable(
  playerIds: readonly string[] = literals.playerIds,
): RuntimeTableRecord {
  const players = playerIds.map((id) => asPlayerId(id));
  return {
    playerOrder: [...playerIds],
    zones: { shared: {}, perPlayer: {}, visibility: {} },
    decks: {},
    hands: {},
    handVisibility: {},
    cards: {},
    pieces: {},
    componentLocations: {},
    ownerOfCard: {},
    visibility: {},
    resources: perPlayer(players, () => ({})),
    boards: { byId: {}, hex: {}, network: {}, square: {}, track: {} },
    dice: {},
  };
}

export const defaults = {
  zones: () => ({ shared: {}, perPlayer: {}, visibility: {} }),
  decks: () => ({}),
  hands: () => ({}),
  handVisibility: () => ({}),
  ownerOfCard: () => ({}),
  visibility: () => ({}),
  resources: (
    playerIds: readonly string[] = [],
  ): PerPlayer<Record<string, number>> =>
    perPlayer(
      playerIds.map((id) => asPlayerId(id)),
      () => ({}),
    ),
};

export const staticBoards = { byId: {}, hex: {}, square: {} };
export const setupOptionsById = {};
export const setupChoiceIdsByOptionId = {};
export const setupProfilesById = {
  standard: {
    id: "standard",
    name: "River Guild setup",
    description:
      "One human player shares a public river with a deterministic rival deck.",
  },
};
export const tableSchema = z.custom<RuntimeTableRecord>();
export const runtimeSchema = z.any();
export const createGameStateSchema = () => z.any();

export const manifestContract: ReducerManifestContract<
  RuntimeTableRecord,
  string,
  PlayerId,
  string,
  string,
  string
> = {
  literals,
  ids,
  defaults,
  staticBoards,
  setupOptionsById,
  setupChoiceIdsByOptionId,
  setupProfilesById,
  tableSchema,
  runtimeSchema,
  createGameStateSchema,
};

export default manifestContract;
