import { defineTopologyManifest } from "../src/reducer/manifest/authoring.js";
import type { ManifestIdsOf } from "../src/reducer/manifest/types.js";

const manifest = defineTopologyManifest({
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [
    {
      id: "references",
      name: "References",
      defaultHome: { type: "detached" },
      cardSchema: {
        properties: {
          piece: { type: "pieceId" },
          die: { type: "dieId" },
        },
      },
      cards: [
        {
          id: "omitted-count",
          cardType: "reference",
          name: "Omitted Count",
          count: 1,
          properties: { piece: "worker", die: "roll" },
        },
        {
          id: "explicit-count",
          cardType: "reference",
          name: "Explicit Count",
          count: 1,
          properties: { piece: "single-worker", die: "single-roll" },
        },
        {
          id: "multiple-copies",
          cardType: "reference",
          name: "Multiple Copies",
          count: 1,
          properties: { piece: "workers-2", die: "rolls-3" },
        },
      ],
    },
  ],
  zones: [],
  boards: [],
  pieceTypes: [{ id: "worker", name: "Worker" }],
  pieceSeeds: [
    { typeId: "worker" },
    { id: "single-worker", typeId: "worker", count: 1 },
    { id: "workers", typeId: "worker", count: 3 },
  ],
  dieTypes: [{ id: "roll", name: "Roll", sides: 6 }],
  dieSeeds: [
    { typeId: "roll" },
    { id: "single-roll", typeId: "roll", count: 1 },
    { id: "rolls", typeId: "roll", count: 3 },
  ],
  resources: [],
});

type PieceId = ManifestIdsOf<typeof manifest>["pieceId"];
type DieId = ManifestIdsOf<typeof manifest>["dieId"];

const omittedPiece: PieceId = "worker";
const omittedDie: DieId = "roll";
const explicitPiece: PieceId = "single-worker";
const explicitDie: DieId = "single-roll";
const copiedPiece: PieceId = "workers-2";
const copiedDie: DieId = "rolls-3";

// @ts-expect-error Copies use numbered ids instead of the unsuffixed seed id.
const invalidCopy: PieceId = "workers";
// @ts-expect-error The count limits the generated runtime ids.
const invalidCount: DieId = "rolls-4";
// @ts-expect-error Unauthored ids are not valid piece ids.
const invalidPiece: PieceId = "unknown-worker";
// @ts-expect-error Unauthored ids are not valid die ids.
const invalidDie: DieId = "unknown-roll";

void [
  omittedPiece,
  omittedDie,
  explicitPiece,
  explicitDie,
  copiedPiece,
  copiedDie,
  invalidCopy,
  invalidCount,
  invalidPiece,
  invalidDie,
];
