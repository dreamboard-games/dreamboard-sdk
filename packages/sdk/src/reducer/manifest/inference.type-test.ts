import { z } from "zod";
import { compileManifest } from "./compiler";
import { createGame } from "../authoring/game";
import type { GameUiManifestOf } from "../../runtime/workspace-contract/create-game-ui";
const manifest = {
  players: { minPlayers: 2, maxPlayers: 4 },
  cardSets: [
    {
      type: "manual",
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: {
        properties: {
          points: { type: "integer" },
          color: { type: "enum", enums: ["red", "blue"] },
        },
      },
      cards: [
        {
          type: "ace",
          name: "Ace",
          count: 2,
          properties: { color: "red", points: 0 },
        },
      ],
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["cards"],
      visibility: "hidden",
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      allowedCardSetIds: ["cards"],
      visibility: "ownerOnly",
    },
    { id: "pieces", name: "Pieces", scope: "shared", allowedCardSetIds: [] },
    {
      id: "player-pieces",
      name: "Player pieces",
      scope: "perPlayer",
      allowedCardSetIds: [],
    },
  ],
  boards: [],
} as const;
const compiled = compileManifest(manifest);
type CardId = z.infer<typeof compiled.ids.cardId>;
const card: CardId = "ace-1";
// @ts-expect-error Card ids come from authored counts.
const invalidCard: CardId = "ace-3";
const table = compiled.createInitialTable();
const points: number = table.cards[card].properties.points;
// @ts-expect-error Card property enums remain narrow.
const badColor: "green" = table.cards[card].properties.color;
// @ts-expect-error Unknown decks are not part of the manifest.
const missingDeck = compiled.defaults.decks().missing;
// @ts-expect-error Runtime player records require the active roster.
const placeholderPlayers = compiled.records.playerIds(() => 0);
const game = createGame({
  manifest,
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const input = game.phase("play");
type UiManifest = GameUiManifestOf<typeof game>;
const cardZone: UiManifest["CardZoneId"] = "draw";
const playerCardZone: UiManifest["PlayerCardZoneId"] = "hand";
// @ts-expect-error A piece-only shared zone cannot host a card surface.
const pieceZone: UiManifest["CardZoneId"] = "pieces";
// @ts-expect-error A piece-only player zone cannot host a hand.
const playerPieceZone: UiManifest["PlayerCardZoneId"] = "player-pieces";
void [
  invalidCard,
  points,
  badColor,
  input,
  missingDeck,
  placeholderPlayers,
  cardZone,
  playerCardZone,
  pieceZone,
  playerPieceZone,
];

import type { ManifestIdsOf } from "./types";
const seed: ManifestIdsOf<{
  pieceSeeds: readonly [{ typeId: "token" }];
}>["pieceId"] = "token";
const hugeSeed: ManifestIdsOf<{
  pieceSeeds: readonly [{ typeId: "token"; count: 10000 }];
}>["pieceId"] = "token-9999";
const preset = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      type: "preset",
      id: "standard",
      presetId: "standard_52_deck",
      name: "Standard",
      defaultHome: { type: "zone", zoneId: "draw" },
    },
  ],
  zones: [
    {
      id: "draw",
      name: "Draw",
      scope: "shared",
      allowedCardSetIds: ["standard"],
    },
  ],
  boards: [],
} as const);
const presetCard: z.infer<typeof preset.ids.cardId> = "SPADES_A";
// @ts-expect-error The preset contains only the standard suits and ranks.
const badPresetCard: z.infer<typeof preset.ids.cardId> = "SPADES_20";
const hex = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  zones: [],
  boardTemplates: [
    {
      id: "template",
      name: "Template",
      layout: "hex",
      orientation: "pointy-top",
      spaces: [{ id: "center", q: 0, r: 0 }],
    },
  ],
  boards: [
    {
      id: "map",
      name: "Map",
      layout: "hex",
      scope: "shared",
      templateId: "template",
    },
  ],
} as const);
const hexId: z.infer<typeof hex.ids.spaceId> = "center";
const axial: number = hex.staticBoards.hex.map.spaces.center.q;
// @ts-expect-error Unused spaces do not enter the inferred manifest.
const absent: z.infer<typeof hex.ids.spaceId> = "nowhere";
void [seed, hugeSeed, preset, presetCard, badPresetCard, hexId, axial, absent];

const mergedBoard = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  zones: [],
  boardTemplates: [
    {
      id: "base",
      name: "Base",
      layout: "generic",
      spaces: [{ id: "template-space" }],
      containers: [
        {
          id: "template-container",
          name: "Template container",
          host: { type: "board" },
        },
      ],
      relations: [
        {
          id: "template-relation",
          typeId: "route",
          fromSpaceId: "template-space",
          toSpaceId: "template-space",
        },
      ],
    },
  ],
  boards: [
    {
      id: "board",
      name: "Board",
      layout: "generic",
      scope: "shared",
      templateId: "base",
      spaces: [{ id: "board-space" }],
      containers: [
        {
          id: "board-container",
          name: "Board container",
          host: { type: "board" },
        },
      ],
      relations: [],
    },
  ],
} as const);
const inheritedSpace: z.infer<typeof mergedBoard.ids.spaceId> =
  "template-space";
const addedSpace: z.infer<typeof mergedBoard.ids.spaceId> = "board-space";
const inheritedContainer: z.infer<typeof mergedBoard.ids.boardContainerId> =
  "template-container";
const addedContainer: z.infer<typeof mergedBoard.ids.boardContainerId> =
  "board-container";
const inheritedRelation: z.infer<typeof mergedBoard.ids.relationTypeId> =
  "route";
const boardSpace =
  mergedBoard.createInitialTable().boards.byId.board.spaces["template-space"];
void [
  inheritedSpace,
  addedSpace,
  inheritedContainer,
  addedContainer,
  inheritedRelation,
  boardSpace,
];
