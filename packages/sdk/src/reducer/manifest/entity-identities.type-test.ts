import { compileManifest } from "./compiler";
import { createTableQueries } from "../table-queries";
import type { ComponentIdOfTable } from "../model/extract";

const manifest = compileManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  zones: [],
  pieceTypes: [
    {
      id: "worker",
      name: "Worker",
      fieldsSchema: {
        properties: { strength: { type: "integer", default: 1 } },
      },
    },
    {
      id: "marker",
      name: "Marker",
      fieldsSchema: {
        properties: { color: { type: "string", default: "red" } },
      },
    },
  ],
  pieceSeeds: [
    { id: "pawn", typeId: "worker", count: 2 },
    { id: "flag", typeId: "marker" },
  ],
  dieTypes: [
    {
      id: "combat",
      name: "Combat",
      sides: 6,
      fieldsSchema: { properties: { bonus: { type: "integer", default: 0 } } },
    },
  ],
  dieSeeds: [{ id: "battle", typeId: "combat" }],
  boards: [
    {
      id: "mat",
      name: "Mat",
      layout: "generic",
      scope: "perPlayer",
      spaces: [{ id: "home" }, { id: "away" }],
    },
  ],
});

const table = manifest.createInitialTable();
const pieceId: "pawn-1" = table.pieces["pawn-1"].id;
const pieceType: "worker" = table.pieces["pawn-1"].pieceTypeId;
const strength: number = table.pieces["pawn-1"].properties.strength;
const color: string = table.pieces.flag.properties.color;
const dieId: "battle" = table.dice.battle.id;
const dieType: "combat" = table.dice.battle.dieTypeId;
const bonus: number = table.dice.battle.properties.bonus;
const scope: "perPlayer" = table.boards.byId["mat:player-1"].scope;
const spaceId: "home" = table.boards.byId["mat:player-1"].spaces.home.id;
const componentId: ComponentIdOfTable<typeof table> = "battle";
// @ts-expect-error Component identity includes only authored cards, pieces and dice.
const missingComponent: ComponentIdOfTable<typeof table> = "missing";
// @ts-expect-error A worker does not have a marker's properties.
const wrongProperty = table.pieces["pawn-1"].properties.color;
// @ts-expect-error Literal seed counts retain their bounds.
const missingPiece = table.pieces["pawn-3"];
const q = createTableQueries(table);
// @ts-expect-error Queries retain canonical component identity.
q.component.data("missing");
const queriedStrength: number = q.component.data("pawn-1")!.properties.strength;
void [
  pieceId,
  pieceType,
  strength,
  color,
  dieId,
  dieType,
  bonus,
  scope,
  spaceId,
  componentId,
  missingComponent,
  wrongProperty,
  missingPiece,
  queriedStrength,
];

// A dynamic inventory must retain literal seeds alongside its string index.
const dynamic = compileManifest({
  players: { minPlayers: 1, maxPlayers: 1 },
  cardSets: [],
  zones: [],
  pieceTypes: [
    { id: "worker", name: "Worker" },
    { id: "marker", name: "Marker" },
  ],
  pieceSeeds: [
    { id: "flag", typeId: "marker" },
    ...Array.from({ length: 2 }, (_, i) => ({
      id: `worker-${i}`,
      typeId: "worker" as const,
    })),
  ],
});
const dynamicTable = dynamic.createInitialTable();
const dynamicPiece = dynamicTable.pieces["flag"];
if (dynamicPiece.pieceTypeId === "marker") {
  const type: "marker" = dynamicPiece.pieceTypeId;
  void type;
}
