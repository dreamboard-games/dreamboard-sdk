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
        | { readonly dieType: string }
        | { readonly tileType: string; readonly cell: string };
    }
);
export type ZoneDefinitions =
  import("../../shared/domain/topology-definitions.js").TopologyDefinitions & {
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
/** Authoritative board state contains no topology or definition metadata. */
export type RuntimeBoardInstance = {
  baseId: string;
  visibility: "public" | "ownerOnly" | "hidden";
  relations: {
    id: string;
    typeId: string;
    fromSpaceId: string;
    toSpaceId: string;
    directed: boolean;
    fields: RuntimeRecord;
  }[];
};
export type RuntimeBoardMap = Record<string, RuntimeBoardInstance>;
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
/** Geometry remains in public definitions; instances own only mutable state. */
export type RuntimeTileData = {
  disclosure: import("../../shared/domain/tile-disclosure.js").TileDisclosure;
  componentType: "tile";
  id: string;
  tileTypeId: string;
  ownerId: string | null;
  properties: RuntimeRecord;
};
export type RuntimeComponentLocation =
  | import("../../shared/board-topology.js").TilePlacement
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
  boards: RuntimeBoardMap;
  dice: Record<string, RuntimeDieData>;
  tiles: Record<string, RuntimeTileData>;
};

/** Read-only snapshots and mutable live tables share the query boundary. */
export type RuntimeQueryTable =
  import("../../shared/runtime-json.js").ReadonlyRuntimeData<RuntimeTableRecord>;
