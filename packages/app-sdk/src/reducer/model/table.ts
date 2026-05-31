import { z } from "zod";
import type { PerPlayer } from "../per-player";

export type RuntimeScalar = boolean | number | string | null;
export interface RuntimeRecord {
  [key: string]: RuntimePayload | undefined;
}
export type RuntimePayload = RuntimeScalar | RuntimePayload[] | RuntimeRecord;
export type RuntimeParams = RuntimeRecord;

export type SchemaLike<Output> = z.ZodType<Output>;
export type AnySchema = z.ZodTypeAny;
export type StringKeyOf<T> = Extract<keyof T, string>;
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];
export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type RuntimeHandVisibilityMode =
  | "all"
  | "ownerOnly"
  | "public"
  | "hidden";
export type RuntimeDeckMap = Record<string, string[]>;
// Per-player runtime maps now consume `PerPlayer<T>` rather than the old
// `Record<playerId, T>` shape. The prior structure implicitly encoded the
// "total roster" assumption (one entry per configured player seat) which
// didn't survive runtime reshuffles where fewer seats were present. See
// `packages/app-sdk/src/reducer/per-player.ts` for the primitive + helpers.
export type RuntimeHandMap = Record<string, PerPlayer<string[]>>;
export type RuntimeZoneMap = {
  shared: Record<string, string[]>;
  perPlayer: Record<string, PerPlayer<string[]>>;
  visibility: Record<string, RuntimeHandVisibilityMode>;
  cardSetIdsByZoneId?: Record<string, readonly string[]>;
};
export type RuntimeOwnerMap = Record<string, string | null>;
export type RuntimeResourceMap = PerPlayer<RuntimeRecord>;
export type RuntimeBoardSpaceState = {
  id: string;
  name?: string | null;
  typeId?: string | null;
  fields: RuntimeRecord;
  zoneId?: string | null;
};
export type RuntimeBoardRelationState = {
  id?: string | null;
  typeId: string;
  fromSpaceId: string;
  toSpaceId: string;
  directed: boolean;
  fields: RuntimeRecord;
};
export type RuntimeBoardContainerState = {
  id: string;
  name: string;
  host:
    | { type: "board" }
    | {
        type: "space";
        spaceId: string;
      };
  allowedCardSetIds?: readonly string[];
  zoneId: string;
  fields: RuntimeRecord;
};
export type RuntimeBoardCompatibilityState = {
  spaces: Record<string, RuntimeBoardSpaceState>;
  relations: RuntimeBoardRelationState[];
  containers: Record<string, RuntimeBoardContainerState>;
};
export type RuntimeBoardBaseState = {
  id: string;
  baseId?: string;
  layout: "generic" | "hex" | "square";
  typeId?: string | null;
  scope: "shared" | "perPlayer";
  playerId?: string | null;
  templateId?: string | null;
  fields: RuntimeRecord;
};
export type RuntimeGenericBoardState = RuntimeBoardBaseState & {
  layout: "generic";
} & RuntimeBoardCompatibilityState;
export type RuntimeHexSpaceState = RuntimeBoardSpaceState & {
  q: number;
  r: number;
};
export type RuntimeSquareSpaceState = RuntimeBoardSpaceState & {
  row: number;
  col: number;
};
export type RuntimeTiledSpaceState =
  | RuntimeHexSpaceState
  | RuntimeSquareSpaceState;
export type RuntimeTiledEdgeState = {
  id: string;
  spaceIds: readonly string[];
  typeId?: string | null;
  label?: string | null;
  ownerId?: string | null;
  fields: RuntimeRecord;
};
export type RuntimeTiledVertexState = {
  id: string;
  spaceIds: readonly string[];
  typeId?: string | null;
  label?: string | null;
  ownerId?: string | null;
  fields: RuntimeRecord;
};
export type RuntimeHexEdgeState = RuntimeTiledEdgeState;
export type RuntimeHexVertexState = RuntimeTiledVertexState;
export type RuntimeSquareEdgeState = RuntimeTiledEdgeState;
export type RuntimeSquareVertexState = RuntimeTiledVertexState;
export type RuntimeHexOrientation = "pointy-top" | "flat-top";
export type RuntimeTiledBoardBaseState = RuntimeBoardBaseState & {
  layout: "hex" | "square";
  relations: RuntimeBoardRelationState[];
  containers: Record<string, RuntimeBoardContainerState>;
  edges: RuntimeTiledEdgeState[];
  vertices: RuntimeTiledVertexState[];
};
export type RuntimeHexBoardState = RuntimeTiledBoardBaseState & {
  layout: "hex";
  spaces: Record<string, RuntimeHexSpaceState>;
  orientation: RuntimeHexOrientation;
  edges: RuntimeHexEdgeState[];
  vertices: RuntimeHexVertexState[];
};
export type RuntimeSquareBoardState = RuntimeTiledBoardBaseState & {
  layout: "square";
  spaces: Record<string, RuntimeSquareSpaceState>;
  edges: RuntimeSquareEdgeState[];
  vertices: RuntimeSquareVertexState[];
};
export type RuntimeTiledBoardState =
  | RuntimeHexBoardState
  | RuntimeSquareBoardState;
export type RuntimeBoardState =
  | RuntimeGenericBoardState
  | RuntimeTiledBoardState;
export type RuntimeBoardCollections = {
  byId: Record<string, RuntimeBoardState>;
  hex: Record<string, RuntimeHexBoardState>;
  square: Record<string, RuntimeSquareBoardState>;
  /** Structured board buckets used by manifest table schemas (empty when unused). */
  network: Record<string, RuntimeRecord>;
  track: Record<string, RuntimeRecord>;
};
export type RuntimeCardVisibility = {
  faceUp: boolean;
  visibleTo?: string[] | null;
};
export type RuntimeCardData = {
  componentType?: string;
  id: string;
  cardSetId: string;
  cardType: string;
  name?: string;
  text?: string;
  properties: RuntimeRecord;
};
export type RuntimePieceData = {
  componentType?: string;
  id: string;
  pieceTypeId: string;
  pieceName?: string | null;
  ownerId?: string | null;
  properties: RuntimeRecord;
};
export type RuntimeDieData = {
  componentType?: string;
  id: string;
  dieTypeId: string;
  dieName?: string | null;
  ownerId?: string | null;
  sides: number;
  value?: number | null;
  properties: RuntimeRecord;
};
export type RuntimeSlotHostRef =
  | {
      kind: "piece";
      id: string;
    }
  | {
      kind: "die";
      id: string;
    };
export type RuntimeComponentLocation =
  | { type: "Detached" }
  | {
      type: "InDeck";
      deckId: string;
      playedBy: string | null;
      position?: number | null;
    }
  | {
      type: "InHand";
      handId: string;
      playerId: string;
      position?: number | null;
    }
  | {
      type: "InZone";
      zoneId: string;
      playedBy?: string | null;
      position?: number | null;
    }
  | {
      type: "OnSpace";
      boardId: string;
      spaceId: string;
      position?: number | null;
    }
  | {
      type: "InContainer";
      boardId: string;
      containerId: string;
      position?: number | null;
    }
  | {
      type: "OnEdge";
      boardId: string;
      edgeId: string;
      position?: number | null;
    }
  | {
      type: "OnVertex";
      boardId: string;
      vertexId: string;
      position?: number | null;
    }
  | {
      type: "InSlot";
      host: RuntimeSlotHostRef;
      slotId: string;
      position?: number | null;
    };
export type RuntimeComponentLocationMap = Record<
  string,
  RuntimeComponentLocation
>;
export type RuntimeVisibilityMap = Record<string, RuntimeCardVisibility>;
export type RuntimeTableRecord = {
  playerOrder: string[];
  zones: RuntimeZoneMap;
  decks: RuntimeDeckMap;
  hands: RuntimeHandMap;
  handVisibility: Record<string, RuntimeHandVisibilityMode>;
  cards: Record<string, RuntimeCardData>;
  pieces: Record<string, RuntimePieceData>;
  componentLocations: RuntimeComponentLocationMap;
  ownerOfCard: RuntimeOwnerMap;
  visibility: RuntimeVisibilityMap;
  resources: RuntimeResourceMap;
  boards: RuntimeBoardCollections;
  dice: Record<string, RuntimeDieData>;
};
