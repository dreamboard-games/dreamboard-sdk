import type { CoreInstance, Tile } from "./model.js";
import type { SeatTileRef } from "../shared/domain/seat-reference.js";
declare const game: CoreInstance<unknown>;
declare const ref: SeatTileRef;
const zone = game.zones.get("bag", "table");
const tile: Tile<unknown> = zone.getTile(ref);
const current: SeatTileRef = tile.ref;
zone.findTile(current);
tile.getTargetProps();
if (tile.data.disclosure === "concealed") {
  tile.data.appearance.cells;
  // @ts-expect-error Concealed inventory does not expose its assigned tile type.
  tile.data.tileTypeId;
} else {
  tile.data.tileTypeId;
  tile.data.properties;
}
// @ts-expect-error Authoritative IDs cannot select projected inventory objects.
zone.getTile("seed-id");
// @ts-expect-error Inventory references have no spatial target identity.
tile.spaceIds;
void current;

import { z } from "zod";
import { createGame } from "../reducer.js";
import type { TileDataOf, PlacedTileDataOf } from "./model.js";
const model = createGame({
  manifest: {
    players: { minPlayers: 1, maxPlayers: 1 },
    cardSets: [],
    tileTypes: [
      {
        id: "forest",
        name: "Forest",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        fieldsSchema: z.object({ terrain: z.literal("wood") }),
        fields: { terrain: "wood" },
        propertiesSchema: z.object({ growth: z.int().default(0) }),
      },
      {
        id: "water",
        name: "Water",
        layout: "square",
        cells: [{ id: "cell", at: { col: 0, row: 0 } }],
        fieldsSchema: z.object({ depth: z.number() }),
        fields: { depth: 2 },
        propertiesSchema: z.object({ fish: z.boolean().default(false) }),
      },
    ],
    tileSeeds: [
      { id: "tree", typeId: "forest" },
      { id: "lake", typeId: "water" },
    ],
  },
  phases: { play: z.object({}) },
  state: { public: z.object({}), private: z.object({}), hidden: z.object({}) },
});
const play = model.phase("play");
const definition = model.assemble({
  initialPhase: "play",
  phases: {
    play: play.define({
      kind: "player",
      initialState: () => ({}),
      interactions: {},
    }),
  },
  view: model.view(() => ({})),
});
declare const face: TileDataOf<typeof definition>;
if (face.disclosure === "visible" && face.tileTypeId === "forest") {
  const growth: number = face.properties.growth;
  const terrain: "wood" = face.fields.terrain;
  // @ts-expect-error Face-specific properties do not bleed between tile types.
  face.properties.fish;
  // @ts-expect-error Assigned authoritative identity is never on a visible seat DTO.
  face.id;
  void [growth, terrain];
}
if (face.disclosure === "concealed") {
  // @ts-expect-error Concealed union cannot expose face properties.
  face.properties;
}
declare const placed: PlacedTileDataOf<typeof definition>;
placed.placement.rotation;
if (placed.disclosure === "visible" && placed.tileTypeId === "water") {
  const fish: boolean = placed.properties.fish;
  const depth: number = placed.fields.depth;
  void [fish, depth];
}
