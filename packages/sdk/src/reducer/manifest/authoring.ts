import type { SchemaAuthoring, TileSpaceIds } from "./types";
import { toManifestJson, type FieldsInput } from "./field-schemas";
import { parseTopologyManifestJson } from "./parse-json";
import type { ValidatedManifest } from "./types";
import type {
  ManifestCountValidation,
  RuntimeIdsFromCount,
} from "./identity-types";
import type {
  BoardEdgeRef,
  BoardVertexRef,
  GameTopologyManifest as ApiGameTopologyManifest,
} from "../../shared/domain/contracts.js";

type GameTopologyManifest = SchemaAuthoring<ApiGameTopologyManifest>;

type ArrayItem<T> = T extends readonly (infer Item)[] ? Item : never;
type EntryId<T> = T extends { id: infer Id extends string } ? Id : never;
type IdsOf<T> = EntryId<ArrayItem<NonNullable<T>>>;

type CardSetId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["cardSets"]
>;
type BoardId<Manifest extends GameTopologyManifest> = IdsOf<Manifest["boards"]>;
type PerPlayerBoardId<Manifest extends GameTopologyManifest> = EntryId<
  Extract<ArrayItem<NonNullable<Manifest["boards"]>>, { scope: "perPlayer" }>
>;
type SharedBoardId<Manifest extends GameTopologyManifest> = Exclude<
  BoardId<Manifest>,
  PerPlayerBoardId<Manifest>
>;
type PieceTypeId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["pieceTypes"]
>;
type DieTypeId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["dieTypes"]
>;
type PieceSeedOf<Manifest extends GameTopologyManifest> = ArrayItem<
  NonNullable<Manifest["pieceSeeds"]>
>;
type DieSeedOf<Manifest extends GameTopologyManifest> = ArrayItem<
  NonNullable<Manifest["dieSeeds"]>
>;
type BoardOf<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = Extract<ArrayItem<NonNullable<Manifest["boards"]>>, { id: CurrentBoardId }>;
type SpaceIdOf<BoardLike, Manifest> = BoardLike extends {
  layout: "hex" | "square";
}
  ? TileSpaceIds<Manifest, BoardLike["layout"]>
  : IdsOf<BoardLike extends { spaces?: infer Spaces } ? Spaces : never>;
type SpaceIdForBoard<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = SpaceIdOf<BoardOf<Manifest, CurrentBoardId>, Manifest>;
type PieceTypeOf<
  Manifest extends GameTopologyManifest,
  T extends PieceTypeId<Manifest>,
> = Extract<ArrayItem<NonNullable<Manifest["pieceTypes"]>>, { id: T }>;
type DieTypeOf<
  Manifest extends GameTopologyManifest,
  T extends DieTypeId<Manifest>,
> = Extract<ArrayItem<NonNullable<Manifest["dieTypes"]>>, { id: T }>;

type TypedSharedSpaceHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in SharedBoardId<Manifest>]: {
    type: "space";
    boardId: CurrentBoardId;
    spaceId: SpaceIdForBoard<Manifest, CurrentBoardId>;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerSpaceHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "space";
    boardId: CurrentBoardId;
    spaceId: SpaceIdForBoard<Manifest, CurrentBoardId>;
  };
}[PerPlayerBoardId<Manifest>];

type TypedSharedEdgeHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in SharedBoardId<Manifest>]: {
    type: "edge";
    boardId: CurrentBoardId;
    ref: SchemaAuthoring<BoardEdgeRef>;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerEdgeHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "edge";
    boardId: CurrentBoardId;
    ref: SchemaAuthoring<BoardEdgeRef>;
  };
}[PerPlayerBoardId<Manifest>];

type TypedSharedVertexHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in SharedBoardId<Manifest>]: {
    type: "vertex";
    boardId: CurrentBoardId;
    ref: SchemaAuthoring<BoardVertexRef>;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerVertexHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "vertex";
    boardId: CurrentBoardId;
    ref: SchemaAuthoring<BoardVertexRef>;
  };
}[PerPlayerBoardId<Manifest>];

type ExpandedSeedId<Seed> = Seed extends { typeId: infer T extends string }
  ? RuntimeIdsFromCount<
      Seed extends { id: infer I extends string } ? I : T,
      Seed extends { count: infer C } ? C : never
    >
  : never;
type ZoneHomeFor<
  Zone,
  Manifest extends GameTopologyManifest,
  Shared extends boolean,
> = Zone extends { id: infer Z extends string }
  ? Zone extends { scope: "shared" }
    ? { type: "zone"; zoneId: Z; component?: never }
    : Zone extends { scope: "perPlayer" }
      ? Shared extends true
        ? never
        : { type: "zone"; zoneId: Z; component?: never }
      : Zone extends { attachedTo: { board: infer B } }
        ? B extends SharedBoardId<Manifest>
          ? { type: "zone"; zoneId: Z; component?: never }
          : Shared extends true
            ? never
            : { type: "zone"; zoneId: Z; component?: never }
        : Zone extends { attachedTo: { pieceType: infer T } }
          ? ComponentZoneHome<
              Z,
              Extract<PieceSeedOf<Manifest>, { typeId: T }>,
              Shared
            >
          : Zone extends { attachedTo: { dieType: infer T } }
            ? ComponentZoneHome<
                Z,
                Extract<DieSeedOf<Manifest>, { typeId: T }>,
                Shared
              >
            : Zone extends { attachedTo: { tileType: infer T } }
              ? ComponentZoneHome<
                  Z,
                  Extract<ArrayItem<Manifest["tileSeeds"]>, { typeId: T }>,
                  Shared
                >
              : never
  : never;
type ComponentZoneHome<Z extends string, Seed, Shared extends boolean> = (
  Shared extends true ? Exclude<Seed, { scope: "perPlayer" }> : Seed
) extends infer Host
  ? Host extends object
    ? { type: "zone"; zoneId: Z; component: ExpandedSeedId<Host> }
    : never
  : never;
type TypedSharedZoneHomeSpec<Manifest extends GameTopologyManifest> =
  ZoneHomeFor<ArrayItem<NonNullable<Manifest["zones"]>>, Manifest, true>;
type TypedPerPlayerZoneHomeSpec<Manifest extends GameTopologyManifest> =
  ZoneHomeFor<ArrayItem<NonNullable<Manifest["zones"]>>, Manifest, false>;

type TypedPlayerScopedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | TypedPerPlayerZoneHomeSpec<Manifest>
  | TypedPerPlayerSpaceHomeSpec<Manifest>
  | TypedPerPlayerEdgeHomeSpec<Manifest>
  | TypedPerPlayerVertexHomeSpec<Manifest>;

type TypedSharedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | { type: "detached" }
  | TypedSharedZoneHomeSpec<Manifest>
  | TypedSharedSpaceHomeSpec<Manifest>
  | TypedSharedEdgeHomeSpec<Manifest>
  | TypedSharedVertexHomeSpec<Manifest>;

type TypedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | TypedSharedComponentHomeSpec<Manifest>
  | TypedPlayerScopedComponentHomeSpec<Manifest>;

type TypedSeedLocationSpec<Seed, Manifest extends GameTopologyManifest> = Omit<
  Seed,
  "home"
> & {
  home?: Seed extends { scope: "perPlayer" }
    ? TypedComponentHomeSpec<Manifest>
    : TypedSharedComponentHomeSpec<Manifest>;
};
type AuthoredComponent<T> = Omit<T, "ownerId" | "visibility"> & {
  ownerId?: never;
  visibility?: { faceUp?: boolean; visibleTo?: never };
};
type TypedFields<
  T,
  Schema,
  Manifest extends GameTopologyManifest,
  BoardLike = never,
> = T extends { fields?: unknown }
  ? Omit<T, "fields"> & {
      fields?: FieldsInput<Schema, Manifest, BoardLike>;
    }
  : T;
type TypedBoardRelation<
  Relation,
  Manifest extends GameTopologyManifest,
  BoardLike,
  RelationSchema,
> = Relation extends object
  ? Omit<
      TypedFields<Relation, RelationSchema, Manifest, BoardLike>,
      "fromSpaceId" | "toSpaceId"
    > & {
      fromSpaceId: SpaceIdOf<BoardLike, Manifest>;
      toSpaceId: SpaceIdOf<BoardLike, Manifest>;
    }
  : Relation;
type TypedOptionalArray<
  Base,
  Source,
  Key extends string,
  Item,
> = Source extends { [Property in Key]?: readonly unknown[] }
  ? Base & {
      [Property in Key]?: ReadonlyArray<Item>;
    }
  : Base;
type SchemaForEntry<Entry, Key extends string> = Key extends keyof Entry
  ? Entry[Key]
  : undefined;
type TypedGenericBoardLike<
  Entry,
  Manifest extends GameTopologyManifest,
  BoardLike,
> = TypedOptionalArray<
  TypedOptionalArray<
    TypedFields<
      Omit<Entry, "spaces" | "relations">,
      SchemaForEntry<Entry, "boardFieldsSchema">,
      Manifest,
      BoardLike
    >,
    Entry,
    "spaces",
    TypedFields<
      ArrayItem<NonNullable<Entry extends { spaces?: infer S } ? S : never>>,
      SchemaForEntry<Entry, "spaceFieldsSchema">,
      Manifest,
      BoardLike
    >
  >,
  Entry,
  "relations",
  TypedBoardRelation<
    ArrayItem<NonNullable<Entry extends { relations?: infer R } ? R : never>>,
    Manifest,
    BoardLike,
    SchemaForEntry<Entry, "relationFieldsSchema">
  >
>;
type AuthoredKeys<T> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K>
    ? [Exclude<T[K], undefined>] extends [never]
      ? never
      : K
    : K;
}[keyof T];
type TypedBoardLikeEntry<Entry, Manifest extends GameTopologyManifest> =
  | "containers"
  | "containerFieldsSchema"
  | "shape"
  | "exclude"
  | "edges"
  | "vertices"
  | "edgeFieldsSchema"
  | "vertexFieldsSchema" extends infer Legacy
  ? Extract<Legacy, AuthoredKeys<Entry>> extends never
    ? Entry extends { layout: "generic" }
      ? TypedGenericBoardLike<Entry, Manifest, Entry>
      : "spaces" | "spaceFieldsSchema" extends infer Geometry
        ? Extract<Geometry, AuthoredKeys<Entry>> extends never
          ? TypedFields<
              Entry,
              SchemaForEntry<Entry, "boardFieldsSchema">,
              Manifest,
              Entry
            >
          : never
        : never
    : never
  : never;

type AuthoredCardType<Card> = Card extends {
  cardType: infer Category extends string;
}
  ? Category
  : never;
type TypedCard<
  Card,
  Manifest extends GameTopologyManifest,
  CardSchema,
> = Card extends { id: string; cardType: string }
  ? Omit<AuthoredComponent<Card>, "home" | "properties"> & {
      home?: Card extends { scope: "perPlayer" }
        ? TypedComponentHomeSpec<Manifest>
        : TypedSharedComponentHomeSpec<Manifest>;
      properties: CardSchema extends {
        byCardType: infer Variants extends Record<string, unknown>;
      }
        ? AuthoredCardType<Card> extends keyof Variants
          ? FieldsInput<Variants[AuthoredCardType<Card>], Manifest>
          : never
        : FieldsInput<CardSchema, Manifest>;
    }
  : Card;

type TypedCardSet<
  CardSet,
  Manifest extends GameTopologyManifest,
> = CardSet extends {
  cardSchema: infer CardSchema;
  cards: infer Cards extends readonly unknown[];
}
  ? Omit<CardSet, "cards" | "defaultHome"> & {
      defaultHome: TypedComponentHomeSpec<Manifest>;
      cards: ReadonlyArray<TypedCard<ArrayItem<Cards>, Manifest, CardSchema>>;
    }
  : CardSet;

type TypedAllowedCardSetIds<
  T,
  Manifest extends GameTopologyManifest,
> = T extends object
  ? Omit<T, "allowedCardSetIds"> & {
      allowedCardSetIds?: readonly CardSetId<Manifest>[];
    }
  : T;

type TypedZone<
  Zone,
  Manifest extends GameTopologyManifest,
> = TypedAllowedCardSetIds<Zone, Manifest> &
  (Zone extends { attachedTo: infer A }
    ? {
        attachedTo: A extends { board: infer B }
          ? B extends BoardId<Manifest>
            ? A extends { space: unknown }
              ? BoardOf<Manifest, B> extends { layout: "generic" }
                ? { board: B; space: SpaceIdForBoard<Manifest, B> }
                : never
              : { board: B }
            : never
          : A extends { pieceType: unknown }
            ? { pieceType: PieceTypeId<Manifest> }
            : A extends { dieType: unknown }
              ? { dieType: DieTypeId<Manifest> }
              : A extends { tileType: infer T }
                ? {
                    tileType: T;
                    cell: IdsOf<
                      Extract<
                        ArrayItem<Manifest["tileTypes"]>,
                        { id: T }
                      >["cells"]
                    >;
                  }
                : never;
      }
    : unknown);

type TypedPieceSeed<
  Seed,
  Manifest extends GameTopologyManifest,
> = Seed extends { typeId: infer CurrentTypeId }
  ? CurrentTypeId extends PieceTypeId<Manifest>
    ? Omit<
        TypedSeedLocationSpec<AuthoredComponent<Seed>, Manifest>,
        "typeId" | "home" | "fields"
      > & {
        typeId: CurrentTypeId;
        fields?: FieldsInput<
          PieceTypeOf<Manifest, CurrentTypeId> extends {
            fieldsSchema?: infer FieldsSchema;
          }
            ? FieldsSchema
            : undefined,
          Manifest
        >;
      } & Pick<TypedSeedLocationSpec<AuthoredComponent<Seed>, Manifest>, "home">
    : Omit<Seed, "typeId"> & {
        typeId: PieceTypeId<Manifest>;
      }
  : never;

type TypedDieSeed<Seed, Manifest extends GameTopologyManifest> = Seed extends {
  typeId: infer CurrentTypeId;
}
  ? CurrentTypeId extends DieTypeId<Manifest>
    ? Omit<
        TypedSeedLocationSpec<AuthoredComponent<Seed>, Manifest>,
        "typeId" | "home" | "fields"
      > & {
        typeId: CurrentTypeId;
        fields?: FieldsInput<
          DieTypeOf<Manifest, CurrentTypeId> extends {
            fieldsSchema?: infer FieldsSchema;
          }
            ? FieldsSchema
            : undefined,
          Manifest
        >;
      } & Pick<TypedSeedLocationSpec<AuthoredComponent<Seed>, Manifest>, "home">
    : Omit<Seed, "typeId"> & {
        typeId: DieTypeId<Manifest>;
      }
  : never;

type TileTypeId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["tileTypes"]
>;
type TypedTileType<T, Manifest extends GameTopologyManifest> = T extends object
  ? Omit<
      TypedFields<T, SchemaForEntry<T, "fieldsSchema">, Manifest>,
      "cells" | "edges" | "vertices"
    > & {
      cells: ReadonlyArray<
        TypedFields<
          ArrayItem<T extends { cells: infer C } ? C : never>,
          SchemaForEntry<T, "cellFieldsSchema">,
          Manifest
        >
      >;
      edges?: ReadonlyArray<
        TypedFields<
          ArrayItem<T extends { edges?: infer E } ? E : never>,
          SchemaForEntry<T, "edgeFieldsSchema">,
          Manifest
        > & { cellId: IdsOf<T extends { cells: infer C } ? C : never> }
      >;
      vertices?: ReadonlyArray<
        TypedFields<
          ArrayItem<T extends { vertices?: infer V } ? V : never>,
          SchemaForEntry<T, "vertexFieldsSchema">,
          Manifest
        > & { cellId: IdsOf<T extends { cells: infer C } ? C : never> }
      >;
    }
  : never;
type TileBoardHome<Seed, Manifest extends GameTopologyManifest, T> =
  ArrayItem<Manifest["boards"]> extends infer B
    ? B extends { id: infer I; layout: infer L extends "hex" | "square" }
      ? Extract<ArrayItem<Manifest["tileTypes"]>, { id: T }> extends {
          layout: L;
        }
        ? Seed extends { scope: "perPlayer" }
          ? TileBoardCoordinates<L> & { type: "board"; boardId: I; layout: L }
          : B extends { scope: "shared" }
            ? TileBoardCoordinates<L> & { type: "board"; boardId: I; layout: L }
            : never
        : never
      : never
    : never;
type TileBoardCoordinates<L> = L extends "hex"
  ? { q: number; r: number; rotation: 0 | 1 | 2 | 3 | 4 | 5 }
  : { col: number; row: number; rotation: 0 | 1 | 2 | 3 };
type TypedTileSeed<Seed, Manifest extends GameTopologyManifest> = Seed extends {
  typeId: infer T;
}
  ? Omit<Seed, "typeId" | "properties" | "home" | "ownerId" | "visibility"> & {
      ownerId?: never;
      visibility?: never;
      typeId: TileTypeId<Manifest>;
      properties?: FieldsInput<
        SchemaForEntry<
          Extract<ArrayItem<Manifest["tileTypes"]>, { id: T }>,
          "propertiesSchema"
        >,
        Manifest
      >;
      home?:
        | { type: "detached" }
        | TileBoardHome<Seed, Manifest, T>
        | ZoneHomeFor<
            Exclude<
              ArrayItem<NonNullable<Manifest["zones"]>>,
              { visibility: "hidden" | "ownerOnly" }
            >,
            Manifest,
            Seed extends { scope: "perPlayer" } ? false : true
          >;
    }
  : never;

export type TypedTopologyManifest<Manifest extends GameTopologyManifest> = Omit<
  Manifest,
  | "cardSets"
  | "zones"
  | "boards"
  | "pieceTypes"
  | "dieTypes"
  | "pieceSeeds"
  | "dieSeeds"
  | "tileTypes"
  | "tileSeeds"
> & {
  tileTypes?: ReadonlyArray<
    TypedTileType<ArrayItem<Manifest["tileTypes"]>, Manifest>
  >;
  tileSeeds?: ReadonlyArray<
    TypedTileSeed<ArrayItem<Manifest["tileSeeds"]>, Manifest>
  >;
  pieceTypes?: ReadonlyArray<
    ArrayItem<Manifest["pieceTypes"]> extends infer T
      ? "slots" extends keyof T
        ? never
        : T
      : never
  >;
  dieTypes?: ReadonlyArray<
    ArrayItem<Manifest["dieTypes"]> extends infer T
      ? "slots" extends keyof T
        ? never
        : T
      : never
  >;
  cardSets: ReadonlyArray<
    TypedCardSet<ArrayItem<Manifest["cardSets"]>, Manifest>
  >;
  zones?: Manifest["zones"] extends readonly unknown[]
    ? ReadonlyArray<TypedZone<ArrayItem<Manifest["zones"]>, Manifest>>
    : Manifest["zones"];
  boards?: Manifest["boards"] extends readonly unknown[]
    ? ReadonlyArray<
        TypedBoardLikeEntry<ArrayItem<Manifest["boards"]>, Manifest>
      >
    : Manifest["boards"];
  pieceSeeds?: Manifest["pieceSeeds"] extends readonly unknown[]
    ? ReadonlyArray<TypedPieceSeed<ArrayItem<Manifest["pieceSeeds"]>, Manifest>>
    : Manifest["pieceSeeds"];
  dieSeeds?: Manifest["dieSeeds"] extends readonly unknown[]
    ? ReadonlyArray<TypedDieSeed<ArrayItem<Manifest["dieSeeds"]>, Manifest>>
    : Manifest["dieSeeds"];
};

export type TopologyManifestValidation<Manifest> =
  Manifest extends GameTopologyManifest
    ? TypedTopologyManifest<Manifest>
    : GameTopologyManifest;

export function defineTopologyManifest<const Manifest>(
  manifest: Manifest &
    TopologyManifestValidation<NoInfer<Manifest>> &
    ManifestCountValidation<NoInfer<Manifest>>,
): ValidatedManifest<Manifest> {
  const validated = parseTopologyManifestJson(toManifestJson(manifest));
  // eslint-disable-next-line no-restricted-syntax -- Semantic validation establishes the JSON boundary and its authored-type witness.
  return validated as unknown as ValidatedManifest<Manifest>;
}
