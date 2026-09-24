import { defineTopologyManifest } from "@dreamboard-games/sdk/reducer";
import { boards } from "./manifest/board";
import { pieceSeeds, pieceTypes } from "./manifest/pieces";
import { dieSeeds, dieTypes, resources } from "./manifest/setup";

export default defineTopologyManifest({
  players: {
    minPlayers: 3,
    maxPlayers: 3,
    optimalPlayers: 3,
  },
  cardSets: [],
  zones: [],
  boards,
  pieceTypes,
  pieceSeeds,
  dieTypes,
  dieSeeds,
  resources,
});
