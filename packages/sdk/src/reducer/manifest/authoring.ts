import type { SchemaAuthoring } from "./types";
import { toManifestJson, type FieldsInput } from "./field-schemas";
import { parseTopologyManifestJson } from "./parse-json";
import type { ValidatedManifest } from "./types";
import type { ManifestCountValidation } from "./identity-types";
import type { HexSpaceId } from "../../shared/domain/board-identities.js";
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
type ZoneId<Manifest extends GameTopologyManifest> = IdsOf<Manifest["zones"]>;
type BoardId<Manifest extends GameTopologyManifest> = IdsOf<Manifest["boards"]>;
type PerPlayerZoneId<Manifest extends GameTopologyManifest> = EntryId<
  Extract<ArrayItem<NonNullable<Manifest["zones"]>>, { scope: "perPlayer" }>
>;
type SharedZoneId<Manifest extends GameTopologyManifest> = Exclude<
  ZoneId<Manifest>,
  PerPlayerZoneId<Manifest>
>;
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
type SpaceIdOf<BoardLike> = BoardLike extends { layout: "hex" }
  ? HexSpaceId<BoardLike>
  : IdsOf<BoardLike extends { spaces?: infer Spaces } ? Spaces : never>;
type ContainerIdOf<BoardLike> = IdsOf<
  BoardLike extends { containers?: infer Containers } ? Containers : never
>;
type SpaceIdForBoard<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = SpaceIdOf<BoardOf<Manifest, CurrentBoardId>>;
type ContainerIdForBoard<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = ContainerIdOf<BoardOf<Manifest, CurrentBoardId>>;

type PieceTypeOf<
  Manifest extends GameTopologyManifest,
  CurrentTypeId extends PieceTypeId<Manifest>,
> = Extract<
  ArrayItem<NonNullable<Manifest["pieceTypes"]>>,
  { id: CurrentTypeId }
>;
type DieTypeOf<
  Manifest extends GameTopologyManifest,
  CurrentTypeId extends DieTypeId<Manifest>,
> = Extract<
  ArrayItem<NonNullable<Manifest["dieTypes"]>>,
  { id: CurrentTypeId }
>;
type SlotIdOf<TypeSpec> = IdsOf<
  TypeSpec extends { slots?: infer Slots } ? Slots : never
>;
type SlotIdForPieceType<
  Manifest extends GameTopologyManifest,
  CurrentTypeId extends PieceTypeId<Manifest>,
> = SlotIdOf<PieceTypeOf<Manifest, CurrentTypeId>>;
type SlotIdForDieType<
  Manifest extends GameTopologyManifest,
  CurrentTypeId extends DieTypeId<Manifest>,
> = SlotIdOf<DieTypeOf<Manifest, CurrentTypeId>>;

type SingletonExplicitSeed<Seed> = Seed extends { id: string }
  ? Seed extends { count: infer Count extends number }
    ? Count extends 1
      ? Seed
      : never
    : Seed
  : never;
type TypedPieceSlotHostSeed<Manifest extends GameTopologyManifest> =
  SingletonExplicitSeed<PieceSeedOf<Manifest>> extends infer Seed
    ? Seed extends { typeId: infer CurrentTypeId extends PieceTypeId<Manifest> }
      ? [SlotIdForPieceType<Manifest, CurrentTypeId>] extends [never]
        ? never
        : Seed
      : never
    : never;
type TypedDieSlotHostSeed<Manifest extends GameTopologyManifest> =
  SingletonExplicitSeed<DieSeedOf<Manifest>> extends infer Seed
    ? Seed extends { typeId: infer CurrentTypeId extends DieTypeId<Manifest> }
      ? [SlotIdForDieType<Manifest, CurrentTypeId>] extends [never]
        ? never
        : Seed
      : never
    : never;

type TypedPieceSlotHomeSpec<Manifest extends GameTopologyManifest> =
  TypedPieceSlotHostSeed<Manifest> extends infer Seed
    ? Seed extends {
        id: infer HostId extends string;
        typeId: infer CurrentTypeId extends PieceTypeId<Manifest>;
      }
      ? {
          type: "slot";
          host: {
            kind: "piece";
            id: HostId;
          };
          slotId: SlotIdForPieceType<Manifest, CurrentTypeId>;
        }
      : never
    : never;
type TypedDieSlotHomeSpec<Manifest extends GameTopologyManifest> =
  TypedDieSlotHostSeed<Manifest> extends infer Seed
    ? Seed extends {
        id: infer HostId extends string;
        typeId: infer CurrentTypeId extends DieTypeId<Manifest>;
      }
      ? {
          type: "slot";
          host: {
            kind: "die";
            id: HostId;
          };
          slotId: SlotIdForDieType<Manifest, CurrentTypeId>;
        }
      : never
    : never;

type BuildTuple<
  Length extends number,
  Accumulator extends unknown[] = [],
> = Accumulator["length"] extends Length
  ? Accumulator
  : BuildTuple<Length, [...Accumulator, unknown]>;

type EnumerateInternal<
  Length extends number,
  Accumulator extends number[] = [],
> = Accumulator["length"] extends Length
  ? Accumulator[number]
  : EnumerateInternal<Length, [...Accumulator, Accumulator["length"]]>;

type AddOne<Count extends number> = [...BuildTuple<Count>, unknown]["length"] &
  number;
type OneTo<Count extends number> = Exclude<EnumerateInternal<AddOne<Count>>, 0>;
type PlayerId<Manifest extends GameTopologyManifest> =
  Manifest["players"]["maxPlayers"] extends infer MaxPlayers extends number
    ? `player-${OneTo<MaxPlayers>}`
    : `player-${number}`;

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

type TypedSharedContainerHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in SharedBoardId<Manifest>]: {
    type: "container";
    boardId: CurrentBoardId;
    containerId: ContainerIdForBoard<Manifest, CurrentBoardId>;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerContainerHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "container";
    boardId: CurrentBoardId;
    containerId: ContainerIdForBoard<Manifest, CurrentBoardId>;
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

type TypedSharedZoneHomeSpec<Manifest extends GameTopologyManifest> = {
  type: "zone";
  zoneId: SharedZoneId<Manifest>;
};

type TypedPerPlayerZoneHomeSpec<Manifest extends GameTopologyManifest> = {
  type: "zone";
  zoneId: PerPlayerZoneId<Manifest>;
};

type TypedPlayerScopedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | TypedPerPlayerZoneHomeSpec<Manifest>
  | TypedPerPlayerSpaceHomeSpec<Manifest>
  | TypedPerPlayerContainerHomeSpec<Manifest>
  | TypedPerPlayerEdgeHomeSpec<Manifest>
  | TypedPerPlayerVertexHomeSpec<Manifest>;

type TypedSharedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | { type: "detached" }
  | TypedSharedZoneHomeSpec<Manifest>
  | TypedSharedSpaceHomeSpec<Manifest>
  | TypedSharedContainerHomeSpec<Manifest>
  | TypedSharedEdgeHomeSpec<Manifest>
  | TypedSharedVertexHomeSpec<Manifest>
  | TypedPieceSlotHomeSpec<Manifest>
  | TypedDieSlotHomeSpec<Manifest>;

type TypedComponentHomeSpec<Manifest extends GameTopologyManifest> =
  | TypedSharedComponentHomeSpec<Manifest>
  | TypedPlayerScopedComponentHomeSpec<Manifest>;

type TypedSeedLocationSpec<
  Seed,
  Manifest extends GameTopologyManifest,
> = Seed extends { home: infer Home }
  ? Home extends TypedPlayerScopedComponentHomeSpec<Manifest>
    ? Omit<Seed, "ownerId" | "home"> & {
        ownerId: PlayerId<Manifest>;
        home: TypedPlayerScopedComponentHomeSpec<Manifest>;
      }
    : Omit<Seed, "ownerId" | "home"> & {
        ownerId?: PlayerId<Manifest>;
        home?: TypedComponentHomeSpec<Manifest>;
      }
  : Omit<Seed, "ownerId" | "home"> & {
      ownerId?: PlayerId<Manifest>;
      home?: TypedComponentHomeSpec<Manifest>;
    };

type TypedVisibilitySpec<Manifest extends GameTopologyManifest> = {
  faceUp?: boolean;
  visibleTo?: readonly PlayerId<Manifest>[];
};
type TypedVisibility<T, Manifest extends GameTopologyManifest> = T extends {
  visibility?: unknown;
}
  ? Omit<T, "visibility"> & {
      visibility?: TypedVisibilitySpec<Manifest>;
    }
  : T;
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
type TypedBoardContainerHost<Host, BoardLike> = Host extends {
  type: "space";
  spaceId: string;
}
  ? Omit<Host, "spaceId"> & {
      spaceId: SpaceIdOf<BoardLike>;
    }
  : Host;
type TypedBoardContainer<
  Container,
  Manifest extends GameTopologyManifest,
  BoardLike,
  ContainerSchema,
> = Container extends { host: infer Host }
  ? Omit<
      TypedFields<
        TypedAllowedCardSetIds<Container, Manifest>,
        ContainerSchema,
        Manifest,
        BoardLike
      >,
      "host"
    > & {
      host: TypedBoardContainerHost<Host, BoardLike>;
    }
  : TypedFields<
      TypedAllowedCardSetIds<Container, Manifest>,
      ContainerSchema,
      Manifest,
      BoardLike
    >;
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
      fromSpaceId: SpaceIdOf<BoardLike>;
      toSpaceId: SpaceIdOf<BoardLike>;
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
    TypedOptionalArray<
      TypedFields<
        Omit<Entry, "spaces" | "relations" | "containers">,
        SchemaForEntry<Entry, "boardFieldsSchema">,
        Manifest,
        BoardLike
      >,
      Entry,
      "spaces",
      TypedFields<
        ArrayItem<
          NonNullable<Entry extends { spaces?: infer Spaces } ? Spaces : never>
        >,
        SchemaForEntry<Entry, "spaceFieldsSchema">,
        Manifest,
        BoardLike
      >
    >,
    Entry,
    "relations",
    TypedBoardRelation<
      ArrayItem<
        NonNullable<
          Entry extends { relations?: infer Relations } ? Relations : never
        >
      >,
      Manifest,
      BoardLike,
      SchemaForEntry<Entry, "relationFieldsSchema">
    >
  >,
  Entry,
  "containers",
  TypedBoardContainer<
    ArrayItem<
      NonNullable<
        Entry extends { containers?: infer Containers } ? Containers : never
      >
    >,
    Manifest,
    BoardLike,
    SchemaForEntry<Entry, "containerFieldsSchema">
  >
>;
type TypedHexBoardLike<
  Entry,
  Manifest extends GameTopologyManifest,
  BoardLike,
> = TypedOptionalArray<
  TypedOptionalArray<
    TypedFields<
      Omit<Entry, "spaces" | "edges" | "vertices">,
      SchemaForEntry<Entry, "boardFieldsSchema">,
      Manifest,
      BoardLike
    > &
      (Entry extends { spaces: infer Spaces }
        ? {
            spaces: {
              [Key in keyof Spaces]: TypedFields<
                Spaces[Key],
                SchemaForEntry<Entry, "spaceFieldsSchema">,
                Manifest,
                BoardLike
              >;
            };
          }
        : unknown),
    Entry,
    "edges",
    TypedFields<
      ArrayItem<
        NonNullable<Entry extends { edges?: infer Edges } ? Edges : never>
      >,
      SchemaForEntry<Entry, "edgeFieldsSchema">,
      Manifest,
      BoardLike
    >
  >,
  Entry,
  "vertices",
  TypedFields<
    ArrayItem<
      NonNullable<
        Entry extends { vertices?: infer Vertices } ? Vertices : never
      >
    >,
    SchemaForEntry<Entry, "vertexFieldsSchema">,
    Manifest,
    BoardLike
  >
>;
type TypedSquareBoardLike<
  Entry,
  Manifest extends GameTopologyManifest,
  BoardLike,
> = TypedOptionalArray<
  TypedOptionalArray<
    TypedOptionalArray<
      TypedOptionalArray<
        TypedOptionalArray<
          TypedFields<
            Omit<
              Entry,
              "spaces" | "relations" | "containers" | "edges" | "vertices"
            >,
            SchemaForEntry<Entry, "boardFieldsSchema">,
            Manifest,
            BoardLike
          >,
          Entry,
          "spaces",
          TypedFields<
            ArrayItem<
              NonNullable<
                Entry extends { spaces?: infer Spaces } ? Spaces : never
              >
            >,
            SchemaForEntry<Entry, "spaceFieldsSchema">,
            Manifest,
            BoardLike
          >
        >,
        Entry,
        "relations",
        TypedBoardRelation<
          ArrayItem<
            NonNullable<
              Entry extends { relations?: infer Relations } ? Relations : never
            >
          >,
          Manifest,
          BoardLike,
          SchemaForEntry<Entry, "relationFieldsSchema">
        >
      >,
      Entry,
      "containers",
      TypedBoardContainer<
        ArrayItem<
          NonNullable<
            Entry extends { containers?: infer Containers } ? Containers : never
          >
        >,
        Manifest,
        BoardLike,
        SchemaForEntry<Entry, "containerFieldsSchema">
      >
    >,
    Entry,
    "edges",
    TypedFields<
      ArrayItem<
        NonNullable<Entry extends { edges?: infer Edges } ? Edges : never>
      >,
      SchemaForEntry<Entry, "edgeFieldsSchema">,
      Manifest,
      BoardLike
    >
  >,
  Entry,
  "vertices",
  TypedFields<
    ArrayItem<
      NonNullable<
        Entry extends { vertices?: infer Vertices } ? Vertices : never
      >
    >,
    SchemaForEntry<Entry, "vertexFieldsSchema">,
    Manifest,
    BoardLike
  >
>;
type TypedBoardLikeEntry<
  Entry,
  Manifest extends GameTopologyManifest,
> = Entry extends { layout: "generic" }
  ? TypedGenericBoardLike<Entry, Manifest, Entry>
  : Entry extends { layout: "hex" }
    ? TypedHexBoardLike<Entry, Manifest, Entry>
    : Entry extends { layout: "square" }
      ? TypedSquareBoardLike<Entry, Manifest, Entry>
      : Entry;

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
  ? Omit<TypedVisibility<Card, Manifest>, "home" | "properties"> & {
      home?: TypedComponentHomeSpec<Manifest>;
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
> = TypedAllowedCardSetIds<Zone, Manifest>;

type TypedPieceSeed<
  Seed,
  Manifest extends GameTopologyManifest,
> = Seed extends { typeId: infer CurrentTypeId }
  ? CurrentTypeId extends PieceTypeId<Manifest>
    ? Omit<
        TypedSeedLocationSpec<TypedVisibility<Seed, Manifest>, Manifest>,
        "typeId" | "ownerId" | "home" | "fields"
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
      } & Pick<
          TypedSeedLocationSpec<TypedVisibility<Seed, Manifest>, Manifest>,
          "ownerId" | "home"
        >
    : Omit<Seed, "typeId"> & {
        typeId: PieceTypeId<Manifest>;
      }
  : never;

type TypedDieSeed<Seed, Manifest extends GameTopologyManifest> = Seed extends {
  typeId: infer CurrentTypeId;
}
  ? CurrentTypeId extends DieTypeId<Manifest>
    ? Omit<
        TypedSeedLocationSpec<TypedVisibility<Seed, Manifest>, Manifest>,
        "typeId" | "ownerId" | "home" | "fields"
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
      } & Pick<
          TypedSeedLocationSpec<TypedVisibility<Seed, Manifest>, Manifest>,
          "ownerId" | "home"
        >
    : Omit<Seed, "typeId"> & {
        typeId: DieTypeId<Manifest>;
      }
  : never;

export type TypedTopologyManifest<Manifest extends GameTopologyManifest> = Omit<
  Manifest,
  "cardSets" | "zones" | "boards" | "pieceSeeds" | "dieSeeds"
> & {
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

type DefinedTopologyManifest<Manifest> = Manifest extends GameTopologyManifest
  ? ValidatedManifest<Manifest>
  : ValidatedManifest<GameTopologyManifest>;

export function defineTopologyManifest<const Manifest>(
  manifest: Manifest &
    TopologyManifestValidation<NoInfer<Manifest>> &
    ManifestCountValidation<NoInfer<Manifest>>,
): DefinedTopologyManifest<Manifest> {
  const validated = parseTopologyManifestJson(toManifestJson(manifest));
  // eslint-disable-next-line no-restricted-syntax -- Semantic validation establishes the JSON boundary and its authored-type witness.
  return validated as unknown as DefinedTopologyManifest<Manifest>;
}
