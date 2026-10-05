import type { ReadonlyTopology } from "../../shared/board-topology-schema.js";
import type { TileSpaceId } from "../../shared/domain/tile-space.js";
import type { BoardSpaceHostId } from "../../shared/domain/board-space-host.js";
import type {
  PerPlayerInstanceId,
  PerPlayerInstanceFamily,
} from "../../shared/domain/per-player-instance.js";
import type {
  BoardEdgeId,
  BoardVertexId,
} from "../../shared/domain/board-identities.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";
import type { FieldsOutput, FieldSchema, CardSchema } from "./field-schemas.js";
import type { z } from "zod";
import type {
  ManifestIdSchema,
  ReducerManifestContract,
  RuntimeTableRecord,
  RuntimeCardData,
  RuntimePieceData,
  RuntimeDieData,
  RuntimeTileData,
  RuntimeComponentLocation,
  RuntimeBoardInstance,
  ZoneDefinition,
  ZoneHostMap,
} from "../model";
import type { PlayerId } from "../per-player";
import type { RuntimeIdsFromCount } from "./identity-types.js";

export type SchemaAuthoring<T> = T extends readonly (infer V)[]
  ? readonly SchemaAuthoring<V>[]
  : T extends object
    ? {
        readonly [K in keyof T]: K extends "cardSchema"
          ? CardSchema
          : K extends
                | "propertiesSchema"
                | "cellFieldsSchema"
                | "fieldsSchema"
                | "boardFieldsSchema"
                | "spaceFieldsSchema"
                | "relationFieldsSchema"
                | "edgeFieldsSchema"
                | "vertexFieldsSchema"
            ? FieldSchema
            : SchemaAuthoring<T[K]>;
      }
    : T;
declare const validatedManifest: unique symbol;
export type SchemaJson<T> = T extends z.ZodType
  ? import("../../shared/domain/contracts.js").FieldSchemaJson
  : T extends readonly (infer V)[]
    ? readonly SchemaJson<V>[]
    : T extends object
      ? { readonly [K in keyof T]: SchemaJson<T[K]> }
      : T;
export type ValidatedManifest<M = AuthoredManifest> = SchemaJson<M> & {
  readonly [validatedManifest]: M;
};
export type AuthoredOf<M> = M extends { readonly [validatedManifest]: infer A }
  ? A
  : M;
declare const compiledManifest: unique symbol;
export type AuthoredManifest = SchemaAuthoring<GameTopologyManifest>;
type Entry<T> = T extends readonly (infer V)[] ? V : never;
type Get<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never;
type Entries<M, K extends PropertyKey> = Entry<Get<M, K>>;
type Id<T> = T extends { id: infer I extends string } ? I : never;
type ScopedId<
  S,
  Family extends PerPlayerInstanceFamily,
  Base extends string,
> = S extends { scope: "perPlayer" } ? PerPlayerInstanceId<Family, Base> : Base;
type SeedIds<S, Family extends "piece" | "die" | "tile" = "piece"> = S extends {
  typeId: infer T extends string;
}
  ? ScopedId<
      S,
      Family,
      RuntimeIdsFromCount<
        S extends { id: infer I extends string } ? I : T,
        Get<S, "count">
      >
    >
  : never;
type CardIds<C> = C extends { id: infer I extends string }
  ? ScopedId<C, "card", RuntimeIdsFromCount<I, Get<C, "count">>>
  : never;
type CardSets<M> = Entries<M, "cardSets">;
type Cards<M> =
  CardSets<M> extends infer S
    ? S extends { cards: infer C }
      ? Entry<C>
      : never
    : never;
export type Zone<M, Scope> = Id<Extract<Entries<M, "zones">, { scope: Scope }>>;
type Boards<M> = Entries<M, "boards">;
type RuntimeBoardId<B> = B extends { id: infer I extends string }
  ? B extends { scope: "perPlayer" }
    ? PerPlayerInstanceId<"board", I>
    : I
  : never;
type CardTypeOf<C> = C extends { cardType: infer T extends string } ? T : never;
export type TileSpaceIds<M, Layout = "hex" | "square"> =
  Entries<M, "tileSeeds"> extends infer S
    ? S extends { typeId: infer T }
      ? Extract<Entries<M, "tileTypes">, { id: T }> extends infer D
        ? D extends { layout: Layout; cells: infer C }
          ? TileSpaceId<SeedIds<S, "tile">, Id<Entry<C>>>
          : never
        : never
      : never
    : never;
export type ManifestIdsOf<M> = {
  playerId: PlayerId;
  phaseName: string;
  boardLayout: "generic" | "hex" | "square";
  cardSetId: Id<Entries<M, "cardSets">>;
  cardType: CardTypeOf<Cards<M>>;
  cardId: CardIds<Cards<M>>;
  zoneId: Id<Entries<M, "zones">>;
  resourceId: Id<Entries<M, "resources">>;
  pieceTypeId: Id<Entries<M, "pieceTypes">>;
  pieceId: SeedIds<Entries<M, "pieceSeeds">>;
  dieTypeId: Id<Entries<M, "dieTypes">>;
  dieId: SeedIds<Entries<M, "dieSeeds">, "die">;
  tileTypeId: Id<Entries<M, "tileTypes">>;
  tileId: SeedIds<Entries<M, "tileSeeds">, "tile">;
  boardTypeId: Extract<Get<Boards<M>, "typeId">, string>;
  boardBaseId: Id<Boards<M>>;
  boardId: RuntimeBoardId<Boards<M>>;
  relationTypeId: string;
  edgeId: BoardEdgeId<
    RuntimeBoardId<Extract<Boards<M>, { layout: "hex" | "square" }>>
  >;
  edgeTypeId: Extract<
    Get<Entry<Get<Entries<M, "tileTypes">, "edges">>, "typeId">,
    string
  >;
  vertexId: BoardVertexId<
    RuntimeBoardId<Extract<Boards<M>, { layout: "hex" | "square" }>>
  >;
  vertexTypeId: Extract<
    Get<Entry<Get<Entries<M, "tileTypes">, "vertices">>, "typeId">,
    string
  >;
  spaceId: BoardSpaceId<Boards<M>> | TileSpaceIds<M>;
  spaceTypeId: Extract<
    | Get<BoardSpaceEntry<Boards<M>>, "typeId">
    | Get<Entry<Get<Entries<M, "tileTypes">, "cells">>, "typeId">,
    string
  >;
};
type ObjectFields<S, M, B = never> = FieldsOutput<S, M, B>;
type CardFields<S, Category extends string, M> = S extends {
  byCardType: infer Variants;
}
  ? Category extends keyof Variants
    ? FieldsOutput<Variants[Category], M>
    : never
  : FieldsOutput<S, M>;
type CardStateFor<M, Set, Card> = Card extends {
  id: infer BaseId extends string;
  cardType: infer Category extends string;
  count: infer Count extends number;
}
  ? ScopedId<
      Card,
      "card",
      RuntimeIdsFromCount<BaseId, Count>
    > extends infer RuntimeId
    ? RuntimeId extends string
      ? Omit<
          RuntimeCardData,
          "id" | "cardSetId" | "cardType" | "properties"
        > & {
          id: RuntimeId;
          cardSetId: Id<Set>;
          cardType: Category;
          properties: CardFields<Get<Set, "cardSchema">, Category, M>;
        }
      : never
    : never
  : never;
type CardState<M> =
  CardSets<M> extends infer Set
    ? Set extends { cards: infer Cards }
      ? Entry<Cards> extends infer Card
        ? Card extends unknown
          ? CardStateFor<M, Set, Card>
          : never
        : never
      : never
    : never;
type InferredCards<M> = {
  [Card in CardState<M> as Card["id"]]: Card;
};
type SeedState<
  M,
  Seed,
  Definition,
  Data,
  TypeKey extends string,
> = Seed extends { typeId: infer TypeId extends string }
  ? SeedIds<
      Seed,
      TypeKey extends "tileTypeId"
        ? "tile"
        : TypeKey extends "dieTypeId"
          ? "die"
          : "piece"
    > extends infer RuntimeId
    ? RuntimeId extends string
      ? Omit<Data, "id" | TypeKey | "properties"> & {
          id: RuntimeId;
          properties: ObjectFields<
            Get<
              Extract<Definition, { id: TypeId }>,
              TypeKey extends "tileTypeId" ? "propertiesSchema" : "fieldsSchema"
            >,
            M
          >;
        } & Record<TypeKey, TypeId>
      : never
    : never
  : never;
type PieceState<M> = SeedState<
  M,
  Entries<M, "pieceSeeds">,
  Entries<M, "pieceTypes">,
  RuntimePieceData,
  "pieceTypeId"
>;
type DieState<M> = SeedState<
  M,
  Entries<M, "dieSeeds">,
  Entries<M, "dieTypes">,
  RuntimeDieData,
  "dieTypeId"
>;
type TileState<M> = SeedState<
  M,
  Entries<M, "tileSeeds">,
  Entries<M, "tileTypes">,
  RuntimeTileData,
  "tileTypeId"
>;
type EntityAtId<Entity, Id extends string> = Entity extends { id: infer Key }
  ? Id extends Key
    ? Entity & { id: Id }
    : Key extends Id
      ? Entity
      : never
  : never;
type InferredPieces<M> = {
  [Id in SeedIds<Entries<M, "pieceSeeds">>]: EntityAtId<PieceState<M>, Id>;
};
type InferredDice<M> = {
  [Id in SeedIds<Entries<M, "dieSeeds">, "die">]: EntityAtId<DieState<M>, Id>;
};
type InferredTiles<M> = {
  [I in SeedIds<Entries<M, "tileSeeds">, "tile">]: EntityAtId<TileState<M>, I>;
};
type BoardField<B, K extends PropertyKey, M> = ObjectFields<Get<B, K>, M, B>;
type DefinitionFields<S, M, B = never> = {
  readonly [K in keyof ObjectFields<S, M, B>]: ReadonlyTopology<
    ObjectFields<S, M, B>[K]
  >;
};
type BoardSpaceEntry<B> = Entry<Get<B, "spaces">>;
type BoardSpaceId<B> = Id<BoardSpaceEntry<B>>;
type BoardDefinitionMetadata<M, B> = Readonly<Pick<B, "typeId" & keyof B>> & {
  readonly id: Id<B>;
  readonly name: B extends { name: infer Name extends string } ? Name : never;
  readonly scope: B extends {
    scope: infer Scope extends "shared" | "perPlayer";
  }
    ? Scope
    : never;
  readonly fields: DefinitionFields<Get<B, "boardFieldsSchema">, M, B>;
};
type InferredBoardDefinition<M, B> = B extends { layout: "generic" }
  ? BoardDefinitionMetadata<M, B> & {
      readonly layout: "generic";
      readonly spaces: {
        readonly [S in BoardSpaceEntry<B> as Id<S>]: Omit<S, "fields"> & {
          readonly fields: DefinitionFields<Get<B, "spaceFieldsSchema">, M, B>;
        };
      };
    }
  : B extends { layout: "hex" }
    ? BoardDefinitionMetadata<M, B> & {
        readonly layout: "hex";
        readonly orientation: B extends { orientation: infer O } ? O : "pointy";
      }
    : B extends { layout: "square" }
      ? BoardDefinitionMetadata<M, B> & { readonly layout: "square" }
      : never;
export type InferredBoardDefinitions<M> = AuthoredManifest extends M
  ? import("../../shared/domain/topology-definitions.js").TopologyDefinitions["boardDefinitions"]
  : {
      readonly [B in Boards<M> as Id<B>]: InferredBoardDefinition<M, B>;
    };
type TileDefinitionFields<M, T, K extends string, V> = V extends unknown
  ? Readonly<Omit<V, "fields" | "at">> & {
      readonly fields: ReadonlyTopology<ObjectFields<Get<T, K>, M>>;
    } & (V extends { at: infer A } ? { readonly at: Readonly<A> } : unknown)
  : never;
type TileDefinitionMetadata<M, T> = Readonly<
  Pick<T, "frontImage" & keyof T>
> & {
  readonly id: Id<T>;
  readonly name: T extends { name: infer Name extends string } ? Name : never;
  readonly fields: DefinitionFields<Get<T, "fieldsSchema">, M>;
  readonly cells: readonly TileDefinitionFields<
    M,
    T,
    "cellFieldsSchema",
    Entry<Get<T, "cells">>
  >[];
  readonly edges: readonly TileDefinitionFields<
    M,
    T,
    "edgeFieldsSchema",
    Entry<Get<T, "edges">>
  >[];
  readonly vertices: readonly TileDefinitionFields<
    M,
    T,
    "vertexFieldsSchema",
    Entry<Get<T, "vertices">>
  >[];
};
type InferredTileDefinition<M, T> = T extends { layout: "hex" }
  ? TileDefinitionMetadata<M, T> & { readonly layout: "hex" }
  : T extends { layout: "square" }
    ? TileDefinitionMetadata<M, T> & { readonly layout: "square" }
    : never;
export type InferredTileDefinitions<M> = AuthoredManifest extends M
  ? import("../../shared/domain/topology-definitions.js").TopologyDefinitions["tileDefinitions"]
  : {
      readonly [T in Entries<M, "tileTypes"> as Id<T>]: InferredTileDefinition<
        M,
        T
      >;
    };
type InferredBoards<M> = {
  [B in Boards<M> as RuntimeBoardId<B>]: {
    baseId: Id<B>;
    relations: (Omit<
      RuntimeBoardInstance["relations"][number],
      "typeId" | "fields"
    > & {
      typeId: string;
      fields: BoardField<B, "relationFieldsSchema", M>;
    })[];
  };
};
type AllowedCardSets<M, Z> = Z extends {
  allowedCardSetIds: readonly (infer S)[];
}
  ? [S] extends [never]
    ? Id<CardSets<M>>
    : S
  : Id<CardSets<M>>;
type ZoneCardIds<M, Z> =
  CardSets<M> extends infer Set
    ? Set extends { id: infer SetId; cards: infer Cards }
      ? SetId extends AllowedCardSets<M, Z>
        ? CardIds<Entry<Cards>>
        : never
      : never
    : never;
export type HostIdOfZone<M, Z> = Z extends { scope: "shared" }
  ? "table"
  : Z extends { scope: "perPlayer" }
    ? PlayerId
    : Z extends {
          attachedTo: { board: infer B; space: infer S extends string };
        }
      ? BoardSpaceHostId<RuntimeBoardId<Extract<Boards<M>, { id: B }>>, S>
      : Z extends { attachedTo: { board: infer B } }
        ? RuntimeBoardId<Extract<Boards<M>, { id: B }>>
        : Z extends { attachedTo: { pieceType: infer T } }
          ? SeedIds<Extract<Entries<M, "pieceSeeds">, { typeId: T }>, "piece">
          : Z extends { attachedTo: { dieType: infer T } }
            ? SeedIds<Extract<Entries<M, "dieSeeds">, { typeId: T }>, "die">
            : Z extends {
                  attachedTo: {
                    tileType: infer T;
                    cell: infer C extends string;
                  };
                }
              ? TileSpaceId<
                  SeedIds<
                    Extract<Entries<M, "tileSeeds">, { typeId: T }>,
                    "tile"
                  >,
                  C
                >
              : never;
type ZoneTileIds<M, Z> = Z extends { visibility: "hidden" | "ownerOnly" }
  ? never
  : ManifestIdsOf<M>["tileId"];
type InferredZones<M> = {
  [Z in Entries<M, "zones"> as Id<Z>]: ZoneHostMap<
    HostIdOfZone<M, Z>,
    | ZoneCardIds<M, Z>
    | ManifestIdsOf<M>["pieceId" | "dieId"]
    | ZoneTileIds<M, Z>,
    Z extends { scope: infer S extends "shared" | "perPlayer" } ? S : "attached"
  >;
};

export type ManifestTable<M> = AuthoredManifest extends M
  ? RuntimeTableRecord
  : Omit<
      RuntimeTableRecord,
      | "playerOrder"
      | "zones"
      | "cards"
      | "pieces"
      | "tiles"
      | "dice"
      | "boards"
      | "resources"
      | "componentLocations"
    > & {
      boards: InferredBoards<M>;
      playerOrder: PlayerId[];
      zones: InferredZones<M>;
      cards: InferredCards<M>;
      pieces: InferredPieces<M>;
      dice: InferredDice<M>;
      tiles: InferredTiles<M>;
      componentLocations: Record<
        ManifestIdsOf<M>["cardId" | "pieceId" | "dieId"],
        RuntimeComponentLocation
      > &
        Record<
          ManifestIdsOf<M>["tileId"],
          Extract<
            RuntimeComponentLocation,
            { type: "Detached" | "InZone" | "OnBoard" }
          >
        >;
      resources: Record<
        PlayerId,
        Record<ManifestIdsOf<M>["resourceId"], number>
      >;
    };
type SharedCardMetadata<M, Key extends "cardSetId" | "cardType"> = {
  [
    Card in Exclude<CardState<M>, { id: PerPlayerInstanceId }> as Card["id"]
  ]: Card[Key];
};
type InstanceFamily = "cardId" | "pieceId" | "dieId" | "tileId" | "boardId";
export type CompiledManifest<M> = Omit<
  ReducerManifestContract<
    ManifestTable<M>,
    string,
    PlayerId,
    ManifestIdsOf<M>["zoneId"],
    ManifestIdsOf<M>["cardId"]
  >,
  | "ids"
  | "literals"
  | "records"
  | "zoneDefinitions"
  | "boardDefinitions"
  | "tileDefinitions"
> & {
  readonly [compiledManifest]: true;
  readonly zoneDefinitions: {
    readonly [Z in Entries<M, "zones"> as Id<Z>]: ZoneDefinition &
      (Z extends { scope: infer S extends "shared" | "perPlayer" }
        ? { readonly scope: S }
        : Z extends {
              attachedTo: infer A extends Extract<
                ZoneDefinition,
                { attachedTo: unknown }
              >["attachedTo"];
            }
          ? { readonly attachedTo: A }
          : never);
  };
  readonly boardDefinitions: InferredBoardDefinitions<M>;
  readonly tileDefinitions: InferredTileDefinitions<M>;
  literals: Omit<
    ReducerManifestContract<
      RuntimeTableRecord,
      string,
      string,
      string,
      string
    >["literals"],
    `${keyof ManifestIdsOf<M>}s` | "cardSetIdByCardId" | "cardTypeByCardId"
  > & {
    [K in keyof ManifestIdsOf<M> as `${K}s`]: readonly Exclude<
      ManifestIdsOf<M>[K],
      PerPlayerInstanceId
    >[];
  } & {
    cardSetIdByCardId: SharedCardMetadata<M, "cardSetId">;
    cardTypeByCardId: SharedCardMetadata<M, "cardType">;
  };
  records: {
    [K in Exclude<keyof ManifestIdsOf<M>, "playerId"> as `${K}s`]: <V>(
      initial: V | ((id: ManifestIdsOf<M>[K]) => V),
      ...roster: K extends InstanceFamily
        ? [options: { playerIds: readonly string[] }]
        : []
    ) => Record<ManifestIdsOf<M>[K], V>;
  };
  ids: {
    [K in keyof ManifestIdsOf<M>]: ManifestIdSchema<ManifestIdsOf<M>[K], K>;
  };
  schemas: { table: z.ZodType<ManifestTable<M>>; runtime: z.ZodTypeAny };
  createInitialTable(options: {
    playerIds: readonly string[];
    shuffleItems?: <V>(values: readonly V[]) => V[];
  }): ManifestTable<M>;
};
