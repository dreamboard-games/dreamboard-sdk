import { z } from "zod";
import type { ObjectSchema, PropertySchema } from "@dreamboard-games/sdk-types";
import type { ManifestIds } from "../model";
import { perPlayerSchema } from "../per-player";
import type { analyzeManifest } from "./materialize";
type Analysis = ReturnType<typeof analyzeManifest>;
export type RuntimeManifestIds = {
  [K in keyof ManifestIds<
    string,
    string,
    string,
    string,
    string
  >]: z.ZodType<string>;
};
type Ids = RuntimeManifestIds;
export function createTableSchema(analysis: Analysis, ids: Ids) {
  const unknownRecordSchema = z.record(z.string(), z.unknown());
  const objectSchema = (
    schema: ObjectSchema | null | undefined,
  ): z.ZodTypeAny =>
    schema && Object.keys(schema.properties).length
      ? z.object(
          Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [
              key,
              propertySchema(value),
            ]),
          ),
        )
      : unknownRecordSchema;
  function propertySchema(schema: PropertySchema | undefined): z.ZodTypeAny {
    if (!schema) return z.unknown();
    let result: z.ZodTypeAny;
    switch (schema.type) {
      case "string":
        result = z.string();
        break;
      case "integer":
        result = z.number().int();
        break;
      case "number":
        result = z.number();
        break;
      case "boolean":
        result = z.boolean();
        break;
      case "enum":
        result = schema.enums?.length
          ? z.enum(schema.enums as [string, ...string[]])
          : z.string();
        break;
      case "array":
        result = z.array(propertySchema(schema.items));
        break;
      case "record":
        result = z.record(z.string(), propertySchema(schema.values));
        break;
      case "object":
        result = objectSchema({ properties: schema.properties ?? {} });
        break;
      default:
        result = ids[schema.type];
    }
    if (schema.nullable) result = result.nullable();
    if (schema.optional) result = result.optional();
    if (Object.prototype.hasOwnProperty.call(schema, "default"))
      result = result.default(schema.default);
    return result;
  }
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
      const properties =
        schema && "variants" in schema
          ? objectSchema({
              properties: {
                ...schema.shared,
                ...schema.variants[type]?.properties,
              },
            })
          : objectSchema(schema);
      return z.object({
        componentType: z.string().optional(),
        id: z.literal(id),
        cardSetId: z.literal(setId),
        cardType: z.literal(type),
        name: z.string().optional(),
        text: z.string().optional(),
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
    () => perPlayerSchema(z.array(ids.cardId)),
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
    ? z.union(
        slotVariants as unknown as [
          z.ZodTypeAny,
          z.ZodTypeAny,
          ...z.ZodTypeAny[],
        ],
      )
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
    templateId: z.string().nullable().optional(),
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
    orientation: z.enum(["pointy-top", "flat-top"]),
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
  return z.object({
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
    resources: perPlayerSchema(z.record(ids.resourceId, z.number().int())),
    boards: z.object({
      byId: boardStateByIdSchema,
      hex: hexBoardStateByIdSchema,
      square: squareBoardStateByIdSchema,
      network: z.record(z.string(), unknownRecordSchema).default({}),
      track: z.record(z.string(), unknownRecordSchema).default({}),
    }),
    dice: dieStateByIdSchema,
  });
}
