import type { BoardSpaceHostId } from "../../shared/domain/board-space-host.js";
import type {
  PerPlayerInstanceId,
  PerPlayerInstanceFamily,
} from "../../shared/domain/per-player-instance.js";
import type {
  HexSpaceId,
  HexEdgeId,
  HexVertexId,
} from "../../shared/domain/board-identities.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";
import type { FieldsOutput, FieldSchema, CardSchema } from "./field-schemas.js";
import type { z } from "zod";
import type {
  ManifestIdSchema,
  ReducerManifestContract,
  RuntimeTableRecord,
  RuntimeRecord,
  RuntimeCardData,
  RuntimePieceData,
  RuntimeDieData,
  RuntimeComponentLocation,
  RuntimeBoardState,
  RuntimeGenericBoardState,
  RuntimeHexBoardState,
  RuntimeSquareBoardState,
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
type SeedIds<S, Family extends "piece" | "die" = "piece"> = S extends {
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
  boardTypeId: Extract<Get<Boards<M>, "typeId">, string>;
  boardBaseId: Id<Boards<M>>;
  boardId: RuntimeBoardId<Boards<M>>;
  relationTypeId: Extract<
    Get<Entry<Get<Boards<M>, "relations">>, "typeId">,
    string
  >;
  edgeId:
    | HexEdgeId<Extract<Id<Extract<Boards<M>, { layout: "hex" }>>, string>>
    | (Extract<Boards<M>, { layout: "square" }> extends never
        ? never
        : `square-edge:${string}`);
  edgeTypeId: Extract<Get<Entry<Get<Boards<M>, "edges">>, "typeId">, string>;
  vertexId:
    | HexVertexId<Extract<Id<Extract<Boards<M>, { layout: "hex" }>>, string>>
    | (Extract<Boards<M>, { layout: "square" }> extends never
        ? never
        : `square-vertex:${string}`);
  vertexTypeId: Extract<
    Get<Entry<Get<Boards<M>, "vertices">>, "typeId">,
    string
  >;
  spaceId: BoardSpaceId<Boards<M>>;
  spaceTypeId: Extract<Get<BoardSpaceEntry<Boards<M>>, "typeId">, string>;
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
      TypeKey extends "dieTypeId" ? "die" : "piece"
    > extends infer RuntimeId
    ? RuntimeId extends string
      ? Omit<Data, "id" | TypeKey | "properties"> & {
          id: RuntimeId;
          properties: ObjectFields<
            Get<Extract<Definition, { id: TypeId }>, "fieldsSchema">,
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
type BoardField<B, K extends PropertyKey, M> = ObjectFields<Get<B, K>, M, B>;
type BoardSpaceEntry<B> = B extends { layout: "hex"; spaces: infer Spaces }
  ? Spaces[keyof Spaces]
  : Entry<Get<B, "spaces">>;
type BoardSpaceId<B> = B extends { layout: "hex" }
  ? HexSpaceId<B>
  : Id<Entry<Get<B, "spaces">>>;
type BoardParts<M, B> = {
  id: RuntimeBoardId<B>;
  baseId: Id<B>;
  scope: B extends { scope: infer Scope } ? Scope : never;
  fields: BoardField<B, "boardFieldsSchema", M>;
  relations: (Omit<RuntimeHexBoardState["relations"][number], "typeId"> & {
    typeId:
      | Extract<Get<Entry<Get<B, "relations">>, "typeId">, string>
      | (B extends { layout: "hex" | "square" } ? "adjacent" : never);
  })[];
  spaces: {
    [SpaceId in BoardSpaceId<B>]: (B extends { layout: "hex" }
      ? { q: number; r: number }
      : B extends { layout: "square" }
        ? { row: number; col: number }
        : unknown) & {
      id: SpaceId;
      name?: string | null;
      typeId?: Extract<Get<BoardSpaceEntry<B>, "typeId">, string> | null;
      fields: BoardField<B, "spaceFieldsSchema", M>;
    };
  };
};
type BoardState<M, B> = B extends { layout: "hex" }
  ? Omit<
      RuntimeHexBoardState,
      "id" | "baseId" | "fields" | "spaces" | "edges" | "vertices" | "relations"
    > &
      BoardParts<M, B> & {
        edges: (Omit<
          RuntimeHexBoardState["edges"][number],
          "id" | "spaceIds"
        > & {
          id: HexEdgeId<Extract<Id<B>, string>>;
          spaceIds: BoardSpaceId<B>[];
        })[];
        vertices: (Omit<
          RuntimeHexBoardState["vertices"][number],
          "id" | "spaceIds"
        > & {
          id: HexVertexId<Extract<Id<B>, string>>;
          spaceIds: BoardSpaceId<B>[];
        })[];
      }
  : B extends { layout: "square" }
    ? Omit<
        RuntimeSquareBoardState,
        "id" | "baseId" | "fields" | "spaces" | "relations"
      > &
        BoardParts<M, B>
    : Omit<
        RuntimeGenericBoardState,
        "id" | "baseId" | "fields" | "spaces" | "relations"
      > &
        BoardParts<M, B>;
type BoardMap<M> = {
  [B in Boards<M> as RuntimeBoardId<B>]: Extract<
    BoardState<M, B>,
    RuntimeBoardState
  >;
};
type InferredBoards<M> = {
  byId: BoardMap<M>;
  hex: {
    [B in Extract<Boards<M>, { layout: "hex" }> as RuntimeBoardId<B>]: Extract<
      BoardState<M, B>,
      RuntimeHexBoardState
    >;
  };
  square: {
    [
      B in Extract<Boards<M>, { layout: "square" }> as RuntimeBoardId<B>
    ]: Extract<BoardState<M, B>, RuntimeSquareBoardState>;
  };
  network: Record<string, RuntimeRecord>;
  track: Record<string, RuntimeRecord>;
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
            : never;
type InferredZones<M> = {
  [Z in Entries<M, "zones"> as Id<Z>]: ZoneHostMap<
    HostIdOfZone<M, Z>,
    ZoneCardIds<M, Z> | ManifestIdsOf<M>["pieceId" | "dieId"],
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
      componentLocations: Record<
        ManifestIdsOf<M>["cardId" | "pieceId" | "dieId"],
        RuntimeComponentLocation
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
type InstanceFamily = "cardId" | "pieceId" | "dieId" | "boardId";
type SharedBoardManifest<M> = Omit<M, "boards"> & {
  boards: readonly Exclude<Boards<M>, { scope: "perPlayer" }>[];
};
export type CompiledManifest<M> = Omit<
  ReducerManifestContract<
    ManifestTable<M>,
    string,
    PlayerId,
    ManifestIdsOf<M>["zoneId"],
    ManifestIdsOf<M>["cardId"]
  >,
  "ids" | "literals" | "records" | "staticBoards" | "zoneDefinitions"
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
  staticBoards: Pick<
    InferredBoards<SharedBoardManifest<M>>,
    "byId" | "hex" | "square"
  >;
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
