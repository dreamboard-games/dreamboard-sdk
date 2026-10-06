import { createGame } from "../authoring/game";
import * as z from "zod";
import { ref, type FieldsInput, type FieldsOutput } from "./field-schemas";
import { defineTopologyManifest } from "./authoring";
import { compileManifest } from "./compiler";
import type { PlayerId } from "../per-player";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;
const manifest = {
  players: { minPlayers: 1, maxPlayers: 2 },
  cardSets: [],
  boards: [
    {
      layout: "generic",
      id: "board",
      name: "Board",
      scope: "shared",
      spaces: [{ id: "space" }],
    },
  ],
  zones: [{ id: "zone", name: "Zone", scope: "shared", visibility: "public" }],
  resources: [{ id: "resource", name: "Resource" }],
  pieceTypes: [{ id: "piece", name: "Piece" }],
  pieceSeeds: [{ typeId: "piece" }],
  dieTypes: [{ id: "die", name: "Die" }],
  dieSeeds: [{ typeId: "die" }],
} as const;
const fields = z.object({
  n: z.int().default(1),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  array: z.array(ref.spaceId()),
  record: z.record(z.string(), ref.zoneId()),
  nested: z.object({ value: z.int() }),
});
type ExpectedInput = {
  n?: number | undefined;
  optional?: string | undefined;
  nullable: string | null;
  array: "space"[];
  record: Record<string, "zone">;
  nested: { value: number };
};
type InputProof = Assert<
  Equal<FieldsInput<typeof fields, typeof manifest>, ExpectedInput>
>;
type OutputProof = Assert<
  Equal<
    FieldsOutput<typeof fields, typeof manifest>,
    {
      n: number;
      optional?: string | undefined;
      nullable: string | null;
      array: "space"[];
      record: Record<string, "zone">;
      nested: { value: number };
    }
  >
>;
const references = z.object({
  player: ref.playerId(),
  board: ref.boardId(),
  space: ref.spaceId(),
  zone: ref.zoneId(),
  piece: ref.pieceId(),
  die: ref.dieId(),
  resource: ref.resourceId(),
});
type RefProof = Assert<
  Equal<
    FieldsOutput<typeof references, typeof manifest>,
    {
      player: PlayerId;
      board: "board";
      space: "space";
      zone: "zone";
      piece: "piece";
      die: "die";
      resource: "resource";
    }
  >
>;
const defined = defineTopologyManifest({
  ...manifest,
  pieceTypes: [
    {
      id: "piece",
      name: "Piece",
      fieldsSchema: z.object({ n: z.int().default(1) }),
    },
  ],
});
const compiled = compileManifest(defined);
const n: number = compiled.createInitialTable().pieces.piece.properties.n;
// @ts-expect-error Defined JSON preserves authored output type through compilation.
const invalid: string = compiled.createInitialTable().pieces.piece.properties.n;
void [n, invalid];

const cardSchema = z.object({ value: ref.cardId() });
const cardManifest = {
  cardSets: [
    { id: "cards", cards: [{ id: "card", cardType: "kind", count: 1 }] },
  ],
} as const;
type CardRefProof = Assert<
  Equal<FieldsOutput<typeof cardSchema, typeof cardManifest>, { value: "card" }>
>;
const geometry = z.object({ edge: ref.edgeId(), vertex: ref.vertexId() });
type HexManifest = { boards: readonly [{ id: "hex"; layout: "hex" }] };
type GeometryProof = Assert<
  Equal<
    FieldsOutput<typeof geometry, HexManifest>,
    {
      edge: import("../../shared/domain/board-identities").HexEdgeId<"hex">;
      vertex: import("../../shared/domain/board-identities").HexVertexId<"hex">;
    }
  >
>;
compileManifest({
  ...manifest,
  pieceTypes: [
    {
      id: "piece",
      name: "Piece",
      fieldsSchema: z.object({ target: ref.pieceId() }),
    },
  ],
  // @ts-expect-error Unknown authored piece reference cannot pass the correlated compiler surface.
  pieceSeeds: [{ typeId: "piece", fields: { target: "unknown" } }],
});
const objectModes = defineTopologyManifest({
  ...manifest,
  pieceTypes: [
    {
      id: "piece",
      name: "Piece",
      fieldsSchema: z.strictObject({ n: z.int().default(1) }),
    },
    {
      id: "loose",
      name: "Loose",
      fieldsSchema: z.looseObject({ n: z.int().default(1) }),
    },
  ],
});
void objectModes;

const stateSchemas = {
  public: z.object({}),
  private: z.object({}),
  hidden: z.object({}),
};
const gameFromDefined = createGame({
  manifest: defined,
  state: stateSchemas,
  phases: { play: z.object({}) },
});
declare const definedGameState: typeof gameFromDefined.types.State;
const definedNumber: number = definedGameState.table.pieces.piece.properties.n;
// @ts-expect-error Defined JSON retains authored output shape in createGame.
const definedString: string = definedGameState.table.pieces.piece.properties.n;
void [definedNumber, definedString];
// @ts-expect-error Correlated authored field references cannot bypass checking via createGame.
createGame({
  manifest: {
    ...manifest,
    pieceTypes: [
      {
        id: "piece",
        name: "Piece",
        fieldsSchema: z.object({ target: ref.pieceId() }),
      },
    ],
    pieceSeeds: [{ typeId: "piece", fields: { target: "unknown" } }],
  },
  state: stateSchemas,
  phases: { play: z.object({}) },
});
type MissingInputProof = Assert<
  Equal<
    FieldsInput<never, typeof manifest>,
    Record<string, import("../../shared/domain/contracts").JsonValue>
  >
>;
type MissingOutputProof = Assert<
  Equal<
    FieldsOutput<never, typeof manifest>,
    Record<string, import("../../shared/domain/contracts").JsonValue>
  >
>;
const noSchema =
  compileManifest(manifest).createInitialTable().pieces.piece.properties;
const arbitraryJson: import("../../shared/domain/contracts").JsonValue =
  noSchema.anyAuthoredField;
void arbitraryJson;
