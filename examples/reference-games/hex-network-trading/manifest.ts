import { defineTopologyManifest } from "@dreamboard-games/sdk/types";
import { boardTemplates, boards } from "./manifest/board";
import { cardSets, zones } from "./manifest/cards";
import { pieceSeeds, pieceTypes } from "./manifest/pieces";
import {
  dieSeeds,
  dieTypes,
  resources,
  setupOptions,
  setupProfiles,
} from "./manifest/setup";

// Standard Frontier Trails frontier layout in axial coordinates (pointy-top hexes)
// The 19 land hexes use the standard 3-4-5-4-3 ring layout
// Row offsets (r): -2, -1, 0, 1, 2
// Column offsets (q) vary per row

export default defineTopologyManifest({
  players: {
    minPlayers: 3,
    maxPlayers: 4,
    optimalPlayers: 4,
  },
  cardSets,
  zones,
  boardTemplates,
  boards,
  pieceTypes,
  pieceSeeds,
  dieTypes,
  dieSeeds,
  resources,
  setupOptions,
  setupProfiles,
});
