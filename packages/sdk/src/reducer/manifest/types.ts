import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";
import type { z } from "zod";
import type {
  ManifestIdSchema,
  ReducerManifestContract,
  RuntimeTableRecord,
  RuntimeRecord,
  RuntimeCardData,
  RuntimePieceData,
  RuntimeDieData,
  StaticBoards,
  RuntimeGenericBoardState,
  RuntimeHexBoardState,
  RuntimeSquareBoardState,
} from "../model";
import type { PlayerId, PerPlayer } from "../per-player";

type ReadonlyValue<T> = T extends readonly (infer V)[]
  ? readonly ReadonlyValue<V>[]
  : T extends object
    ? { readonly [K in keyof T]: ReadonlyValue<T[K]> }
    : T;
export type AuthoredManifest = ReadonlyValue<GameTopologyManifest>;
type Entry<T> = T extends readonly (infer V)[] ? V : never;
type Get<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never;
type Entries<M, K extends PropertyKey> = Entry<Get<M, K>>;
type Id<T> = T extends { id: infer I extends string } ? I : never;
type NumberRange<N extends number, A extends number[] = []> = number extends N
  ? number
  : A["length"] extends N
    ? A[number] | N
    : NumberRange<N, [...A, A["length"]]>;
type InstanceIds<Base extends string, Count> = Count extends number
  ? number extends Count
    ? Base | `${Base}-${number}`
    : Count extends 0 | 1
      ? Base
      : `${Base}-${Exclude<NumberRange<Count>, 0>}`
  : Base;
type SeedIds<S> = S extends { typeId: infer T extends string }
  ? InstanceIds<
      S extends { id: infer I extends string } ? I : T,
      Get<S, "count">
    >
  : never;
type CardIds<C> = C extends { type: infer T extends string }
  ? InstanceIds<T, Get<C, "count">>
  : never;
type Cards<M> =
  Entries<M, "cardSets"> extends infer S
    ? S extends { cards: infer C }
      ? Entry<C>
      : never
    : never;
type Zone<M, Scope> = Id<Extract<Entries<M, "zones">, { scope: Scope }>>;
type BoardLike<M> = Entries<M, "boards"> | Entries<M, "boardTemplates">;
type Boards<M> = Entries<M, "boards">;
type RuntimeBoardId<B> = B extends { id: infer I extends string }
  ? B extends { scope: "perPlayer" }
    ? `${I}:${string}`
    : I
  : never;
export type ManifestIdsOf<M> = {
  playerId: PlayerId;
  phaseName: string;
  boardLayout: "generic" | "hex" | "square";
  setupOptionId: Id<Entries<M, "setupOptions">>;
  setupProfileId: Id<Entries<M, "setupProfiles">>;
  cardSetId: Id<Entries<M, "cardSets">>;
  cardType: Extract<Get<Cards<M>, "cardType"> | Get<Cards<M>, "type">, string>;
  cardId: CardIds<Cards<M>>;
  deckId: Zone<M, "shared">;
  handId: Zone<M, "perPlayer">;
  sharedZoneId: Zone<M, "shared">;
  playerZoneId: Zone<M, "perPlayer">;
  zoneId: Id<Entries<M, "zones">>;
  resourceId: Id<Entries<M, "resources">>;
  pieceTypeId: Id<Entries<M, "pieceTypes">>;
  pieceId: SeedIds<Entries<M, "pieceSeeds">>;
  dieTypeId: Id<Entries<M, "dieTypes">>;
  dieId: SeedIds<Entries<M, "dieSeeds">>;
  boardTypeId: Extract<Get<Boards<M>, "boardTypeId">, string>;
  boardBaseId: Id<Boards<M>>;
  boardId: RuntimeBoardId<Boards<M>>;
  boardContainerId: Id<Entry<Get<BoardLike<M>, "containers">>>;
  relationTypeId: Extract<
    Get<Entry<Get<BoardLike<M>, "relations">>, "typeId">,
    string
  >;
  edgeId: string;
  edgeTypeId: Extract<Get<Entry<Get<BoardLike<M>, "edges">>, "typeId">, string>;
  vertexId: string;
  vertexTypeId: Extract<
    Get<Entry<Get<BoardLike<M>, "vertices">>, "typeId">,
    string
  >;
  spaceId: Id<Entry<Get<BoardLike<M>, "spaces">>>;
  spaceTypeId: Extract<
    Get<Entry<Get<BoardLike<M>, "spaces">>, "typeId">,
    string
  >;
};
type PropertyValue<P, M> = P extends { type: infer T }
  ? T extends keyof ManifestIdsOf<M>
    ? ManifestIdsOf<M>[T]
    : T extends "string"
      ? string
      : T extends "number" | "integer"
        ? number
        : T extends "boolean"
          ? boolean
          : T extends "enum"
            ? Entry<Get<P, "enums">>
            : T extends "array"
              ? PropertyOutput<Get<P, "items">, M>[]
              : T extends "record"
                ? Record<string, PropertyOutput<Get<P, "values">, M>>
                : T extends "object"
                  ? ObjectProperties<Get<P, "properties">, M>
                  : never
  : never;
type PropertyOutput<P, M> =
  | PropertyValue<P, M>
  | (P extends { nullable: true } ? null : never);
type OptionalKeys<P> = {
  [K in keyof P]: P[K] extends { optional: true }
    ? P[K] extends { default: unknown }
      ? never
      : K
    : never;
}[keyof P];
type ObjectProperties<P, M> = {
  [K in Exclude<keyof P, OptionalKeys<P>>]: PropertyOutput<P[K], M>;
} & { [K in OptionalKeys<P>]?: PropertyOutput<P[K], M> };
type ObjectFields<S, M> = S extends { properties: infer P }
  ? ObjectProperties<P, M>
  : RuntimeRecord;
type CardFields<S, M> = S extends { variants: infer V }
  ? ObjectProperties<Get<S, "shared">, M> & ObjectFields<V[keyof V], M>
  : ObjectFields<S, M>;
type CardState<M> =
  Entries<M, "cardSets"> extends infer S
    ? S extends { id: infer I; cards: unknown }
      ? Omit<
          RuntimeCardData,
          "id" | "cardSetId" | "cardType" | "properties"
        > & {
          id: ManifestIdsOf<M>["cardId"];
          cardSetId: I;
          cardType: ManifestIdsOf<M>["cardType"];
          properties: CardFields<Get<S, "cardSchema">, M>;
        }
      : never
    : never;
type ResolveBoard<M, B> = B &
  (B extends { templateId: infer I }
    ? Extract<Entries<M, "boardTemplates">, { id: I }>
    : unknown);
type BoardField<B, K extends PropertyKey, M> = ObjectFields<Get<B, K>, M>;
type BoardParts<M, B> = {
  id: RuntimeBoardId<B>;
  baseId: Id<B>;
  fields: BoardField<ResolveBoard<M, B>, "boardFieldsSchema", M>;
  spaces: Record<
    Id<Entry<Get<ResolveBoard<M, B>, "spaces">>>,
    {
      id: Id<Entry<Get<ResolveBoard<M, B>, "spaces">>>;
      name?: string | null;
      typeId?: string | null;
      fields: BoardField<ResolveBoard<M, B>, "spaceFieldsSchema", M>;
      zoneId?: string | null;
    }
  >;
};
type BoardState<M, B> = B extends { layout: "hex" }
  ? Omit<RuntimeHexBoardState, "id" | "baseId" | "fields"> & BoardParts<M, B>
  : B extends { layout: "square" }
    ? Omit<RuntimeSquareBoardState, "id" | "baseId" | "fields"> &
        BoardParts<M, B>
    : Omit<RuntimeGenericBoardState, "id" | "baseId" | "fields"> &
        BoardParts<M, B>;
type BoardMap<M> = { [B in Boards<M> as RuntimeBoardId<B>]: BoardState<M, B> };
export type ManifestTable<M> = AuthoredManifest extends M
  ? RuntimeTableRecord
  : Omit<
      RuntimeTableRecord,
      | "playerOrder"
      | "decks"
      | "hands"
      | "cards"
      | "pieces"
      | "dice"
      | "resources"
    > & {
      playerOrder: PlayerId[];
      decks: Record<ManifestIdsOf<M>["deckId"], ManifestIdsOf<M>["cardId"][]>;
      hands: Record<
        ManifestIdsOf<M>["handId"],
        PerPlayer<ManifestIdsOf<M>["cardId"][]>
      >;
      cards: Record<ManifestIdsOf<M>["cardId"], CardState<M>>;
      pieces: Record<ManifestIdsOf<M>["pieceId"], RuntimePieceData>;
      dice: Record<ManifestIdsOf<M>["dieId"], RuntimeDieData>;
      resources: PerPlayer<Record<ManifestIdsOf<M>["resourceId"], number>>;
    };
export type CompiledManifest<M extends AuthoredManifest> = Omit<
  ReducerManifestContract<
    ManifestTable<M>,
    string,
    PlayerId,
    ManifestIdsOf<M>["deckId"],
    ManifestIdsOf<M>["handId"],
    ManifestIdsOf<M>["cardId"]
  >,
  "ids" | "literals" | "staticBoards"
> & {
  staticBoards: StaticBoards<RuntimeTableRecord> & {
    byId: BoardMap<M>;
    hex: {
      [K in keyof BoardMap<M> as BoardMap<M>[K] extends { layout: "hex" }
        ? K
        : never]: Extract<BoardMap<M>[K], RuntimeHexBoardState>;
    };
    square: {
      [K in keyof BoardMap<M> as BoardMap<M>[K] extends { layout: "square" }
        ? K
        : never]: Extract<BoardMap<M>[K], RuntimeSquareBoardState>;
    };
  };
  literals: Omit<
    ReducerManifestContract<
      RuntimeTableRecord,
      string,
      string,
      string,
      string,
      string
    >["literals"],
    `${keyof ManifestIdsOf<M>}s`
  > & {
    [K in keyof ManifestIdsOf<M> as `${K}s`]: readonly ManifestIdsOf<M>[K][];
  };
  records: {
    [K in keyof ManifestIdsOf<M> as `${K}s`]: <V>(
      initial: V | ((id: ManifestIdsOf<M>[K]) => V),
    ) => Record<ManifestIdsOf<M>[K], V>;
  };
  ids: {
    [K in keyof ManifestIdsOf<M>]: ManifestIdSchema<ManifestIdsOf<M>[K], K>;
  };
  schemas: { table: z.ZodType<ManifestTable<M>>; runtime: z.ZodTypeAny };
  createInitialTable(options?: {
    playerIds?: readonly string[];
    shuffleItems?: <V>(values: readonly V[]) => V[];
  }): ManifestTable<M>;
};
