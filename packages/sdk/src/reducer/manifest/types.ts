import type {
  HexSpaceId,
  HexEdgeId,
  HexVertexId,
} from "../../shared/domain/board-identities.js";
import type { GameTopologyManifest } from "../../shared/domain/manifest.js";
import type {
  ObjectSchema,
  PropertySchema,
} from "../../shared/domain/contracts.js";
import type { z } from "zod";
import type {
  ManifestIdSchema,
  ReducerManifestContract,
  RuntimeTableRecord,
  RuntimeRecord,
  RuntimePayload,
  RuntimeCardData,
  RuntimePieceData,
  RuntimeDieData,
  RuntimeBoardState,
  RuntimeGenericBoardState,
  RuntimeHexBoardState,
  RuntimeSquareBoardState,
} from "../model";
import type { PlayerId } from "../per-player";

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
  : A["length"] extends 64
    ? number
    : A["length"] extends N
      ? A[number] | N
      : NumberRange<N, [...A, A["length"]]>;
type InstanceIds<Base extends string, Count> = [Count] extends [never]
  ? Base
  : Count extends number
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
type StandardSuit = "SPADES" | "HEARTS" | "CLUBS" | "DIAMONDS";
type StandardRank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";
type ResolvedCardSet<S> = S extends {
  type: "preset";
  presetId: "standard_52_deck";
}
  ? Omit<S, "type"> & {
      type: "manual";
      cards: readonly { type: `${StandardSuit}_${StandardRank}`; count: 1 }[];
      cardSchema: {
        properties: {
          suit: { type: "enum"; enums: readonly StandardSuit[] };
          rank: { type: "string" };
        };
      };
    }
  : S;
type CardSets<M> = ResolvedCardSet<Entries<M, "cardSets">>;
type Cards<M> =
  CardSets<M> extends infer S
    ? S extends { cards: infer C }
      ? Entry<C>
      : never
    : never;
type Zone<M, Scope> = Id<Extract<Entries<M, "zones">, { scope: Scope }>>;
type BoardLike<M> =
  Boards<M> extends infer B
    ? B extends unknown
      ? ResolveBoard<M, B>
      : never
    : never;
type Boards<M> = Entries<M, "boards">;
type RuntimeBoardId<B> = B extends { id: infer I extends string }
  ? B extends { scope: "perPlayer" }
    ? `${I}:${string}`
    : I
  : never;
type CardTypeOf<C> = C extends { cardType: infer T extends string }
  ? T
  : Extract<Get<C, "type">, string>;
export type ManifestIdsOf<M> = {
  playerId: PlayerId;
  phaseName: string;
  boardLayout: "generic" | "hex" | "square";
  cardSetId: Id<Entries<M, "cardSets">>;
  cardType: CardTypeOf<Cards<M>>;
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
  boardTypeId: Extract<Get<BoardLike<M>, "typeId">, string>;
  boardBaseId: Id<Boards<M>>;
  boardId: RuntimeBoardId<Boards<M>>;
  boardContainerId: Id<Entry<Get<BoardLike<M>, "containers">>>;
  relationTypeId: Extract<
    Get<Entry<Get<BoardLike<M>, "relations">>, "typeId">,
    string
  >;
  edgeId:
    | HexEdgeId<Extract<Id<Extract<Boards<M>, { layout: "hex" }>>, string>>
    | (Extract<Boards<M>, { layout: "square" }> extends never
        ? never
        : `square-edge:${string}`);
  edgeTypeId: Extract<Get<Entry<Get<BoardLike<M>, "edges">>, "typeId">, string>;
  vertexId:
    | HexVertexId<Extract<Id<Extract<Boards<M>, { layout: "hex" }>>, string>>
    | (Extract<Boards<M>, { layout: "square" }> extends never
        ? never
        : `square-vertex:${string}`);
  vertexTypeId: Extract<
    Get<Entry<Get<BoardLike<M>, "vertices">>, "typeId">,
    string
  >;
  spaceId: BoardSpaceId<BoardLike<M>>;
  spaceTypeId: Extract<Get<BoardSpaceEntry<BoardLike<M>>, "typeId">, string>;
};
type PropertyValue<P, M> = PropertySchema extends P
  ? RuntimePayload
  : P extends { type: infer T }
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
type ObjectFields<S, M> = [S] extends [never]
  ? RuntimeRecord
  : ObjectSchema extends S
    ? RuntimeRecord
    : S extends { properties: infer P }
      ? ObjectProperties<P, M>
      : RuntimeRecord;
type CardFields<S, M> = S extends { variants: infer V }
  ? ObjectProperties<Get<S, "shared">, M> & ObjectFields<V[keyof V], M>
  : ObjectFields<S, M>;
type CardState<M> =
  CardSets<M> extends infer S
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
    ? Omit<Extract<Entries<M, "boardTemplates">, { id: I }>, keyof B>
    : unknown);
type BoardField<B, K extends PropertyKey, M> = ObjectFields<Get<B, K>, M>;
type BoardSpaceEntry<B> = B extends { layout: "hex"; spaces: infer Spaces }
  ? Spaces[keyof Spaces]
  : Entry<Get<B, "spaces">>;
type BoardSpaceId<B> = B extends { layout: "hex" }
  ? HexSpaceId<B>
  : Id<Entry<Get<B, "spaces">>>;
type BoardParts<M, B> = {
  id: RuntimeBoardId<B>;
  baseId: Id<B>;
  fields: BoardField<ResolveBoard<M, B>, "boardFieldsSchema", M>;
  relations: (Omit<RuntimeHexBoardState["relations"][number], "typeId"> & {
    typeId:
      | Extract<
          Get<Entry<Get<ResolveBoard<M, B>, "relations">>, "typeId">,
          string
        >
      | (B extends { layout: "hex" | "square" } ? "adjacent" : never);
  })[];
  spaces: Record<
    BoardSpaceId<ResolveBoard<M, B>>,
    (B extends { layout: "hex" }
      ? { q: number; r: number }
      : B extends { layout: "square" }
        ? { row: number; col: number }
        : unknown) & {
      id: BoardSpaceId<ResolveBoard<M, B>>;
      name?: string | null;
      typeId?: Extract<
        Get<BoardSpaceEntry<ResolveBoard<M, B>>, "typeId">,
        string
      > | null;
      fields: BoardField<ResolveBoard<M, B>, "spaceFieldsSchema", M>;
      zoneId?: string | null;
    }
  >;
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
    [B in Extract<
      Boards<M>,
      { layout: "square" }
    > as RuntimeBoardId<B>]: Extract<BoardState<M, B>, RuntimeSquareBoardState>;
  };
  network: Record<string, RuntimeRecord>;
  track: Record<string, RuntimeRecord>;
};
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
      | "boards"
      | "resources"
    > & {
      boards: InferredBoards<M>;
      playerOrder: PlayerId[];
      decks: Record<ManifestIdsOf<M>["deckId"], ManifestIdsOf<M>["cardId"][]>;
      hands: Record<
        ManifestIdsOf<M>["handId"],
        Record<PlayerId, ManifestIdsOf<M>["cardId"][]>
      >;
      cards: Record<ManifestIdsOf<M>["cardId"], CardState<M>>;
      pieces: Record<ManifestIdsOf<M>["pieceId"], RuntimePieceData>;
      dice: Record<ManifestIdsOf<M>["dieId"], RuntimeDieData>;
      resources: Record<
        PlayerId,
        Record<ManifestIdsOf<M>["resourceId"], number>
      >;
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
  staticBoards: Pick<InferredBoards<M>, "byId" | "hex" | "square">;
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
