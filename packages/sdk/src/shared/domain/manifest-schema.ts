import * as z from "zod";
import { RuntimeJsonSchema } from "../runtime-json.js";

// The SDK owns the structural manifest contract here. Game-owned schemas and
// values remain JSON; reducer validation supplies their semantic rules.
const id = z.string().min(1);
const positiveInteger = z
  .int({ error: "Expected a positive safe integer." })
  .positive({ error: "Expected a positive safe integer." });
export const FieldSchemaJsonSchema = z.record(z.string(), RuntimeJsonSchema);
export const CardSchemaJsonSchema = z.union([
  FieldSchemaJsonSchema,
  z.strictObject({ byCardType: z.record(id, FieldSchemaJsonSchema) }),
]);
const fields = FieldSchemaJsonSchema;
export const PlayersDefinitionSchema = z.strictObject({
  minPlayers: positiveInteger,
  maxPlayers: positiveInteger,
  optimalPlayers: positiveInteger.optional(),
});
export const TopologyScopeSchema = z.enum(["shared", "perPlayer"]);
export const ZoneVisibilitySchema = z.enum(["ownerOnly", "public", "hidden"]);
export const ComponentVisibilitySpecSchema = z.strictObject({
  faceUp: z.boolean().optional(),
});
export const BoardEdgeRefSchema = z.strictObject({ spaces: z.array(id) });
export const BoardVertexRefSchema = z.strictObject({ spaces: z.array(id) });
export const DetachedHomeSpecSchema = z.strictObject({
  type: z.literal("detached"),
});
export const ZoneHomeSpecSchema = z.strictObject({
  type: z.literal("zone"),
  zoneId: id,
});
export const SpaceHomeSpecSchema = z.strictObject({
  type: z.literal("space"),
  boardId: id,
  spaceId: id,
});
export const ContainerHomeSpecSchema = z.strictObject({
  type: z.literal("container"),
  boardId: id,
  containerId: id,
});
export const EdgeHomeSpecSchema = z.strictObject({
  type: z.literal("edge"),
  boardId: id,
  ref: BoardEdgeRefSchema,
});
export const VertexHomeSpecSchema = z.strictObject({
  type: z.literal("vertex"),
  boardId: id,
  ref: BoardVertexRefSchema,
});
export const PieceSlotHostRefSchema = z.strictObject({
  kind: z.literal("piece"),
  id,
});
export const DieSlotHostRefSchema = z.strictObject({
  kind: z.literal("die"),
  id,
});
export const SlotHostRefSchema = z.discriminatedUnion("kind", [
  PieceSlotHostRefSchema,
  DieSlotHostRefSchema,
]);
export const SlotHomeSpecSchema = z.strictObject({
  type: z.literal("slot"),
  host: SlotHostRefSchema,
  slotId: id,
});
export const ComponentHomeSpecSchema = z.discriminatedUnion("type", [
  DetachedHomeSpecSchema,
  ZoneHomeSpecSchema,
  SpaceHomeSpecSchema,
  ContainerHomeSpecSchema,
  EdgeHomeSpecSchema,
  VertexHomeSpecSchema,
  SlotHomeSpecSchema,
]);
export const BoardCardSchema = z.strictObject({
  /** With multiple copies, runtime IDs expand to '{id}-1', '{id}-2', etc. */
  id,
  name: z.string(),
  count: positiveInteger,
  cardType: id,
  scope: TopologyScopeSchema.optional(),
  /** Values are checked against this card type's authored card schema. */
  properties: fields,
  /** Repository path under assets/, presented to game UIs as a loadable URL. */
  frontImage: z.string().optional(),
  /** Card back uses the same assets/ path contract as the front. */
  backImage: z.string().optional(),
  text: z.string().optional(),
  /** Overrides the card set's default home. Player distribution belongs in setup. */
  home: ComponentHomeSpecSchema.optional(),
  visibility: ComponentVisibilitySpecSchema.optional(),
});
export const CardSetDefinitionSchema = z.strictObject({
  id,
  name: z.string(),
  cardSchema: CardSchemaJsonSchema,
  /** Initial placement for cards without a home override; compatibility never implies placement. */
  defaultHome: ComponentHomeSpecSchema,
  cards: z.array(BoardCardSchema),
});
export const ZoneSpecSchema = z.strictObject({
  id,
  name: z.string(),
  scope: TopologyScopeSchema,
  allowedCardSetIds: z.array(id).optional(),
  visibility: ZoneVisibilitySchema.optional(),
});
export const BoardSpaceSpecSchema = z.strictObject({
  id,
  name: z.string().optional(),
  typeId: id.optional(),
  fields: fields.optional(),
});
export const BoardRelationSpecSchema = z.strictObject({
  id: id.optional(),
  typeId: id,
  fromSpaceId: id,
  toSpaceId: id,
  directed: z.boolean().optional(),
  fields: fields.optional(),
});
export const BoardHostSpecSchema = z.strictObject({ type: z.literal("board") });
export const SpaceHostSpecSchema = z.strictObject({
  type: z.literal("space"),
  spaceId: id,
});
export const BoardContainerHostSpecSchema = z.discriminatedUnion("type", [
  BoardHostSpecSchema,
  SpaceHostSpecSchema,
]);
export const BoardContainerSpecSchema = z.strictObject({
  id,
  name: z.string(),
  host: BoardContainerHostSpecSchema,
  allowedCardSetIds: z.array(id).optional(),
  fields: fields.optional(),
});
export const HexOrientationSchema = z.enum(["pointy", "flat"]);
export const HexCoordinateSchema = z.strictObject({ q: z.int(), r: z.int() });
const radius = {
  radius: z.int().nonnegative(),
  center: HexCoordinateSchema.optional(),
};
export const HexShapeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.enum(["hexagon", "spiral"]), ...radius }),
  z.strictObject({ kind: z.literal("ring"), ...radius }),
  z.strictObject({
    kind: z.literal("rectangle"),
    width: positiveInteger,
    height: positiveInteger,
    start: HexCoordinateSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("coordinates"),
    coordinates: z.array(HexCoordinateSchema).readonly(),
  }),
]);
export const HexSpaceSpecSchema = z.strictObject({
  id,
  ...HexCoordinateSchema.shape,
  typeId: id.optional(),
  label: z.string().optional(),
  fields: fields.optional(),
});
export const HexSpaceOverrideSchema = HexSpaceSpecSchema.omit({
  id: true,
  q: true,
  r: true,
}).extend({ id: id.optional() });
const element = {
  typeId: id.optional(),
  label: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fields: fields.optional(),
};
const side = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
export const HexEdgeRefSchema = z.union([
  z.strictObject({ spaces: z.tuple([id, id]) }),
  z.strictObject({ space: id, side }),
]);
export const HexVertexRefSchema = z.union([
  z.strictObject({ spaces: z.tuple([id, id, id]) }),
  z.strictObject({ space: id, corner: side }),
]);
export const HexEdgeSpecSchema = z.strictObject({
  ...element,
  ref: HexEdgeRefSchema,
});
export const HexVertexSpecSchema = z.strictObject({
  ...element,
  ref: HexVertexRefSchema,
});
export const SquareSpaceSpecSchema = z.strictObject({
  id,
  row: z.int(),
  col: z.int(),
  typeId: id.optional(),
  label: z.string().optional(),
  fields: fields.optional(),
});
export const SquareEdgeSpecSchema = z.strictObject({
  ...element,
  ref: BoardEdgeRefSchema,
});
export const SquareVertexSpecSchema = z.strictObject({
  ...element,
  ref: BoardVertexRefSchema,
});
const boardBase = {
  id,
  name: z.string(),
  scope: TopologyScopeSchema,
  typeId: id.optional(),
  boardFieldsSchema: fields.optional(),
  spaceFieldsSchema: fields.optional(),
  fields: fields.optional(),
};
const relationsAndContainers = {
  relationFieldsSchema: fields.optional(),
  containerFieldsSchema: fields.optional(),
  relations: z.array(BoardRelationSpecSchema).optional(),
  containers: z.array(BoardContainerSpecSchema).optional(),
};
const latticeSchemas = {
  edgeFieldsSchema: fields.optional(),
  vertexFieldsSchema: fields.optional(),
};
export const GenericBoardSpecSchema = z.strictObject({
  ...boardBase,
  ...relationsAndContainers,
  layout: z.literal("generic"),
  spaces: z.array(BoardSpaceSpecSchema).optional(),
});
export const HexBoardSpecSchema = z.strictObject({
  ...boardBase,
  ...latticeSchemas,
  layout: z.literal("hex"),
  shape: HexShapeSchema,
  exclude: z.array(HexCoordinateSchema).optional(),
  orientation: HexOrientationSchema.optional(),
  spaces: z
    .record(
      z.templateLiteral([z.number(), ",", z.number()]),
      HexSpaceOverrideSchema,
    )
    .optional(),
  edges: z.array(HexEdgeSpecSchema).optional(),
  vertices: z.array(HexVertexSpecSchema).optional(),
});
export const SquareBoardSpecSchema = z.strictObject({
  ...boardBase,
  ...relationsAndContainers,
  ...latticeSchemas,
  layout: z.literal("square"),
  spaces: z.array(SquareSpaceSpecSchema).optional(),
  edges: z.array(SquareEdgeSpecSchema).optional(),
  vertices: z.array(SquareVertexSpecSchema).optional(),
});
export const BoardSpecSchema = z.discriminatedUnion("layout", [
  GenericBoardSpecSchema,
  HexBoardSpecSchema,
  SquareBoardSpecSchema,
]);
export const ComponentSlotSpecSchema = z.strictObject({
  id,
  name: z.string().optional(),
});
export const PieceTypeSpecSchema = z.strictObject({
  id,
  name: z.string(),
  fieldsSchema: fields.optional(),
  slots: z.array(ComponentSlotSpecSchema).optional(),
});
export const PieceSeedSpecSchema = z.strictObject({
  /** With multiple copies, runtime IDs expand to '{id}-1', '{id}-2', etc. */
  id: id.optional(),
  name: z.string().optional(),
  typeId: id,
  count: positiveInteger.optional(),
  scope: TopologyScopeSchema.optional(),
  home: ComponentHomeSpecSchema.optional(),
  visibility: ComponentVisibilitySpecSchema.optional(),
  fields: fields.optional(),
});
export const DieTypeSpecSchema = PieceTypeSpecSchema.extend({
  sides: positiveInteger.optional(),
});
export const DieSeedSpecSchema = PieceSeedSpecSchema;
export const ResourceDefinitionSchema = z.strictObject({
  id,
  name: z.string(),
  icon: z.string().optional(),
  /** Defaults to public; owner balances reach only the player who holds them. */
  visibility: z.enum(["public", "owner"]).optional(),
});
export const GameTopologyManifestSchema = z.strictObject({
  players: PlayersDefinitionSchema,
  cardSets: z.array(CardSetDefinitionSchema),
  zones: z.array(ZoneSpecSchema).optional(),
  boards: z.array(BoardSpecSchema).optional(),
  pieceTypes: z.array(PieceTypeSpecSchema).optional(),
  pieceSeeds: z.array(PieceSeedSpecSchema).optional(),
  dieTypes: z.array(DieTypeSpecSchema).optional(),
  dieSeeds: z.array(DieSeedSpecSchema).optional(),
  resources: z.array(ResourceDefinitionSchema).optional(),
});
