import * as z from "zod";
import { compileManifest } from "./compiler";
import { ref } from "./field-schemas";
import {
  perPlayerInstanceId,
  type PerPlayerInstanceId,
} from "../../shared/domain/per-player-instance.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const source = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [],
  zones: [
    { id: "supply", name: "Supply", scope: "perPlayer" },
    {
      id: "private",
      name: "Private",
      scope: "perPlayer",
      visibility: "ownerOnly",
    },
  ],
  tileTypes: [
    {
      id: "terrain",
      name: "Terrain",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
      propertiesSchema: z.object({
        charges: z.int().default(2),
        selected: ref.tileId().optional(),
      }),
    },
  ],
  tileSeeds: [
    {
      id: "terrain",
      typeId: "terrain",
      count: 2,
      scope: "perPlayer",
      home: { type: "zone", zoneId: "supply" },
    },
  ],
} as const;
const manifest = compileManifest(source);
const table = manifest.createInitialTable({ playerIds: ["seat"] });
const id = perPlayerInstanceId("tile", "terrain-2", "seat");
const exactId: Equal<
  keyof typeof table.tiles,
  PerPlayerInstanceId<"tile", "terrain-1" | "terrain-2">
> = true;
const exactType: Equal<
  (typeof table.tiles)[keyof typeof table.tiles]["tileTypeId"],
  "terrain"
> = true;
const charges: number = table.tiles[id].properties.charges;
const selected:
  PerPlayerInstanceId<"tile", "terrain-1" | "terrain-2"> | undefined =
  table.tiles[id].properties.selected;
const staticOnly: Equal<(typeof manifest.literals.tileIds)[number], never> =
  true;
// @ts-expect-error Generated instances require exact tile family/base membership.
const wrongId: keyof typeof table.tiles = perPlayerInstanceId(
  "piece",
  "terrain-2",
  "seat",
);
const spatial: (typeof table.componentLocations)[typeof id] = {
  // @ts-expect-error Tile locations do not include spatial piece/card locations.
  type: "OnSpace",
  boardId: "board",
  spaceId: "cell",
};
const privateHome = {
  ...source,
  tileSeeds: [
    { ...source.tileSeeds[0], home: { type: "zone", zoneId: "private" } },
  ],
} as const;
// Private tile homes are admitted; location policy controls seat delivery.
compileManifest(privateHome);
const wrongProperties = {
  ...source,
  tileSeeds: [{ ...source.tileSeeds[0], properties: { charges: "bad" } }],
} as const;
// @ts-expect-error Instance properties retain the authored input schema type.
compileManifest(wrongProperties);
const wrongCell = {
  ...source,
  tileTypes: [
    { ...source.tileTypes[0], edges: [{ cellId: "missing", side: 1 }] },
  ],
} as const;
// @ts-expect-error Annotations refer to exact local cell IDs.
compileManifest(wrongCell);
const forgedOwner = {
  ...source,
  tileSeeds: [{ ...source.tileSeeds[0], ownerId: "seat" }],
} as const;
// @ts-expect-error Replication initializes ownership; seeds cannot supply an owner.
compileManifest(forgedOwner);
void [exactId, exactType, charges, selected, staticOnly, wrongId, spatial];

const publicTile: (typeof table.zones.supply)[Extract<
  keyof typeof table.zones.supply,
  string
>][number] = id;
const privateTile: (typeof table.zones.private)[Extract<
  keyof typeof table.zones.private,
  string
>][number] = id;
void [publicTile, privateTile];
