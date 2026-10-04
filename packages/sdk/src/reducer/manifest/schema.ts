import * as z from "zod";
import type { FieldSchemaJson } from "../../shared/domain/contracts.js";
import {
  createFieldValidatorResolver,
  schemaForCardType,
} from "./field-schemas";
import { fieldReferenceContext } from "./materialize";
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
  [
    K in keyof ManifestIds<string, string, string, string, string>
  ]: z.ZodType<string>;
};
type Ids = RuntimeManifestIds;
export function createTableSchema(analysis: Analysis, ids: Ids) {
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
  );
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
        ownerId: ids.playerId.nullish(),
        properties: objectSchema(analysis.pieceTypeSchemasById.get(type)),
      });
    },
  );
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
        ownerId: ids.playerId.nullish(),
        sides: z.literal(
          analysis.manifest.dieTypes?.find((die) => die.id === type)?.sides ??
            6,
        ),
        value: z.number().int().nullish(),
        properties: objectSchema(analysis.dieTypeSchemasById.get(type)),
      });
    },
  );
  const sharedZoneSchema = shape(
    analysis.sharedZones,
    (zone) => zone.id,
    () => z.array(ids.cardId),
  );
  const playerZoneSchema = shape(
    analysis.playerZones,
    (zone) => zone.id,
    () => z.record(ids.playerId, z.array(ids.cardId)),
  );
  const zoneIdSchema = ids.zoneId;
  const playerZoneIdSchema = ids.playerZoneId;
  const slotVariants = analysis.strictSlotHosts.flatMap((host) =>
    host.slotIds.map((slotId) =>
      z.object({
        type: z.literal("InSlot"),
        host: z.object({ kind: z.literal(host.kind), id: z.literal(host.id) }),
        slotId: z.literal(slotId),
        position: z.number().int().nullish(),
      }),
    ),
  );
  const slotLocationSchema = slotVariants.length
    ? z.union(slotVariants)
    : z.never();
  const boardSpaceTypeIdSchema = ids.spaceTypeId.nullable().optional();
  const boardSpaceStateSchema = z.object({
    id: ids.spaceId,
    name: z.string().nullable().optional(),
    typeId: boardSpaceTypeIdSchema,
    fields: unknownRecordSchema,
    zoneId: z.string().nullable().optional(),
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
  const boardContainerStateSchema = z.object({
    id: ids.boardContainerId,
    name: z.string(),
    host: z.discriminatedUnion("type", [
      z.object({ type: z.literal("board") }),
      z.object({ type: z.literal("space"), spaceId: ids.spaceId }),
    ]),
    allowedCardSetIds: z.array(ids.cardSetId).optional(),
    zoneId: z.string(),
    fields: unknownRecordSchema,
  });
  const runtimeGenericBoardStateSchema = z.object({
    id: ids.boardId,
    baseId: ids.boardBaseId,
    layout: z.literal("generic"),
    typeId: ids.boardTypeId.nullable().optional(),
    scope: z.enum(["shared", "perPlayer"]),
    playerId: ids.playerId.nullable().optional(),
    fields: unknownRecordSchema,
    // T220: per-board state.spaces is loose-keyed by string. See the
    // codegen-template comment in renderGenericBoardStateSchema for
    // the rationale; the wire shape is unchanged (additionalProperties
    // JSON), and the inner id field narrows at parse time.
    spaces: z.record(z.string(), boardSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
    containers: z.record(z.string(), boardContainerStateSchema),
  });
  const hexEdgeStateSchema = z.object({
    id: ids.edgeId,
    spaceIds: z.array(ids.spaceId).min(1).max(2),
    typeId: ids.edgeTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const hexVertexStateSchema = z.object({
    id: ids.vertexId,
    spaceIds: z.array(ids.spaceId).min(1).max(3),
    typeId: ids.vertexTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const squareVertexStateSchema = z.object({
    id: ids.vertexId,
    spaceIds: z.array(ids.spaceId).min(1).max(4),
    typeId: ids.vertexTypeId.nullable().optional(),
    label: z.string().nullable().optional(),
    ownerId: ids.playerId.nullable().optional(),
    fields: unknownRecordSchema,
  });
  const runtimeHexBoardStateSchema = runtimeGenericBoardStateSchema.extend({
    layout: z.literal("hex"),
    // T220: loose-keyed by string — see comment above.
    spaces: z.record(z.string(), hexSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
    containers: z.object({}),
    orientation: z.enum(["pointy", "flat"]),
    edges: z.array(hexEdgeStateSchema),
    vertices: z.array(hexVertexStateSchema),
  });
  const runtimeSquareBoardStateSchema = runtimeGenericBoardStateSchema.extend({
    layout: z.literal("square"),
    // T220: loose-keyed by string — see comment above.
    spaces: z.record(z.string(), squareSpaceStateSchema),
    relations: z.array(boardRelationStateSchema),
    containers: z.record(z.string(), boardContainerStateSchema),
    edges: z.array(hexEdgeStateSchema),
    vertices: z.array(squareVertexStateSchema),
  });
  const boards = analysis.analyzedBoards.flatMap((board) =>
    board.runtimeBoardIds.map((id) => {
      const base = {
        id:
          board.board.scope === "perPlayer"
            ? z.templateLiteral([board.board.id, ":", z.string().min(1)])
            : z.literal(id),
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
      const containers =
        "containers" in board
          ? shape(
              board.containers,
              (item) => item.id,
              (item) =>
                boardContainerStateSchema.extend({
                  id: z.literal(item.id),
                  fields: objectSchema(board.containerFieldsSchema),
                }),
            )
          : z.object({});
      if (board.layout === "generic")
        return {
          id,
          scope: board.board.scope,
          layout: board.layout,
          schema: runtimeGenericBoardStateSchema.extend({
            ...base,
            spaces: z.record(z.string(), spaces),
            relations,
            containers,
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
                spaces: z.record(
                  z.string(),
                  spaces.extend({ q: z.number().int(), r: z.number().int() }),
                ),
                edges,
                vertices,
              })
            : runtimeSquareBoardStateSchema.extend({
                ...base,
                spaces: z.record(
                  z.string(),
                  spaces.extend({
                    row: z.number().int(),
                    col: z.number().int(),
                  }),
                ),
                relations,
                containers,
                edges,
                vertices,
              }),
      };
    }),
  );
  const boardCollection = (entries: typeof boards) => {
    const shared = entries.filter((board) => board.scope === "shared");
    const scoped = entries
      .filter((board) => board.scope === "perPlayer")
      .map((board) => board.schema);
    return shape(
      shared,
      (board) => board.id,
      (board) => board.schema,
    ).catchall(scoped.length ? z.union(scoped) : z.never());
  };
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
      playerOrder: z.array(ids.playerId),
      zones: z.object({
        shared: sharedZoneSchema,
        perPlayer: playerZoneSchema,
        visibility: z.record(
          zoneIdSchema,
          z.enum(["all", "ownerOnly", "public", "hidden"]),
        ),
        cardSetIdsByZoneId: z
          .record(zoneIdSchema, z.array(ids.cardSetId))
          .optional(),
      }),
      decks: sharedZoneSchema,
      hands: playerZoneSchema,
      handVisibility: z.record(
        playerZoneIdSchema,
        z.enum(["all", "ownerOnly", "public", "hidden"]),
      ),
      cards: cardStateByIdSchema,
      pieces: pieceStateByIdSchema,
      componentLocations: z.record(
        z.string(),
        z.union([
          z.object({ type: z.literal("Detached") }),
          z.object({
            type: z.literal("InDeck"),
            deckId: ids.deckId,
            playedBy: ids.playerId.nullable(),
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("InHand"),
            handId: ids.handId,
            playerId: ids.playerId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("InZone"),
            zoneId: z.string(),
            playedBy: ids.playerId.nullable().optional(),
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("OnSpace"),
            boardId: ids.boardId,
            spaceId: ids.spaceId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("InContainer"),
            boardId: ids.boardId,
            containerId: ids.boardContainerId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("OnEdge"),
            boardId: ids.boardId,
            edgeId: ids.edgeId,
            position: z.number().int().nullable().optional(),
          }),
          z.object({
            type: z.literal("OnVertex"),
            boardId: ids.boardId,
            vertexId: ids.vertexId,
            position: z.number().int().nullable().optional(),
          }),
          slotLocationSchema,
        ]),
      ),
      ownerOfCard: z.record(ids.cardId, ids.playerId.nullable()),
      visibility: z.record(
        ids.cardId,
        z.object({
          faceUp: z.boolean(),
          visibleTo: z.array(ids.playerId).nullable().optional(),
        }),
      ),
      resources: z.record(
        ids.playerId,
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
    .superRefine((table, context) => {
      const players = new Set(table.playerOrder);
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
          for (const [containerId, container] of recordEntries(
            property(board, "containers"),
          ))
            validateFields(
              definition.containerFieldsSchema,
              property(container, "fields"),
              [...path, "containers", containerId, "fields"],
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
      for (const [id, players] of Object.entries(
        table.hands as Record<string, Record<string, unknown>>,
      ))
        checkPlayers(players, ["hands", id]);
      for (const [id, players] of Object.entries(
        table.zones.perPlayer as Record<string, Record<string, unknown>>,
      ))
        checkPlayers(players, ["zones", "perPlayer", id]);
    });
}
