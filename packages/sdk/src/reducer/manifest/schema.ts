import { asPlayerId } from "../per-player.js";
import { parsePerPlayerInstanceId } from "../../shared/domain/per-player-instance.js";
import * as z from "zod";
import type { FieldSchemaJson } from "../../shared/domain/contracts.js";
import {
  createFieldValidatorResolver,
  schemaForCardType,
} from "./field-schemas";
import { fieldReferenceContext } from "./materialize";
import { assertZoneConsistency } from "../table/zones";
import type { ZoneDefinitions, RuntimeTableRecord } from "../model";
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
function arrayEntries(value: unknown): IterableIterator<[number, unknown]> {
  const values: readonly unknown[] = Array.isArray(value) ? value : [];
  return values.entries();
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
  const unknownRecordSchema = z.record(z.string(), z.unknown());
  const resolveStatic = createFieldValidatorResolver((boardId) =>
    fieldReferenceContext(analysis, "manifest", boardId),
  );
  const objectSchema = (
    schema: FieldSchemaJson | null | undefined,
    boardId?: string,
  ): z.ZodType =>
    schema ? resolveStatic(schema, boardId) : unknownRecordSchema;
  const shape = <T>(
    items: readonly T[],
    getKey: (item: T) => string,
    getSchema: (item: T) => z.ZodTypeAny,
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
  const boardSpaceTypeIdSchema = ids.spaceTypeId.nullable().optional();
  const boardSpaceStateSchema = z.strictObject({
    id: ids.spaceId,
    name: z.string().nullable().optional(),
    typeId: boardSpaceTypeIdSchema,
    fields: unknownRecordSchema,
  });
  const hexSpaceStateSchema = boardSpaceStateSchema.extend({
    q: z.number().int(),
    r: z.number().int(),
  });
  const squareSpaceStateSchema = boardSpaceStateSchema.extend({
    row: z.number().int(),
    col: z.number().int(),
  });
  const boardRelationStateSchema = z.object({
    id: z.string().nullable().optional(),
    typeId: ids.relationTypeId,
    fromSpaceId: ids.spaceId,
    toSpaceId: ids.spaceId,
    directed: z.boolean(),
    fields: unknownRecordSchema,
  });
  const runtimeGenericBoardStateSchema = z.strictObject({
    id: activeBoardId,
    baseId: ids.boardBaseId,
    layout: z.literal("generic"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.enum(["shared", "perPlayer"]),
    playerId: activePlayerId.nullable().optional(),
    fields: unknownRecordSchema,
    spaces: z.record(z.string(), boardSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
  });
  const hexEdgeStateSchema = z.object({
    id: ids.edgeId,
    spaceIds: z.array(ids.spaceId).min(1).max(2),
    typeId: ids.edgeTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: activePlayerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const hexVertexStateSchema = z.object({
    id: ids.vertexId,
    spaceIds: z.array(ids.spaceId).min(1).max(3),
    typeId: ids.vertexTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: activePlayerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const squareVertexStateSchema = z.object({
    id: ids.vertexId,
    spaceIds: z.array(ids.spaceId).min(1).max(4),
    typeId: ids.vertexTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: activePlayerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const runtimeHexBoardStateSchema = runtimeGenericBoardStateSchema.extend({
    layout: z.literal("hex"),
    spaces: z.record(z.string(), hexSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
    orientation: z.enum(["pointy", "flat"]),
    edges: z.array(hexEdgeStateSchema),
    vertices: z.array(hexVertexStateSchema),
  });
  const runtimeSquareBoardStateSchema = runtimeGenericBoardStateSchema.extend({
    layout: z.literal("square"),
    spaces: z.record(z.string(), squareSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
    edges: z.array(hexEdgeStateSchema),
    vertices: z.array(squareVertexStateSchema),
  });
  const boards = analysis.analyzedBoards.flatMap((board) =>
    board.runtimeBoardIds.map((id) => {
      const base = {
        id: z.literal(id),
        playerId:
          board.board.scope === "perPlayer"
            ? z.literal(parsePerPlayerInstanceId(id)?.playerId)
            : z.null(),
        baseId: z.literal(board.board.id),
        scope: z.literal(board.board.scope),
        fields: objectSchema(board.boardFieldsSchema),
      };
      const spaces = boardSpaceStateSchema.extend({
        fields: objectSchema(board.spaceFieldsSchema),
      });
      const relations = z.array(
        boardRelationStateSchema.extend({
          fields: objectSchema(
            "relationFieldsSchema" in board
              ? board.relationFieldsSchema
              : undefined,
          ),
        }),
      );
      if (board.layout === "generic")
        return {
          id,
          scope: board.board.scope,
          layout: board.layout,
          schema: runtimeGenericBoardStateSchema.extend({
            ...base,
            spaces: shape(
              board.spaces,
              (space) => space.id,
              (space) => spaces.extend({ id: z.literal(space.id) }),
            ).strict(),
            relations,
          }),
        };
      const edges = z.array(
        hexEdgeStateSchema.extend({
          fields: objectSchema(board.edgeFieldsSchema),
        }),
      );
      const vertices = z.array(
        (board.layout === "hex"
          ? hexVertexStateSchema
          : squareVertexStateSchema
        ).extend({ fields: objectSchema(board.vertexFieldsSchema) }),
      );
      return {
        id,
        scope: board.board.scope,
        layout: board.layout,
        schema:
          board.layout === "hex"
            ? runtimeHexBoardStateSchema.extend({
                ...base,
                spaces: shape(
                  board.spaces,
                  (space) => space.id,
                  (space) =>
                    spaces.extend({
                      id: z.literal(space.id),
                      q: z.number().int(),
                      r: z.number().int(),
                    }),
                ).strict(),
                edges,
                vertices,
              })
            : runtimeSquareBoardStateSchema.extend({
                ...base,
                spaces: shape(
                  board.spaces,
                  (space) => space.id,
                  (space) =>
                    spaces.extend({
                      id: z.literal(space.id),
                      row: z.number().int(),
                      col: z.number().int(),
                    }),
                ).strict(),
                relations,
                edges,
                vertices,
              }),
      };
    }),
  );
  const boardCollection = (entries: typeof boards) =>
    shape(
      entries,
      (board) => board.id,
      (board) => board.schema,
    ).strict();
  const boardStateByIdSchema = boardCollection(boards);
  const hexBoardStateByIdSchema = boardCollection(
    boards.filter((board) => board.layout === "hex"),
  );
  const squareBoardStateByIdSchema = boardCollection(
    boards.filter((board) => board.layout === "square"),
  );
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
          z.object({ type: z.literal("Detached") }),
          z
            .object({
              type: z.literal("InZone"),
              zoneId: ids.zoneId,
              hostId: z.string(),
              playedBy: activePlayerId.nullable(),
            })
            .strict(),
          z.object({
            type: z.literal("OnSpace"),
            boardId: activeBoardId,
            spaceId: ids.spaceId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("OnEdge"),
            boardId: activeBoardId,
            edgeId: ids.edgeId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("OnVertex"),
            boardId: activeBoardId,
            vertexId: ids.vertexId,
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
      boards: z.object({
        byId: boardStateByIdSchema,
        hex: hexBoardStateByIdSchema,
        square: squareBoardStateByIdSchema,
        network: z.record(z.string(), unknownRecordSchema).default({}),
        track: z.record(z.string(), unknownRecordSchema).default({}),
      }),
      dice: dieStateByIdSchema,
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
      const boardEntries = Object.entries(table.boards.byId).map(
        ([id, board]) => [id, property(board, "baseId")] as const,
      );
      const boardIds = boardEntries.map(([id]) => id);
      const baseById = new Map(boardEntries);
      const referenceContext = fieldReferenceContext(analysis);
      const fieldContext = {
        ...referenceContext,
        ids: {
          ...referenceContext.ids,
          playerId: playerIds,
          boardId: boardIds,
        },
      };
      const key = JSON.stringify([
        playerIds,
        [...boardEntries].sort(([a], [b]) => a.localeCompare(b)),
      ]);
      if (!resolveSession || key !== sessionKey) {
        sessionKey = key;
        resolveSession = createFieldValidatorResolver((boardId) => {
          const baseId = boardId ? baseById.get(boardId) : undefined;
          const scoped =
            typeof baseId === "string"
              ? fieldReferenceContext(analysis, "session", baseId)
              : referenceContext;
          return {
            ...fieldContext,
            ids: { ...scoped.ids, playerId: playerIds, boardId: boardIds },
          };
        });
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
      for (const [id, board] of recordEntries(table.boards.byId)) {
        const definition = analysis.analyzedBoards.find(
          (item) => item.board.id === property(board, "baseId"),
        );
        if (!definition) continue;
        const path = ["boards", "byId", id];
        validateFields(
          definition.boardFieldsSchema,
          property(board, "fields"),
          [...path, "fields"],
          id,
        );
        for (const [spaceId, space] of recordEntries(property(board, "spaces")))
          validateFields(
            definition.spaceFieldsSchema,
            property(space, "fields"),
            [...path, "spaces", spaceId, "fields"],
            id,
          );
        if (definition.layout !== "hex") {
          for (const [index, relation] of arrayEntries(
            property(board, "relations"),
          ))
            validateFields(
              definition.relationFieldsSchema,
              property(relation, "fields"),
              [...path, "relations", index, "fields"],
              id,
            );
        }
        if (definition.layout !== "generic") {
          for (const [index, edge] of arrayEntries(property(board, "edges")))
            validateFields(
              definition.edgeFieldsSchema,
              property(edge, "fields"),
              [...path, "edges", index, "fields"],
              id,
            );
          for (const [index, vertex] of arrayEntries(
            property(board, "vertices"),
          ))
            validateFields(
              definition.vertexFieldsSchema,
              property(vertex, "fields"),
              [...path, "vertices", index, "fields"],
              id,
            );
        }
      }
      checkPlayers(table.resources, ["resources"]);
      try {
        assertZoneConsistency(table as RuntimeTableRecord, definitions);
      } catch (error) {
        context.addIssue({
          code: "custom",
          path: ["zones"],
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
}
