import { compileManifest } from "../src/reducer/manifest/compiler";

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [],
  zones: [],
  boards: [],
});

// @ts-expect-error Player records require a runtime roster, not placeholder seats.
manifest.records.playerIds(() => 0);
