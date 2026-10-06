import * as z from "zod";
import { compileManifest } from "./compiler";
import { ref } from "./field-schemas";
import { fromCoordinates } from "./hex-tiles.js";
import {
  tileSpaceId,
  type TileSpaceId,
} from "../../shared/domain/tile-space.js";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const fragment = fromCoordinates({
  boardId: "map",
  tileTypeId: "terrain",
  tileId: "terrain-1",
  coordinates: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ],
} as const);
const exactIdentity: Equal<
  (typeof fragment.tileSeeds)[number]["id"],
  "terrain-1"
> = true;
const exactCoordinates: Equal<
  (typeof fragment.tileTypes)[number]["cells"][number]["id"],
  "0,0" | "1,0"
> = true;
const diagonal = fromCoordinates({
  boardId: "diagonal",
  tileTypeId: "diagonal-terrain",
  tileId: "diagonal-tile",
  coordinates: [
    { q: 0, r: 0 },
    { q: 1, r: 1 },
  ],
} as const);
const correlatedCoordinates: Equal<
  (typeof diagonal.tileTypes)[number]["cells"][number]["id"],
  "0,0" | "1,1"
> = true;
// @ts-expect-error Coordinate pairs retain correlation instead of forming a Cartesian product.
const impossibleCoordinate: (typeof diagonal.tileTypes)[number]["cells"][number]["id"] =
  "0,1";
void [correlatedCoordinates, impossibleCoordinate];
const compiled = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [{ id: "map", name: "Map", scope: "shared", layout: "hex" }],
  ...fragment,
} as const);
const relationTag: z.output<typeof compiled.ids.relationTypeId> = "bridge";
const openRelationTag: Equal<
  z.output<typeof compiled.ids.relationTypeId>,
  string
> = true;
const openExtractedTag: Equal<
  import("../model/extract").RelationTypeIdOfManifest<typeof compiled>,
  string
> = true;
void [relationTag, openRelationTag, openExtractedTag];
const table = compiled.createInitialTable({ playerIds: [] });
const tile: keyof typeof table.tiles = "terrain-1";
// @ts-expect-error Helpers preserve exact authored inventory identities.
const unknownTile: keyof typeof table.tiles = "unknown";
const space: z.output<typeof compiled.ids.spaceId> = tileSpaceId(
  "terrain-1",
  "0,0",
);
const exactSpace: Equal<
  z.output<typeof compiled.ids.spaceId>,
  TileSpaceId<"terrain-1", "0,0" | "1,0">
> = true;
// @ts-expect-error Stable cell identity preserves tile instance family and local cell membership.
const unknownCell: z.output<typeof compiled.ids.spaceId> = tileSpaceId(
  "terrain-1",
  "missing",
);
// @ts-expect-error Runtime instances store no copied geometry.
table.boards.map.spaces;
// @ts-expect-error Immutable compiled local coordinates cannot be edited.
compiled.tileDefinitions.terrain.cells[0].at.q = 2;
void [
  exactIdentity,
  exactCoordinates,
  tile,
  unknownTile,
  space,
  exactSpace,
  unknownCell,
];

const nestedManifest = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    {
      id: "data",
      name: "Data",
      layout: "generic",
      scope: "shared",
      boardFieldsSchema: z.object({
        nested: z.object({
          labels: z.array(z.string()),
          maybe: z.number().optional(),
        }),
        cells: z.array(z.object({ enabled: z.boolean() })),
        selected: ref.spaceId(),
      }),
      fields: {
        nested: { labels: ["a"] },
        cells: [{ enabled: true }],
        selected: "cell",
      },
      spaces: [{ id: "cell" }],
    },
  ],
  tileTypes: [
    {
      id: "typed",
      name: "Typed",
      layout: "square",
      fieldsSchema: z.object({
        value: z.object({ count: z.number(), note: z.string().optional() }),
      }),
      fields: { value: { count: 1 } },
      cells: [{ id: "local", at: { col: 0, row: 0 } }],
    },
  ],
} as const;
const nested = compileManifest(nestedManifest);
const jsonDefinitions: import("../../shared/domain/topology-definitions.js").TopologyDefinitions =
  nested;
const label: string = nested.boardDefinitions.data.fields.nested.labels[0];
const optional: number | undefined =
  nested.boardDefinitions.data.fields.nested.maybe;
const selected: "cell" = nested.boardDefinitions.data.fields.selected;
const count: number = nested.tileDefinitions.typed.fields.value.count;
// @ts-expect-error Normalized definitions preserve exact nested field names.
nested.boardDefinitions.data.fields.nested.unknown;
// @ts-expect-error Nested arrays in definitions are immutable.
// eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative proof: mutation is not part of readonly array API.
nested.boardDefinitions.data.fields.nested.labels.push("b");
// @ts-expect-error Optional nested fields retain their value type.
const wrongOptional: string | undefined =
  nested.tileDefinitions.typed.fields.value.note?.length;
void [jsonDefinitions, label, optional, selected, count, wrongOptional];

declare const unknownDocument: unknown;
// @ts-expect-error Unknown wire documents require the explicit JSON admission API.
compileManifest(unknownDocument);
// @ts-expect-error Typed authoring still requires the complete manifest shape.
compileManifest({ cardSets: [] });
