import * as z from "zod";

import type { RuntimeJson } from "../../shared/runtime-json";

export type RuntimeScalar = Extract<
  RuntimeJson,
  boolean | number | string | null
>;
export type RuntimeRecord = Record<string, RuntimeJson>;
export type RuntimePayload = RuntimeJson;
export type RuntimeParams = RuntimeRecord;

export type SchemaLike<Output> = z.ZodType<Output>;
export type AnySchema = z.ZodTypeAny;
export type StringKeyOf<T> = Extract<keyof T, string>;
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];
export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

/** Static definitions belong to the compiled manifest, never a session checkpoint. */
export type ZoneDefinition = {
  readonly visibility: "public" | "ownerOnly" | "hidden";
  readonly allowedCardSetIds: readonly string[];
} & (
  | { readonly scope: "shared" | "perPlayer" }
  | {
      readonly attachedTo:
        | { readonly board: string; readonly space?: string }
        | { readonly pieceType: string }
        | { readonly dieType: string };
    }
);
export type ZoneDefinitions = {
  readonly zoneDefinitions: Readonly<Record<string, ZoneDefinition>>;
};
export type ZoneRef<
  ZoneId extends string = string,
  HostId extends string = string,
> = {
  readonly zoneId: ZoneId;
  readonly hostId: HostId;
};
declare const zoneScopeWitness: unique symbol;
/** Declaration-only scope evidence; no corresponding runtime or checkpoint field. */
export type ZoneHostMap<
  Host extends string,
  Component extends string,
  Scope extends "shared" | "perPlayer" | "attached",
> = Record<Host, Component[]> & { readonly [zoneScopeWitness]?: Scope };
export type DeclaredZoneScopeOfHosts<Hosts> =
  typeof zoneScopeWitness extends keyof Hosts
    ? NonNullable<Hosts[typeof zoneScopeWitness]>
    : never;

/** Membership arrays are the sole owner of zone order. */
export type RuntimeZoneMap = Record<string, Record<string, string[]>>;
export type RuntimeOwnerMap = Record<string, string | null>;
export type RuntimeResourceMap = Record<string, RuntimeRecord>;
export type RuntimeBoardSpaceState = {
  id: string;
  name?: string | null;
  typeId?: string | null;
  fields: RuntimeRecord;
};
export type RuntimeBoardRelationState = {
  id?: string | null;
  typeId: string;
  fromSpaceId: string;
  toSpaceId: string;
  directed: boolean;
  fields: RuntimeRecord;
};
export type RuntimeBoardCompatibilityState = {
  spaces: Record<string, RuntimeBoardSpaceState>;
  relations: RuntimeBoardRelationState[];
};
export type RuntimeBoardBaseState = {
  id: string;
  baseId?: string;
  layout: "generic" | "hex" | "square";
  typeId?: string | null;
  scope: "shared" | "perPlayer";
  playerId?: string | null;
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
  RuntimeHexSpaceState | RuntimeSquareSpaceState;
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
export type RuntimeHexOrientation = "pointy" | "flat";
export type RuntimeTiledBoardBaseState = RuntimeBoardBaseState & {
  layout: "hex" | "square";
  relations: RuntimeBoardRelationState[];
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
  RuntimeHexBoardState | RuntimeSquareBoardState;
export type RuntimeBoardState =
  RuntimeGenericBoardState | RuntimeTiledBoardState;
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
  frontImage?: string;
  backImage?: string;
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
export type RuntimeComponentLocation =
  | { type: "Detached" }
  | {
      type: "InZone";
      zoneId: string;
      hostId: string;
      playedBy: string | null;
    }
  | {
      type: "OnSpace";
      boardId: string;
      spaceId: string;
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
    };
export type RuntimeComponentLocationMap = Record<
  string,
  RuntimeComponentLocation
>;
export type RuntimeVisibilityMap = Record<string, RuntimeCardVisibility>;
export type RuntimeTableRecord = {
  playerOrder: string[];
  zones: RuntimeZoneMap;
  cards: Record<string, RuntimeCardData>;
  pieces: Record<string, RuntimePieceData>;
  componentLocations: RuntimeComponentLocationMap;
  ownerOfCard: RuntimeOwnerMap;
  visibility: RuntimeVisibilityMap;
  resources: RuntimeResourceMap;
  boards: RuntimeBoardCollections;
  dice: Record<string, RuntimeDieData>;
};
