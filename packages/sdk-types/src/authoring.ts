import type {
  BoardEdgeRef,
  BoardVertexRef,
  DieTypeSpec as ApiDieTypeSpec,
  GameTopologyManifest as ApiGameTopologyManifest,
  JsonValue,
  PropertySchema,
} from "./contracts.js";

type DieTypeSpec = Omit<ApiDieTypeSpec, "sides"> & {
  sides?: ApiDieTypeSpec["sides"];
};

type DeepReadonly<T> = T extends (...args: readonly unknown[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item>>
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

type GameTopologyManifest = DeepReadonly<
  Omit<ApiGameTopologyManifest, "dieTypes"> & {
    dieTypes?: readonly DieTypeSpec[];
  }
>;

type ArrayItem<T> = T extends readonly (infer Item)[] ? Item : never;
type EntryId<T> = T extends { id: infer Id extends string } ? Id : never;
type IdsOf<T> = EntryId<ArrayItem<NonNullable<T>>>;
type RuntimeRecord = Record<string, JsonValue>;

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
type ResourceId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["resources"]
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
type SetupOptionId<Manifest extends GameTopologyManifest> = IdsOf<
  Manifest["setupOptions"]
>;
type ManualCardSetOf<Manifest extends GameTopologyManifest> = Extract<
  ArrayItem<NonNullable<Manifest["cardSets"]>>,
  { type: "manual" }
>;
type CardOf<Manifest extends GameTopologyManifest> =
  ManualCardSetOf<Manifest> extends infer CardSet
    ? CardSet extends { cards: infer Cards extends readonly unknown[] }
      ? ArrayItem<Cards>
      : never
    : never;

type BoardOf<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = Extract<ArrayItem<NonNullable<Manifest["boards"]>>, { id: CurrentBoardId }>;
type BoardTemplateOf<
  Manifest extends GameTopologyManifest,
  CurrentTemplateId extends string,
> = Extract<
  ArrayItem<NonNullable<Manifest["boardTemplates"]>>,
  { id: CurrentTemplateId }
>;
type ResolvedBoardLikeOf<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> =
  | BoardOf<Manifest, CurrentBoardId>
  | (BoardOf<Manifest, CurrentBoardId> extends {
      templateId: infer CurrentTemplateId extends string;
    }
      ? BoardTemplateOf<Manifest, CurrentTemplateId>
      : never);

type SpaceIdOf<BoardLike> = IdsOf<
  BoardLike extends { spaces?: infer Spaces } ? Spaces : never
>;
type ContainerIdOf<BoardLike> = IdsOf<
  BoardLike extends { containers?: infer Containers } ? Containers : never
>;
type SpaceOf<BoardLike> = ArrayItem<
  NonNullable<BoardLike extends { spaces?: infer Spaces } ? Spaces : never>
>;
type SquareSpaceOf<BoardLike> = Extract<
  SpaceOf<BoardLike>,
  { row: number; col: number }
>;
type HexSpaceOf<BoardLike> = Extract<
  SpaceOf<BoardLike>,
  { q: number; r: number }
>;
type BoardEntryOf<Manifest extends GameTopologyManifest> = ArrayItem<
  NonNullable<Manifest["boards"]>
>;
type TemplateForBoardEntry<
  Manifest extends GameTopologyManifest,
  Entry,
> = Entry extends {
  templateId: infer TemplateId extends string;
  layout: infer Layout;
}
  ? Extract<BoardTemplateOf<Manifest, TemplateId>, { layout: Layout }>
  : never;
type BoardLikeForEntry<Manifest extends GameTopologyManifest, Entry> =
  Entry extends BoardEntryOf<Manifest>
    ? Entry extends { id: infer CurrentBoardId extends BoardId<Manifest> }
      ? ResolvedBoardLikeOf<Manifest, CurrentBoardId>
      : Entry
    : Entry;

type SpaceIdForBoard<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = SpaceIdOf<ResolvedBoardLikeOf<Manifest, CurrentBoardId>>;
type ContainerIdForBoard<
  Manifest extends GameTopologyManifest,
  CurrentBoardId extends BoardId<Manifest>,
> = ContainerIdOf<ResolvedBoardLikeOf<Manifest, CurrentBoardId>>;

type RuntimeIdsFromCount<BaseId extends string, Count> = Count extends number
  ? number extends Count
    ? BaseId | `${BaseId}-${number}`
    : Count extends 1
      ? BaseId
      : `${BaseId}-${OneTo<Count>}`
  : BaseId;

type CardRuntimeId<Card> = Card extends { type: infer TypeId extends string }
  ? RuntimeIdsFromCount<
      TypeId,
      Card extends { count: infer Count extends number } ? Count : never
    >
  : never;
type SeedRuntimeId<Seed> = Seed extends { typeId: infer TypeId extends string }
  ? RuntimeIdsFromCount<
      Seed extends { id: infer Id extends string } ? Id : TypeId,
      Seed extends { count: infer Count extends number } ? Count : never
    >
  : never;
type CardId<Manifest extends GameTopologyManifest> = CardRuntimeId<
  CardOf<Manifest>
>;
type PieceId<Manifest extends GameTopologyManifest> = SeedRuntimeId<
  PieceSeedOf<Manifest>
>;
type DieId<Manifest extends GameTopologyManifest> = SeedRuntimeId<
  DieSeedOf<Manifest>
>;

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

type SingletonExplicitSeed<Seed> = Seed extends { id: infer _Id extends string }
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

type RequiredSchemaKeys<Properties extends Readonly<Record<string, unknown>>> =
  {
    [Key in keyof Properties]: Properties[Key] extends { optional: true }
      ? never
      : Properties[Key] extends { default: unknown }
        ? never
        : Key;
  }[keyof Properties];
type OptionalSchemaKeys<Properties extends Readonly<Record<string, unknown>>> =
  {
    [Key in keyof Properties]: Properties[Key] extends { optional: true }
      ? Key
      : Properties[Key] extends { default: unknown }
        ? Key
        : never;
  }[keyof Properties];

type SchemaValueFromObjectProperties<
  Properties extends Readonly<Record<string, unknown>>,
  Manifest extends GameTopologyManifest,
  BoardLike = never,
> = keyof Properties extends never
  ? RuntimeRecord
  : {
      [Key in RequiredSchemaKeys<Properties>]: SchemaValueForProperty<
        Properties[Key],
        Manifest,
        BoardLike
      >;
    } & {
      [Key in OptionalSchemaKeys<Properties>]?: SchemaValueForProperty<
        Properties[Key],
        Manifest,
        BoardLike
      >;
    };

type SchemaValueForObjectSchema<
  Schema,
  Manifest extends GameTopologyManifest,
  BoardLike = never,
> = Schema extends {
  properties: infer Properties extends Readonly<Record<string, unknown>>;
}
  ? SchemaValueFromObjectProperties<Properties, Manifest, BoardLike>
  : RuntimeRecord;

type MergeSharedProperties<Variant, Shared> = Variant extends {
  properties: infer VariantProperties extends Readonly<Record<string, unknown>>;
}
  ? {
      properties: Shared extends Readonly<Record<string, unknown>>
        ? Omit<Shared, keyof VariantProperties> & VariantProperties
        : VariantProperties;
    }
  : Variant;

type BaseSchemaValueForProperty<
  Schema,
  Manifest extends GameTopologyManifest,
  BoardLike = never,
> = Schema extends { type: "string" }
  ? string
  : Schema extends { type: "integer" | "number" }
    ? number
    : Schema extends { type: "boolean" }
      ? boolean
      : Schema extends { type: "zoneId" }
        ? ZoneId<Manifest>
        : Schema extends { type: "cardId" }
          ? CardId<Manifest>
          : Schema extends { type: "playerId" }
            ? PlayerId<Manifest>
            : Schema extends { type: "boardId" }
              ? BoardId<Manifest>
              : Schema extends { type: "spaceId" }
                ? [BoardLike] extends [never]
                  ? string
                  : SpaceIdOf<BoardLike>
                : Schema extends { type: "edgeId" }
                  ? [BoardLike] extends [never]
                    ? string
                    : DerivedEdgeIdOf<BoardLike>
                  : Schema extends { type: "vertexId" }
                    ? [BoardLike] extends [never]
                      ? string
                      : DerivedVertexIdOf<BoardLike>
                    : Schema extends { type: "pieceId" }
                      ? PieceId<Manifest>
                      : Schema extends { type: "dieId" }
                        ? DieId<Manifest>
                        : Schema extends { type: "resourceId" }
                          ? ResourceId<Manifest>
                          : Schema extends { type: "enum" }
                            ? Schema extends {
                                enums: infer Values extends readonly string[];
                              }
                              ? Values[number]
                              : string
                            : Schema extends { type: "array" }
                              ? ReadonlyArray<
                                  SchemaValueForProperty<
                                    Schema extends {
                                      items?: infer Items;
                                    }
                                      ? Items
                                      : undefined,
                                    Manifest,
                                    BoardLike
                                  >
                                >
                              : Schema extends { type: "object" }
                                ? SchemaValueForObjectSchema<
                                    Schema extends {
                                      properties?: infer Properties extends
                                        Record<string, unknown>;
                                    }
                                      ? {
                                          properties: Properties;
                                        }
                                      : undefined,
                                    Manifest,
                                    BoardLike
                                  >
                                : Schema extends { type: "record" }
                                  ? Record<
                                      string,
                                      SchemaValueForProperty<
                                        Schema extends {
                                          values?: infer Values;
                                        }
                                          ? Values
                                          : undefined,
                                        Manifest,
                                        BoardLike
                                      >
                                    >
                                  : RuntimeRecord;

type SchemaValueForProperty<
  Schema,
  Manifest extends GameTopologyManifest,
  BoardLike = never,
> = Schema extends { nullable: true }
  ? BaseSchemaValueForProperty<Schema, Manifest, BoardLike> | null
  : BaseSchemaValueForProperty<Schema, Manifest, BoardLike>;

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

type ToNumber<Input extends string> =
  Input extends `${infer Value extends number}` ? Value : never;
type AbsoluteNumber<Count extends number> =
  `${Count}` extends `-${infer Value extends number}` ? Value : Count;
type IsNegative<Count extends number> = `${Count}` extends `-${string}`
  ? true
  : false;
type Negate<Count extends number> = Count extends 0
  ? 0
  : ToNumber<`${`${Count}` extends `-${infer Value extends number}`
      ? Value
      : `-${Count}`}`>;
type AddPositive<Left extends number, Right extends number> = number extends
  | Left
  | Right
  ? number
  : [...BuildTuple<Left>, ...BuildTuple<Right>]["length"] & number;
type ComparePositive<
  Left extends number,
  Right extends number,
> = Left extends Right
  ? "equal"
  : number extends Left | Right
    ? "unknown"
    : BuildTuple<Left> extends [...BuildTuple<Right>, ...infer Rest]
      ? Rest extends []
        ? "equal"
        : "greater"
      : "less";
type SubtractPositive<
  Left extends number,
  Right extends number,
> = number extends Left | Right
  ? number
  : BuildTuple<Left> extends [...BuildTuple<Right>, ...infer Rest]
    ? Rest["length"] & number
    : never;
type AddSigned<Left extends number, Right extends number> = number extends
  | Left
  | Right
  ? number
  : IsNegative<Left> extends IsNegative<Right>
    ? IsNegative<Left> extends true
      ? Negate<AddPositive<AbsoluteNumber<Left>, AbsoluteNumber<Right>>>
      : AddPositive<AbsoluteNumber<Left>, AbsoluteNumber<Right>>
    : ComparePositive<
          AbsoluteNumber<Left>,
          AbsoluteNumber<Right>
        > extends "equal"
      ? 0
      : ComparePositive<
            AbsoluteNumber<Left>,
            AbsoluteNumber<Right>
          > extends "greater"
        ? IsNegative<Left> extends true
          ? Negate<
              SubtractPositive<AbsoluteNumber<Left>, AbsoluteNumber<Right>>
            >
          : SubtractPositive<AbsoluteNumber<Left>, AbsoluteNumber<Right>>
        : IsNegative<Right> extends true
          ? Negate<
              SubtractPositive<AbsoluteNumber<Right>, AbsoluteNumber<Left>>
            >
          : SubtractPositive<AbsoluteNumber<Right>, AbsoluteNumber<Left>>;
type MultiplyByThree<Count extends number> = AddSigned<
  Count,
  AddSigned<Count, Count>
>;
type CharRank<Character extends string> = Character extends ","
  ? 0
  : Character extends "-"
    ? 1
    : Character extends "0"
      ? 2
      : Character extends "1"
        ? 3
        : Character extends "2"
          ? 4
          : Character extends "3"
            ? 5
            : Character extends "4"
              ? 6
              : Character extends "5"
                ? 7
                : Character extends "6"
                  ? 8
                  : Character extends "7"
                    ? 9
                    : Character extends "8"
                      ? 10
                      : Character extends "9"
                        ? 11
                        : never;
type CompareCharacters<
  Left extends string,
  Right extends string,
> = Left extends Right
  ? "equal"
  : ComparePositive<CharRank<Left>, CharRank<Right>> extends "less"
    ? "less"
    : "greater";
type CompareStrings<
  Left extends string,
  Right extends string,
> = Left extends `${infer LeftHead}${infer LeftTail}`
  ? Right extends `${infer RightHead}${infer RightTail}`
    ? LeftHead extends RightHead
      ? CompareStrings<LeftTail, RightTail>
      : CompareCharacters<LeftHead, RightHead>
    : "greater"
  : Right extends ""
    ? "equal"
    : "less";
type SortPair<Left extends string, Right extends string> =
  CompareStrings<Left, Right> extends "greater"
    ? `${Right}::${Left}`
    : `${Left}::${Right}`;
type SquareCornerGeometryKey<
  Space extends { row: number; col: number },
  Corner extends "nw" | "ne" | "se" | "sw",
> = Corner extends "nw"
  ? `${Space["col"]},${Space["row"]}`
  : Corner extends "ne"
    ? `${AddSigned<Space["col"], 1>},${Space["row"]}`
    : Corner extends "se"
      ? `${AddSigned<Space["col"], 1>},${AddSigned<Space["row"], 1>}`
      : `${Space["col"]},${AddSigned<Space["row"], 1>}`;
type SquareEdgeGeometryKey<
  Space extends { row: number; col: number },
  Side extends "north" | "east" | "south" | "west",
> = Side extends "north"
  ? `${Space["col"]},${Space["row"]}::${AddSigned<Space["col"], 1>},${Space["row"]}`
  : Side extends "east"
    ? `${AddSigned<Space["col"], 1>},${Space["row"]}::${AddSigned<
        Space["col"],
        1
      >},${AddSigned<Space["row"], 1>}`
    : Side extends "south"
      ? `${Space["col"]},${AddSigned<Space["row"], 1>}::${AddSigned<
          Space["col"],
          1
        >},${AddSigned<Space["row"], 1>}`
      : `${Space["col"]},${Space["row"]}::${Space["col"]},${AddSigned<
          Space["row"],
          1
        >}`;
type HexCornerGeometryKey<
  Space extends { q: number; r: number },
  Corner extends "ne-e" | "e-se" | "se-sw" | "sw-w" | "w-nw" | "nw-ne",
> = `${AddSigned<
  MultiplyByThree<Space["q"]>,
  Corner extends "ne-e"
    ? 2
    : Corner extends "e-se"
      ? 1
      : Corner extends "se-sw"
        ? -1
        : Corner extends "sw-w"
          ? -2
          : Corner extends "w-nw"
            ? -1
            : 1
>},${AddSigned<
  MultiplyByThree<Negate<AddSigned<Space["q"], Space["r"]>>>,
  Corner extends "ne-e"
    ? -1
    : Corner extends "e-se"
      ? -2
      : Corner extends "se-sw"
        ? -1
        : Corner extends "sw-w"
          ? 1
          : Corner extends "w-nw"
            ? 2
            : 1
>},${AddSigned<
  MultiplyByThree<Space["r"]>,
  Corner extends "ne-e"
    ? -1
    : Corner extends "e-se"
      ? 1
      : Corner extends "se-sw"
        ? 2
        : Corner extends "sw-w"
          ? 1
          : Corner extends "w-nw"
            ? -1
            : -2
>}`;
type HexEdgeGeometryKey<
  Space extends { q: number; r: number },
  Side extends "e" | "ne" | "nw" | "w" | "sw" | "se",
> = SortPair<
  HexCornerGeometryKey<
    Space,
    Side extends "e"
      ? "ne-e"
      : Side extends "ne"
        ? "nw-ne"
        : Side extends "nw"
          ? "w-nw"
          : Side extends "w"
            ? "sw-w"
            : Side extends "sw"
              ? "se-sw"
              : "e-se"
  >,
  HexCornerGeometryKey<
    Space,
    Side extends "e"
      ? "e-se"
      : Side extends "ne"
        ? "ne-e"
        : Side extends "nw"
          ? "nw-ne"
          : Side extends "w"
            ? "w-nw"
            : Side extends "sw"
              ? "sw-w"
              : "se-sw"
  >
>;
type DerivedSquareEdgeIdOf<BoardLike> =
  SquareSpaceOf<BoardLike> extends infer Space
    ? Space extends { row: number; col: number }
      ?
          | `square-edge:${SquareEdgeGeometryKey<Space, "north">}`
          | `square-edge:${SquareEdgeGeometryKey<Space, "east">}`
          | `square-edge:${SquareEdgeGeometryKey<Space, "south">}`
          | `square-edge:${SquareEdgeGeometryKey<Space, "west">}`
      : never
    : never;
type DerivedSquareVertexIdOf<BoardLike> =
  SquareSpaceOf<BoardLike> extends infer Space
    ? Space extends { row: number; col: number }
      ?
          | `square-vertex:${SquareCornerGeometryKey<Space, "nw">}`
          | `square-vertex:${SquareCornerGeometryKey<Space, "ne">}`
          | `square-vertex:${SquareCornerGeometryKey<Space, "se">}`
          | `square-vertex:${SquareCornerGeometryKey<Space, "sw">}`
      : never
    : never;
type DerivedHexEdgeIdOf<BoardLike> =
  HexSpaceOf<BoardLike> extends infer Space
    ? Space extends { q: number; r: number }
      ?
          | `hex-edge:${HexEdgeGeometryKey<Space, "e">}`
          | `hex-edge:${HexEdgeGeometryKey<Space, "ne">}`
          | `hex-edge:${HexEdgeGeometryKey<Space, "nw">}`
          | `hex-edge:${HexEdgeGeometryKey<Space, "w">}`
          | `hex-edge:${HexEdgeGeometryKey<Space, "sw">}`
          | `hex-edge:${HexEdgeGeometryKey<Space, "se">}`
      : never
    : never;
type DerivedHexVertexIdOf<BoardLike> =
  HexSpaceOf<BoardLike> extends infer Space
    ? Space extends { q: number; r: number }
      ?
          | `hex-vertex:${HexCornerGeometryKey<Space, "ne-e">}`
          | `hex-vertex:${HexCornerGeometryKey<Space, "e-se">}`
          | `hex-vertex:${HexCornerGeometryKey<Space, "se-sw">}`
          | `hex-vertex:${HexCornerGeometryKey<Space, "sw-w">}`
          | `hex-vertex:${HexCornerGeometryKey<Space, "w-nw">}`
          | `hex-vertex:${HexCornerGeometryKey<Space, "nw-ne">}`
      : never
    : never;
type DerivedEdgeIdOf<BoardLike> = BoardLike extends { layout: "square" }
  ? DerivedSquareEdgeIdOf<BoardLike>
  : BoardLike extends { layout: "hex" }
    ? DerivedHexEdgeIdOf<BoardLike>
    : never;
type DerivedVertexIdOf<BoardLike> = BoardLike extends { layout: "square" }
  ? DerivedSquareVertexIdOf<BoardLike>
  : BoardLike extends { layout: "hex" }
    ? DerivedHexVertexIdOf<BoardLike>
    : never;

type SetupOptionChoiceId<Option> = IdsOf<
  Option extends { choices?: infer Choices } ? Choices : never
>;
type SetupOptionOf<Manifest extends GameTopologyManifest> = ArrayItem<
  NonNullable<Manifest["setupOptions"]>
>;
type SetupOptionChoiceIdFor<
  Manifest extends GameTopologyManifest,
  OptionId extends SetupOptionId<Manifest>,
> = SetupOptionChoiceId<Extract<SetupOptionOf<Manifest>, { id: OptionId }>>;

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
    ref: BoardEdgeRef;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerEdgeHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "edge";
    boardId: CurrentBoardId;
    ref: BoardEdgeRef;
  };
}[PerPlayerBoardId<Manifest>];

type TypedSharedVertexHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in SharedBoardId<Manifest>]: {
    type: "vertex";
    boardId: CurrentBoardId;
    ref: BoardVertexRef;
  };
}[SharedBoardId<Manifest>];

type TypedPerPlayerVertexHomeSpec<Manifest extends GameTopologyManifest> = {
  [CurrentBoardId in PerPlayerBoardId<Manifest>]: {
    type: "vertex";
    boardId: CurrentBoardId;
    ref: BoardVertexRef;
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
      fields?: SchemaValueForObjectSchema<Schema, Manifest, BoardLike>;
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
type EffectiveSchemaForEntry<
  Manifest extends GameTopologyManifest,
  Entry,
  Key extends string,
> = Key extends keyof Entry
  ? Entry[Key]
  : TemplateForBoardEntry<Manifest, Entry> extends infer Template
    ? Key extends keyof Template
      ? Template[Key]
      : undefined
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
        EffectiveSchemaForEntry<Manifest, Entry, "boardFieldsSchema">,
        Manifest,
        BoardLike
      >,
      Entry,
      "spaces",
      TypedFields<
        ArrayItem<
          NonNullable<Entry extends { spaces?: infer Spaces } ? Spaces : never>
        >,
        EffectiveSchemaForEntry<Manifest, Entry, "spaceFieldsSchema">,
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
      EffectiveSchemaForEntry<Manifest, Entry, "relationFieldsSchema">
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
    EffectiveSchemaForEntry<Manifest, Entry, "containerFieldsSchema">
  >
>;
type TypedHexBoardLike<
  Entry,
  Manifest extends GameTopologyManifest,
  BoardLike,
> = TypedOptionalArray<
  TypedOptionalArray<
    TypedOptionalArray<
      TypedFields<
        Omit<Entry, "spaces" | "edges" | "vertices">,
        EffectiveSchemaForEntry<Manifest, Entry, "boardFieldsSchema">,
        Manifest,
        BoardLike
      >,
      Entry,
      "spaces",
      TypedFields<
        ArrayItem<
          NonNullable<Entry extends { spaces?: infer Spaces } ? Spaces : never>
        >,
        EffectiveSchemaForEntry<Manifest, Entry, "spaceFieldsSchema">,
        Manifest,
        BoardLike
      >
    >,
    Entry,
    "edges",
    TypedFields<
      ArrayItem<
        NonNullable<Entry extends { edges?: infer Edges } ? Edges : never>
      >,
      EffectiveSchemaForEntry<Manifest, Entry, "edgeFieldsSchema">,
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
    EffectiveSchemaForEntry<Manifest, Entry, "vertexFieldsSchema">,
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
            EffectiveSchemaForEntry<Manifest, Entry, "boardFieldsSchema">,
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
            EffectiveSchemaForEntry<Manifest, Entry, "spaceFieldsSchema">,
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
          EffectiveSchemaForEntry<Manifest, Entry, "relationFieldsSchema">
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
        EffectiveSchemaForEntry<Manifest, Entry, "containerFieldsSchema">
      >
    >,
    Entry,
    "edges",
    TypedFields<
      ArrayItem<
        NonNullable<Entry extends { edges?: infer Edges } ? Edges : never>
      >,
      EffectiveSchemaForEntry<Manifest, Entry, "edgeFieldsSchema">,
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
    EffectiveSchemaForEntry<Manifest, Entry, "vertexFieldsSchema">,
    Manifest,
    BoardLike
  >
>;
type TypedBoardLikeEntry<
  Entry,
  Manifest extends GameTopologyManifest,
> = Entry extends { layout: "generic" }
  ? TypedGenericBoardLike<Entry, Manifest, BoardLikeForEntry<Manifest, Entry>>
  : Entry extends { layout: "hex" }
    ? TypedHexBoardLike<Entry, Manifest, BoardLikeForEntry<Manifest, Entry>>
    : Entry extends { layout: "square" }
      ? TypedSquareBoardLike<
          Entry,
          Manifest,
          BoardLikeForEntry<Manifest, Entry>
        >
      : Entry;

type TypedCard<
  Card,
  Manifest extends GameTopologyManifest,
  CardSchema,
> = Card extends { type: infer CardType extends string }
  ? Omit<TypedVisibility<Card, Manifest>, "home" | "properties"> & {
      home?: TypedComponentHomeSpec<Manifest>;
      properties: CardSchema extends {
        variants: infer Variants extends Record<string, unknown>;
        shared?: infer Shared;
      }
        ? CardType extends keyof Variants
          ? SchemaValueForObjectSchema<
              MergeSharedProperties<Variants[CardType], Shared>,
              Manifest
            >
          : never
        : SchemaValueForObjectSchema<CardSchema, Manifest>;
    }
  : Card;

type TypedCardSet<
  CardSet,
  Manifest extends GameTopologyManifest,
> = CardSet extends {
  type: "manual";
  cardSchema: infer CardSchema;
  cards: infer Cards extends readonly unknown[];
}
  ? Omit<CardSet, "cards"> & {
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
        fields?: SchemaValueForObjectSchema<
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
        fields?: SchemaValueForObjectSchema<
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

type TypedSetupOptionValues<Manifest extends GameTopologyManifest> = Partial<{
  [OptionId in SetupOptionId<Manifest>]: SetupOptionChoiceIdFor<
    Manifest,
    OptionId
  >;
}>;

type TypedSetupProfile<
  Profile,
  Manifest extends GameTopologyManifest,
> = Profile extends object
  ? Omit<Profile, "optionValues"> & {
      optionValues?: TypedSetupOptionValues<Manifest>;
    }
  : Profile;

export type TypedTopologyManifest<Manifest extends GameTopologyManifest> = Omit<
  Manifest,
  | "cardSets"
  | "zones"
  | "boardTemplates"
  | "boards"
  | "pieceSeeds"
  | "dieSeeds"
  | "setupProfiles"
> & {
  cardSets: ReadonlyArray<
    TypedCardSet<ArrayItem<Manifest["cardSets"]>, Manifest>
  >;
  zones?: Manifest["zones"] extends readonly unknown[]
    ? ReadonlyArray<TypedZone<ArrayItem<Manifest["zones"]>, Manifest>>
    : Manifest["zones"];
  boardTemplates?: Manifest["boardTemplates"] extends readonly unknown[]
    ? ReadonlyArray<
        TypedBoardLikeEntry<ArrayItem<Manifest["boardTemplates"]>, Manifest>
      >
    : Manifest["boardTemplates"];
  boards: Manifest["boards"] extends readonly unknown[]
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
  setupProfiles?: Manifest["setupProfiles"] extends readonly unknown[]
    ? ReadonlyArray<
        TypedSetupProfile<ArrayItem<Manifest["setupProfiles"]>, Manifest>
      >
    : Manifest["setupProfiles"];
};

type TopologyManifestValidation<Manifest> =
  Manifest extends GameTopologyManifest
    ? TypedTopologyManifest<Manifest>
    : GameTopologyManifest;

type DefinedTopologyManifest<Manifest> = Manifest extends GameTopologyManifest
  ? Manifest
  : GameTopologyManifest;

export function defineTopologyManifest<const Manifest>(
  manifest: Manifest & TopologyManifestValidation<NoInfer<Manifest>>,
): DefinedTopologyManifest<Manifest> {
  return manifest as DefinedTopologyManifest<Manifest>;
}
