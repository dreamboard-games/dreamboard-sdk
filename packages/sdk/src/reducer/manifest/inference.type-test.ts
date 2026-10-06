import { z } from "zod";
import { compileManifest } from "./compiler";
import { createGame } from "../authoring/game";
import { tileSpaceId } from "../../shared/domain/tile-space.js";
const manifest = {
  players: { minPlayers: 2, maxPlayers: 4 },
  cardSets: [
    {
      id: "cards",
      name: "Cards",
      defaultHome: { type: "zone", zoneId: "draw" },
      cardSchema: z.object({
        points: z.number().int(),
        color: z.enum(["red", "blue"]),
      }),
      cards: [
        {
          id: "ace",
          cardType: "ace",
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
  ],
  boards: [],
} as const;
const compiled = compileManifest(manifest);
type CardId = z.infer<typeof compiled.ids.cardId>;
const card: CardId = "ace-1";
// @ts-expect-error Card ids come from authored counts.
const invalidCard: CardId = "ace-3";
const table = compiled.createInitialTable({
  playerIds: ["player-1", "player-2"],
});
const points: number = table.cards[card].properties.points;
// @ts-expect-error Card property enums remain narrow.
const badColor: "green" = table.cards[card].properties.color;
// @ts-expect-error Unknown zones are not part of the manifest.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Negative compiler proof: Unknown zones are not part of the manifest.
const missingZone = compiled.defaults.zones().missing;
const game = createGame({
  manifest: compileManifest(manifest),
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
  phases: { play: z.object({}) },
});
const input = game.phase("play");
void [invalidCard, points, badColor, input, missingZone];

import type { ManifestIdsOf } from "./types";
const seed: ManifestIdsOf<{
  pieceSeeds: readonly [{ typeId: "token" }];
}>["pieceId"] = "token";
const hugeSeed: ManifestIdsOf<{
  pieceSeeds: readonly [{ typeId: "token"; count: 10000 }];
}>["pieceId"] = "token-9999";
const hex = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  zones: [],
  boards: [
    {
      id: "map",
      name: "Map",
      layout: "hex",
      scope: "shared",
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "terrain",
      scope: "shared",
      home: {
        type: "board",
        boardId: "map",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
} as const);
const hexId: z.infer<typeof hex.ids.spaceId> = tileSpaceId("terrain", "center");
const axial: number = hex.tileDefinitions.terrain.cells[0].at.q;
// @ts-expect-error Unused spaces do not enter the inferred manifest.
const absent: z.infer<typeof hex.ids.spaceId> = "nowhere";
void [seed, hugeSeed, hexId, axial, absent];
