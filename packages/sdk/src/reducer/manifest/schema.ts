import { BoardRelationSchema } from "../../shared/board-topology-schema.js";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import { deriveBoardTopology } from "../../shared/board-topology.js";
import { TilePlacementSchema } from "../../shared/domain/tile-placement.js";
import { asPlayerId } from "../per-player.js";
import * as z from "zod";
import type { FieldSchemaJson } from "../../shared/domain/contracts.js";
import {
  createFieldValidatorResolver,
  schemaForCardType,
} from "./field-schemas";
import { fieldReferenceContext } from "./materialize";
import { assertZoneConsistency } from "../table/zones";
import type { ZoneDefinitions } from "../model";
import type { ManifestIds } from "../model";

import type { analyzeManifest } from "./materialize";
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function property(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}
function recordEntries(value: unknown): [string, unknown][] {
  return isRecord(value) ? Object.entries(value) : [];
}
type Analysis = ReturnType<typeof analyzeManifest>;
export type RuntimeManifestIds = {
  [K in keyof ManifestIds<string, string, string, string>]: z.ZodType<string>;
};
type Ids = RuntimeManifestIds;
export function createTableSchema(
  analysis: Analysis,
  ids: Ids,
  definitions: ZoneDefinitions,
) {
  const membership = (values: readonly string[]): z.ZodType<string> =>
    values.length ? z.enum(values) : z.never();
  const activeBoardId = membership(analysis.boardIds);
  const activeCardId = membership(analysis.cardIds);
  const activePlayerId = membership(analysis.playerIds).transform(asPlayerId);
  const unknownRecordSchema = z.record(z.string(), RuntimeJsonSchema);
  const resolveStatic = createFieldValidatorResolver((boardId) =>
    fieldReferenceContext(analysis, "manifest", boardId),
  );
  const objectSchema = (
    schema: FieldSchemaJson | null | undefined,
    boardId?: string,
  ) =>
    schema
      ? resolveStatic(schema, boardId).pipe(unknownRecordSchema)
      : unknownRecordSchema;
  const shape = <T, S extends z.ZodType>(
    items: readonly T[],
    getKey: (item: T) => string,
    getSchema: (item: T) => S,
  ) =>
    z.object(
      Object.fromEntries(items.map((item) => [getKey(item), getSchema(item)])),
    );
  const cardStateByIdSchema = shape(
    analysis.cardIds,
    (id) => id,
    (id) => {
      const setId = analysis.cardSetIdByCardId.get(id)!;
      const type = analysis.cardTypeByCardId.get(id)!;
      const schema = analysis.cardSets.find(
        (set) => set.id === setId,
      )!.cardSchema;
      const properties = objectSchema(schemaForCardType(schema, type));
      return z.object({
        componentType: z.string().optional(),
        id: z.literal(id),
        cardSetId: z.literal(setId),
        cardType: z.literal(type),
        name: z.string().optional(),
        text: z.string().optional(),
        frontImage: z.string().optional(),
        backImage: z.string().optional(),
        properties,
      });
    },
  ).strict();
  const pieceStateByIdSchema = shape(
    analysis.pieceIds,
    (id) => id,
    (id) => {
      const type = analysis.pieceTypeIdByPieceId.get(id)!;
      return z.object({
        componentType: z.string().optional(),
        id: z.literal(id),
        pieceTypeId: z.literal(type),
        pieceName: z.string().nullish(),
        ownerId: activePlayerId.nullish(),
        properties: objectSchema(analysis.pieceTypeSchemasById.get(type)),
      });
    },
  ).strict();
  const dieStateByIdSchema = shape(
    analysis.dieIds,
    (id) => id,
    (id) => {
      const type = analysis.dieTypeIdByDieId.get(id)!;
      return z.object({
        componentType: z.string().optional(),
        id: z.literal(id),
        dieTypeId: z.literal(type),
        dieName: z.string().nullish(),
        ownerId: activePlayerId.nullish(),
        sides: z.literal(
          analysis.manifest.dieTypes?.find((die) => die.id === type)?.sides ??
            6,
        ),
        value: z.number().int().nullish(),
        properties: objectSchema(analysis.dieTypeSchemasById.get(type)),
      });
    },
  ).strict();
  const tileStateByIdSchema = shape(
    analysis.tileIds,
    (id) => id,
    (id) => {
      const type = analysis.tileTypeIdByTileId.get(id)!;
      return z.strictObject({
        componentType: z.literal("tile"),
        id: z.literal(id),
        tileTypeId: z.literal(type),
        ownerId: activePlayerId.nullable(),
        properties: objectSchema(analysis.tilePropertiesSchemasById.get(type)),
      });
    },
  ).strict();
  const boards = analysis.analyzedBoards.flatMap((board) =>
    board.runtimeBoardIds.map((id) => ({
      id,
      schema: z.strictObject({
        baseId: z.literal(board.board.id),
        relations: z.array(
          BoardRelationSchema.extend({
            fields: objectSchema(board.relationFieldsSchema),
          }),
        ),
      }),
    })),
  );
  const boardStateByIdSchema = shape(
    boards,
    (board) => board.id,
    (board) => board.schema,
  ).strict();
  const tilePlacement = z.discriminatedUnion("layout", [
    TilePlacementSchema.options[0].extend({ boardId: activeBoardId }),
    TilePlacementSchema.options[1].extend({ boardId: activeBoardId }),
  ]);
  let sessionKey = "";
  let resolveSession:
    ReturnType<typeof createFieldValidatorResolver> | undefined;
  return z
    .object({
      playerOrder: z.array(activePlayerId),
      zones: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
      cards: cardStateByIdSchema,
      pieces: pieceStateByIdSchema,
      componentLocations: z.record(
        z.string(),
        z.union([
          tilePlacement,
          z.strictObject({ type: z.literal("Detached") }),
          z
            .object({
              type: z.literal("InZone"),
              zoneId: ids.zoneId,
              hostId: z.string(),
              playedBy: activePlayerId.nullable(),
            })
            .strict(),
          z.strictObject({
            type: z.literal("OnSpace"),
            boardId: activeBoardId,
            spaceId: z.string().min(1),
            position: z.number().int().nullable().optional(),
          }),
          z.strictObject({
            type: z.literal("OnEdge"),
            boardId: activeBoardId,
            edgeId: z.string().min(1),
            position: z.number().int().nullable().optional(),
          }),
          z.strictObject({
            type: z.literal("OnVertex"),
            boardId: activeBoardId,
            vertexId: z.string().min(1),
            position: z.number().int().nullable().optional(),
          }),
        ]),
      ),
      ownerOfCard: z.record(activeCardId, activePlayerId.nullable()),
      visibility: z.record(
        activeCardId,
        z.object({
          faceUp: z.boolean(),
          visibleTo: z.array(activePlayerId).nullable().optional(),
        }),
      ),
      resources: z.record(
        activePlayerId,
        z.record(ids.resourceId, z.number().int()),
      ),
      boards: boardStateByIdSchema,
      dice: dieStateByIdSchema,
      tiles: tileStateByIdSchema,
    })
    .strict()
    .superRefine((table, context) => {
      const players = new Set<string>(table.playerOrder);
      if (players.size !== table.playerOrder.length) {
        context.addIssue({
          code: "custom",
          path: ["playerOrder"],
          message: "Duplicate player id",
        });
      }
      const checkPlayers = (
        record: Record<string, unknown>,
        path: string[],
      ) => {
        for (const playerId of table.playerOrder) {
          if (!Object.hasOwn(record, playerId))
            context.addIssue({
              code: "custom",
              path: [...path, playerId],
              message: "Missing active player",
            });
        }
        for (const playerId of Object.keys(record)) {
          if (!players.has(playerId))
            context.addIssue({
              code: "custom",
              path: [...path, playerId],
              message: "Unknown active player",
            });
        }
      };
      const playerIds = [...table.playerOrder];
      const boardEntries = Object.entries(table.boards).map(
        ([id, board]) => [id, property(board, "baseId")] as const,
      );
      const boardIds = boardEntries.map(([id]) => id);
      const referenceContext = fieldReferenceContext(analysis);
      const topologyIds = new Map<
        string,
        { spaceId: string[]; edgeId: string[]; vertexId: string[] }
      >();
      try {
        for (const id of boardIds) {
          const topology = deriveBoardTopology(table, definitions, id);
          topologyIds.set(id, {
            spaceId: Object.keys(topology.spaces),
            edgeId:
              topology.layout === "generic"
                ? []
                : topology.edges.map((edge) => edge.id),
            vertexId:
              topology.layout === "generic"
                ? []
                : topology.vertices.map((vertex) => vertex.id),
          });
        }
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["boards"],
          message: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const geometryIds = {
        spaceId: [
          ...new Set([...topologyIds.values()].flatMap((ids) => ids.spaceId)),
        ],
        edgeId: [
          ...new Set([...topologyIds.values()].flatMap((ids) => ids.edgeId)),
        ],
        vertexId: [
          ...new Set([...topologyIds.values()].flatMap((ids) => ids.vertexId)),
        ],
      };
      const fieldContext = {
        ...referenceContext,
        ids: {
          ...referenceContext.ids,
          ...geometryIds,
          playerId: playerIds,
          boardId: boardIds,
        },
      };
      const key = JSON.stringify([
        playerIds,
        [...boardEntries].sort(([a], [b]) => a.localeCompare(b)),
        [...topologyIds].sort(([a], [b]) => a.localeCompare(b)),
      ]);
      if (!resolveSession || key !== sessionKey) {
        const nextResolver = createFieldValidatorResolver((boardId) => ({
          ...fieldContext,
          ids: {
            ...fieldContext.ids,
            ...(boardId ? topologyIds.get(boardId) : geometryIds),
          },
        }));
        sessionKey = key;
        resolveSession = nextResolver;
      }
      const sessionResolver = resolveSession;
      const validateFields = (
        schema: FieldSchemaJson | null | undefined,
        value: unknown,
        path: PropertyKey[],
        boardId?: string,
      ) => {
        if (!schema) return;
        try {
          const result = sessionResolver(schema, boardId).safeParse(value);
          if (!result.success)
            for (const issue of result.error.issues)
              context.addIssue({
                code: "custom",
                path: [...path, ...issue.path],
                message: issue.message,
              });
        } catch (error) {
          context.addIssue({
            code: "custom",
            path,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      };
      for (const [id, card] of recordEntries(table.cards)) {
        const set = analysis.cardSets.find(
          (set) => set.id === analysis.cardSetIdByCardId.get(id),
        );
        if (set)
          validateFields(
            schemaForCardType(
              set.cardSchema,
              analysis.cardTypeByCardId.get(id)!,
            ),
            property(card, "properties"),
            ["cards", id, "properties"],
          );
      }
      for (const [id, piece] of recordEntries(table.pieces))
        validateFields(
          analysis.pieceTypeSchemasById.get(
            analysis.pieceTypeIdByPieceId.get(id)!,
          ),
          property(piece, "properties"),
          ["pieces", id, "properties"],
        );
      for (const [id, die] of recordEntries(table.dice))
        validateFields(
          analysis.dieTypeSchemasById.get(analysis.dieTypeIdByDieId.get(id)!),
          property(die, "properties"),
          ["dice", id, "properties"],
        );
      for (const [i, authored] of (analysis.manifest.boards ?? []).entries()) {
        for (const [runtimeId, baseId] of boardEntries) {
          if (baseId !== authored.id) continue;
          const definition = definitions.boardDefinitions[authored.id];
          validateFields(
            authored.boardFieldsSchema,
            definition.fields,
            ["manifest", "boards", i, "fields"],
            runtimeId,
          );
          if (
            authored.layout === "generic" &&
            definition.layout === "generic"
          ) {
            for (const [spaceId, space] of Object.entries(definition.spaces))
              validateFields(
                authored.spaceFieldsSchema,
                space.fields,
                ["manifest", "boards", i, "spaces", spaceId, "fields"],
                runtimeId,
              );
          }
        }
      }
      for (const [i, type] of (analysis.manifest.tileTypes ?? []).entries()) {
        validateFields(type.fieldsSchema, type.fields ?? {}, [
          "manifest",
          "tileTypes",
          i,
          "fields",
        ]);
        for (const [j, cell] of type.cells.entries())
          validateFields(type.cellFieldsSchema, cell.fields ?? {}, [
            "manifest",
            "tileTypes",
            i,
            "cells",
            j,
            "fields",
          ]);
        for (const [j, edge] of (type.edges ?? []).entries())
          validateFields(type.edgeFieldsSchema, edge.fields ?? {}, [
            "manifest",
            "tileTypes",
            i,
            "edges",
            j,
            "fields",
          ]);
        for (const [j, vertex] of (type.vertices ?? []).entries())
          validateFields(type.vertexFieldsSchema, vertex.fields ?? {}, [
            "manifest",
            "tileTypes",
            i,
            "vertices",
            j,
            "fields",
          ]);
      }
      for (const [id, tile] of recordEntries(table.tiles))
        validateFields(
          analysis.tilePropertiesSchemasById.get(
            analysis.tileTypeIdByTileId.get(id)!,
          ),
          property(tile, "properties"),
          ["tiles", id, "properties"],
        );
      for (const [id, board] of Object.entries(table.boards)) {
        const declaration = analysis.analyzedBoards.find(
          (item) => item.board.id === board.baseId,
        );
        if (declaration)
          for (const [index, relation] of board.relations.entries())
            validateFields(
              declaration.relationFieldsSchema,
              relation.fields,
              ["boards", id, "relations", index, "fields"],
              id,
            );
      }
      for (const [id, location] of Object.entries(table.componentLocations)) {
        if (location.type !== "OnBoard") continue;
        const tile = Object.hasOwn(table.tiles, id)
          ? table.tiles[id]
          : undefined;
        const board = Object.hasOwn(table.boards, location.boardId)
          ? table.boards[location.boardId]
          : undefined;
        const tileDefinition =
          tile && Object.hasOwn(definitions.tileDefinitions, tile.tileTypeId)
            ? definitions.tileDefinitions[tile.tileTypeId]
            : undefined;
        const boardDefinition =
          board && Object.hasOwn(definitions.boardDefinitions, board.baseId)
            ? definitions.boardDefinitions[board.baseId]
            : undefined;
        if (
          !tile ||
          !tileDefinition ||
          !boardDefinition ||
          boardDefinition.layout === "generic" ||
          tileDefinition.layout !== location.layout ||
          boardDefinition.layout !== location.layout
        )
          context.addIssue({
            code: "custom",
            path: ["componentLocations", id],
            message: "OnBoard requires a tile and matching tiled board layout.",
          });
      }
      checkPlayers(table.resources, ["resources"]);
      try {
        assertZoneConsistency(table, definitions);
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["zones"],
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
}
