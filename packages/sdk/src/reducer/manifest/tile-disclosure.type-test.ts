import { compileManifest } from "./compiler";
import type {
  AuthoredTileDisclosure,
  TileDisclosure,
  PublicTileAppearance,
} from "../../shared/domain/contracts.js";
const appearance: PublicTileAppearance = {
  layout: "hex",
  cells: [{ q: 0, r: 0 }],
};
const authored: AuthoredTileDisclosure = {
  face: { audience: "owner" },
  appearance,
};
const runtime: TileDisclosure = {
  face: { audience: "seats", playerIds: ["north"] },
  appearance,
};
const seats: AuthoredTileDisclosure = {
  // @ts-expect-error Authored definitions cannot name runtime seats.
  face: { audience: "seats", playerIds: ["north"] },
};
const identity: PublicTileAppearance = {
  layout: "hex",
  // @ts-expect-error Public footprint cells have no hidden local identity.
  cells: [{ id: "secret", q: 0, r: 0 }],
};
const compiled = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  tileTypes: [
    {
      id: "type",
      name: "Type",
      layout: "hex",
      cells: [{ id: "origin", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "tile",
      typeId: "type",
      disclosure: {
        face: { audience: "public" },
        appearance: { layout: "hex", cells: [{ q: 0, r: 0 }] },
      },
    },
  ],
});
const table = compiled.createInitialTable({ playerIds: ["north"] });
table.tiles.tile.disclosure = runtime;
void [authored, seats, identity];
