import { defineTopologyManifest } from "@dreamboard-games/sdk/types";
import { boardTemplates, boards } from "./manifest/board";
import { pieceSeeds, pieceTypes } from "./manifest/pieces";
import {
  dieSeeds,
  dieTypes,
  resources,
  setupOptions,
  setupProfiles,
} from "./manifest/setup";

export default defineTopologyManifest({
  players: {
    minPlayers: 3,
    maxPlayers: 3,
    optimalPlayers: 3,
  },
  cardSets: [],
  zones: [],
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
