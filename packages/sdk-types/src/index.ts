import type {
  DieTypeSpec as ApiDieTypeSpec,
  GameTopologyManifest as ApiGameTopologyManifest,
} from "@dreamboard-games/api-client/types.gen";

export type {
  ActionDefinition,
  ActionParameterDefinition,
  BoardCard,
  BoardContainerHostSpec,
  BoardContainerSpec,
  BoardEdgeRef,
  BoardHostSpec,
  BoardLayout,
  BoardRelationSpec,
  BoardSpaceSpec,
  BoardSpec,
  BoardTemplateSpec,
  BoardVertexRef,
  CardPropertySchema,
  CardPropertySchemaVariants,
  GenericBoardSpec,
  GenericBoardTemplateSpec,
  ContainerHomeSpec,
  EdgeHomeSpec,
  HexBoardSpec,
  HexBoardTemplateSpec,
  HexEdgeRef,
  HexEdgeSpec,
  HexOrientation,
  HexSpaceSpec,
  HexVertexRef,
  HexVertexSpec,
  CardSetDefinition,
  CardSetSourceType,
  ComponentHomeSpec,
  ComponentSlotSpec,
  ComponentVisibilitySpec,
  DetachedHomeSpec,
  DieSeedSpec,
  ManualCardSetDefinition,
  ObjectSchema,
  ParameterType,
  PieceSeedSpec,
  PieceSlotHostRef,
  PieceTypeSpec,
  PlayersDefinition,
  PresetCardSetDefinition,
  PropertySchema,
  ResourceDefinition,
  SetupOptionChoiceSpec,
  SetupOptionSpec,
  SetupProfileSpec,
  SlotHomeSpec,
  SlotHostRef,
  SpaceHomeSpec,
  SpaceHostSpec,
  SquareBoardSpec,
  SquareBoardTemplateSpec,
  SquareEdgeSpec,
  SquareSpaceSpec,
  SquareVertexSpec,
  TopologyScope,
  DieSlotHostRef,
  VertexHomeSpec,
  ZoneHomeSpec,
  ZoneSpec,
  ZoneVisibility,
} from "@dreamboard-games/api-client/types.gen";

export type DieTypeSpec = Omit<ApiDieTypeSpec, "sides"> & {
  sides?: ApiDieTypeSpec["sides"];
};

export type GameTopologyManifest = Omit<ApiGameTopologyManifest, "dieTypes"> & {
  dieTypes?: Array<DieTypeSpec>;
};

export type { CardCollection, ViewCard } from "./cards.js";
export type { ViewSlotOccupant } from "./slots.js";
export { defineTopologyManifest } from "./authoring.js";
export type { TypedTopologyManifest } from "./authoring.js";
export {
  buildTypedRecord,
  expectTypedId,
  isTypedId,
} from "./generated-helpers.js";
