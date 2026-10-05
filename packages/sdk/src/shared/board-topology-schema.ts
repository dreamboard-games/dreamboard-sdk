import { parsePerPlayerInstanceId } from "./domain/per-player-instance.js";
import { parseBoardElementId } from "./domain/board-element.js";
import type { BoardEdgeId, BoardVertexId } from "./domain/board-identities.js";
import { MAXIMUM_BOARD_COORDINATE } from "./domain/board-coordinates.js";
import * as z from "zod";
import { RuntimeJsonSchema, type ReadonlyRuntimeData } from "./runtime-json.js";
import { parseTileSpaceId, type TileSpaceId } from "./domain/tile-space.js";

const coordinate = z
  .number()
  .int()
  .min(-MAXIMUM_BOARD_COORDINATE)
  .max(MAXIMUM_BOARD_COORDINATE);
const fields = z.record(z.string(), RuntimeJsonSchema);
export const BoardRelationSchema = z.strictObject({
  id: z.string().min(1).nullable().optional(),
  typeId: z.string().min(1),
  fromSpaceId: z.string().min(1),
  toSpaceId: z.string().min(1),
  directed: z.boolean(),
  fields,
});
export const BoardSpaceSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().nullable().optional(),
  typeId: z.string().min(1).nullable().optional(),
  fields,
});
const tileCell = BoardSpaceSchema.extend({
  id: z.custom<TileSpaceId>((value) => parseTileSpaceId(value) !== null),
  tileId: z.string().min(1),
  localCellId: z.string().min(1),
});
function checkTileCell(cell: z.output<typeof tileCell>, ctx: z.RefinementCtx) {
  const identity = parseTileSpaceId(cell.id);
  if (identity?.tileId !== cell.tileId || identity?.cellId !== cell.localCellId)
    ctx.addIssue({
      code: "custom",
      path: ["id"],
      message: "Tile space identity must match tileId and localCellId.",
    });
}
export const HexSpaceSchema = tileCell
  .extend({ q: coordinate, r: coordinate })
  .superRefine(checkTileCell);
export const SquareSpaceSchema = tileCell
  .extend({ col: coordinate, row: coordinate })
  .superRefine(checkTileCell);
const edgeId = z.custom<BoardEdgeId>(
  (value) => parseBoardElementId(value)?.kind === "edge",
);
const vertexId = z.custom<BoardVertexId>(
  (value) => parseBoardElementId(value)?.kind === "vertex",
);
export const BoardEdgeSchema = z.strictObject({
  id: edgeId,
  spaceIds: z.array(z.string().min(1)).min(1),
  vertexIds: z.tuple([vertexId, vertexId]),
  typeId: z.string().min(1).optional(),
  label: z.string().optional(),
  fields,
});
export const BoardVertexSchema = z.strictObject({
  id: vertexId,
  spaceIds: z.array(z.string().min(1)).min(1),
  edgeIds: z.array(edgeId).min(1),
  typeId: z.string().min(1).optional(),
  label: z.string().optional(),
  fields,
});
function identityRecord<T extends z.ZodType<{ id: string }>>(schema: T) {
  return z.record(z.string().min(1), schema).superRefine((entries, ctx) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value.id !== key)
        ctx.addIssue({
          code: "custom",
          path: [key, "id"],
          message: "Record key must match item identity.",
        });
    }
  });
}
const board = z.strictObject({
  id: z.string().min(1),
  baseId: z.string().min(1),
  name: z.string(),
  scope: z.enum(["shared", "perPlayer"]),
  playerId: z.string().min(1).optional(),
  typeId: z.string().min(1).optional(),
  fields,
  relations: z.array(BoardRelationSchema),
});
export const GenericBoardTopologySchema = board.extend({
  layout: z.literal("generic"),
  spaces: identityRecord(BoardSpaceSchema),
});
export const HexBoardTopologySchema = board.extend({
  layout: z.literal("hex"),
  orientation: z.enum(["pointy", "flat"]),
  spaces: identityRecord(HexSpaceSchema),
  edges: z.array(BoardEdgeSchema),
  vertices: z.array(BoardVertexSchema),
});
export const SquareBoardTopologySchema = board.extend({
  layout: z.literal("square"),
  spaces: identityRecord(SquareSpaceSchema),
  edges: z.array(BoardEdgeSchema),
  vertices: z.array(BoardVertexSchema),
});
export const BoardTopologySchema = z
  .discriminatedUnion("layout", [
    GenericBoardTopologySchema,
    HexBoardTopologySchema,
    SquareBoardTopologySchema,
  ])
  .superRefine((topology, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const replica = parsePerPlayerInstanceId(topology.id);
    if (topology.scope === "perPlayer") {
      if (
        replica?.family !== "board" ||
        replica.baseId !== topology.baseId ||
        replica.playerId !== topology.playerId
      )
        issue(
          ["playerId"],
          "Per-player board identity must match baseId and playerId.",
        );
    } else if (
      topology.playerId !== undefined ||
      replica !== null ||
      topology.id !== topology.baseId
    ) {
      issue(
        ["playerId"],
        "Shared board identity must match baseId and cannot carry a player identity.",
      );
    }
    const spaces = new Set(Object.keys(topology.spaces));
    const relationIds = new Set<string>();
    for (const [index, relation] of topology.relations.entries()) {
      if (!spaces.has(relation.fromSpaceId) || !spaces.has(relation.toSpaceId))
        issue(
          ["relations", index],
          "Relation endpoints must belong to this topology.",
        );
      if (relation.id != null) {
        if (relationIds.has(relation.id))
          issue(
            ["relations", index, "id"],
            "Relation identities must be unique.",
          );
        relationIds.add(relation.id);
      }
    }
    if (topology.layout === "generic") return;
    const edges = new Map(topology.edges.map((edge) => [edge.id, edge]));
    const vertices = new Map(
      topology.vertices.map((vertex) => [vertex.id, vertex]),
    );
    if (edges.size !== topology.edges.length)
      issue(["edges"], "Edge identities must be unique.");
    if (vertices.size !== topology.vertices.length)
      issue(["vertices"], "Vertex identities must be unique.");
    const references = (
      ids: readonly string[],
      known: ReadonlySet<string>,
      path: (string | number)[],
    ) => {
      const seen = new Set<string>();
      for (const [index, id] of ids.entries()) {
        if (seen.has(id))
          issue([...path, index], "Incidence references must be unique.");
        if (!known.has(id))
          issue(
            [...path, index],
            "Incidence reference must belong to this topology.",
          );
        seen.add(id);
      }
    };
    const edgeIds = new Set(edges.keys());
    const vertexIds = new Set(vertices.keys());
    const vertexEdges = new Map(
      topology.vertices.map((vertex) => [vertex.id, new Set(vertex.edgeIds)]),
    );
    for (const [index, edge] of topology.edges.entries()) {
      references(edge.spaceIds, spaces, ["edges", index, "spaceIds"]);
      references(edge.vertexIds, vertexIds, ["edges", index, "vertexIds"]);
      for (const vertexId of edge.vertexIds) {
        if (vertices.has(vertexId) && !vertexEdges.get(vertexId)?.has(edge.id))
          issue(
            ["edges", index, "vertexIds"],
            "Edge and vertex incidence must agree.",
          );
      }
    }
    for (const [index, vertex] of topology.vertices.entries()) {
      references(vertex.spaceIds, spaces, ["vertices", index, "spaceIds"]);
      references(vertex.edgeIds, edgeIds, ["vertices", index, "edgeIds"]);
      for (const edgeId of vertex.edgeIds) {
        const edge = edges.get(edgeId);
        if (edge && !edge.vertexIds.includes(vertex.id))
          issue(
            ["vertices", index, "edgeIds"],
            "Edge and vertex incidence must agree.",
          );
      }
    }
    for (const [kind, items] of [
      ["edges", topology.edges],
      ["vertices", topology.vertices],
    ] as const) {
      for (const [index, item] of items.entries()) {
        const ids = [
          item.id,
          ...("vertexIds" in item ? item.vertexIds : item.edgeIds),
        ];
        if (
          ids.some((id) => {
            const identity = parseBoardElementId(id);
            return (
              identity?.boardId !== topology.id ||
              identity?.layout !== topology.layout
            );
          })
        )
          ctx.addIssue({
            code: "custom",
            path: [kind, index],
            message: "World element identity must match its board and layout.",
          });
      }
    }
  });

export const BoardProjectionSchema = identityRecord(BoardTopologySchema);

export type ReadonlyTopology<T> = ReadonlyRuntimeData<T>;
export type TopologyFields = ReadonlyTopology<z.output<typeof fields>>;
export type BoardRelation = ReadonlyTopology<
  z.output<typeof BoardRelationSchema>
>;
export type BoardSpace = ReadonlyTopology<z.output<typeof BoardSpaceSchema>>;
export type HexSpace = ReadonlyTopology<z.output<typeof HexSpaceSchema>>;
export type SquareSpace = ReadonlyTopology<z.output<typeof SquareSpaceSchema>>;
export type TileCellSpace = Omit<HexSpace, "q" | "r">;
export type BoardEdge = ReadonlyTopology<z.output<typeof BoardEdgeSchema>>;
export type BoardVertex = ReadonlyTopology<z.output<typeof BoardVertexSchema>>;
export type GenericBoardTopology = ReadonlyTopology<
  z.output<typeof GenericBoardTopologySchema>
>;
export type HexBoardTopology = ReadonlyTopology<
  z.output<typeof HexBoardTopologySchema>
>;
export type SquareBoardTopology = ReadonlyTopology<
  z.output<typeof SquareBoardTopologySchema>
>;
export type TiledBoardTopology = HexBoardTopology | SquareBoardTopology;
export type BoardTopology = ReadonlyTopology<
  z.output<typeof BoardTopologySchema>
>;
