import type {
  BoardTopology,
  BoardEdge,
  BoardVertex,
  HexSpace,
  SquareSpace,
} from "../../shared/board-topology.js";
import type {
  BoardDefinition,
  TopologyDefinitions,
} from "../../shared/domain/topology-definitions.js";
import type { TileSpaceId } from "../../shared/domain/tile-space.js";
import type {
  BoardEdgeId,
  BoardVertexId,
} from "../../shared/domain/board-identities.js";

type StringKey<T> = Extract<keyof T, string>;
type BoardMap<Table> = Table extends { boards: infer Boards } ? Boards : never;
export type BoardDefinitionOf<
  Table,
  Definitions extends TopologyDefinitions,
  Id extends StringKey<BoardMap<Table>>,
> = BoardMap<Table>[Id] extends { baseId: infer Base extends string }
  ? Base extends keyof Definitions["boardDefinitions"]
    ? Definitions["boardDefinitions"][Base]
    : string extends Base
      ? Definitions["boardDefinitions"][StringKey<
          Definitions["boardDefinitions"]
        >]
      : never
  : never;
type TileMap<Table> = Table extends { tiles: infer Tiles } ? Tiles : never;
type DefinitionOfTile<
  Table,
  Definitions extends TopologyDefinitions,
  Id extends StringKey<TileMap<Table>>,
> = TileMap<Table>[Id] extends {
  tileTypeId: infer Type extends keyof Definitions["tileDefinitions"];
}
  ? Definitions["tileDefinitions"][Type]
  : never;
type CellOf<Tile> = Tile extends { cells: readonly (infer Cell)[] }
  ? Cell
  : never;
type Immutable<T> =
  import("../../shared/board-topology-schema.js").ReadonlyTopology<T>;
type FieldOf<T> = T extends { fields: infer Fields }
  ? Immutable<Fields>
  : never;
type MetadataOf<T> = Immutable<
  Pick<T, Extract<keyof T, "name" | "typeId" | "scope" | "orientation">>
>;
type TypeOf<T> = T extends { typeId?: infer Id } ? Extract<Id, string> : never;
type TileCell<Table, Definitions extends TopologyDefinitions, Layout> = {
  [Id in StringKey<TileMap<Table>>]: DefinitionOfTile<
    Table,
    Definitions,
    Id
  > extends infer Tile
    ? Tile extends { layout: Layout }
      ? CellOf<Tile> extends infer Cell
        ? Cell extends { id: infer CellId extends string }
          ? Omit<
              Layout extends "hex" ? HexSpace : SquareSpace,
              "id" | "tileId" | "localCellId" | "fields" | "typeId" | "name"
            > &
              MetadataOf<Cell> & {
                readonly id: TileSpaceId<Id, CellId>;
                readonly tileId: Id;
                readonly localCellId: CellId;
                readonly fields: FieldOf<Cell>;
              }
          : never
        : never
      : never
    : never;
}[StringKey<TileMap<Table>>];
type TileAnnotation<
  Definitions extends TopologyDefinitions,
  Layout,
  Kind extends "edges" | "vertices",
> = Definitions["tileDefinitions"][StringKey<
  Definitions["tileDefinitions"]
>] extends infer Tile
  ? Tile extends { layout: Layout }
    ? Tile extends Record<Kind, readonly (infer Annotation)[]>
      ? Annotation
      : never
    : never
  : never;
type FieldKeys<Fields> = Fields extends unknown ? keyof Fields : never;
type FieldValue<Fields, Key extends PropertyKey> = Fields extends unknown
  ? Key extends keyof Fields
    ? Fields[Key]
    : never
  : never;
type PossibleFields<Fields> = {
  readonly [Key in FieldKeys<Fields>]?: FieldValue<Fields, Key>;
};
type PreciseElements<
  Definitions extends TopologyDefinitions,
  Layout,
  Id extends string,
  Kind extends "edges" | "vertices",
> = Omit<
  Kind extends "edges" ? BoardEdge : BoardVertex,
  "id" | "fields" | "typeId"
> & {
  readonly id: Kind extends "edges" ? BoardEdgeId<Id> : BoardVertexId<Id>;
  readonly fields: PossibleFields<
    FieldOf<TileAnnotation<Definitions, Layout, Kind>>
  >;
  readonly typeId?: TypeOf<TileAnnotation<Definitions, Layout, Kind>>;
};
type SpacesOf<
  Table,
  Definitions extends TopologyDefinitions,
  Definition,
> = Definition extends { layout: "generic"; spaces: infer Spaces }
  ? Spaces
  : Definition extends { layout: infer Layout }
    ? Readonly<
        Record<
          Extract<TileCell<Table, Definitions, Layout>, { id: string }>["id"],
          TileCell<Table, Definitions, Layout>
        >
      >
    : never;
/** Geometry metadata comes from immutable declarations, while runtime IDs come from admitted inventory. */
type PreciseBoardTopologyOf<
  Table,
  Definitions extends TopologyDefinitions,
  Id extends StringKey<BoardMap<Table>>,
> =
  BoardDefinitionOf<Table, Definitions, Id> extends infer Definition
    ? Definition extends BoardDefinition
      ? {
          readonly id: Id;
          readonly baseId: BoardMap<Table>[Id] extends { baseId: infer Base }
            ? Base
            : never;
          readonly layout: Definition["layout"];
          readonly name: Definition["name"];
          readonly scope: Definition["scope"];
          readonly playerId?: string;
          readonly fields: Immutable<Definition["fields"]>;
          readonly relations: BoardMap<Table>[Id] extends {
            relations: infer Relations;
          }
            ? Immutable<Relations>
            : never;
          readonly spaces: SpacesOf<Table, Definitions, Definition>;
        } & MetadataOf<Definition> &
          (Definition extends { layout: "generic" }
            ? unknown
            : {
                readonly edges: readonly PreciseElements<
                  Definitions,
                  Definition["layout"],
                  Id,
                  "edges"
                >[];
                readonly vertices: readonly PreciseElements<
                  Definitions,
                  Definition["layout"],
                  Id,
                  "vertices"
                >[];
              })
      : never
    : never;

/** Erased definitions support raw runtime consumers; finite authored maps retain exact metadata and keys. */
export type BoardTopologyOf<
  Table,
  Definitions extends TopologyDefinitions,
  Id extends StringKey<BoardMap<Table>>,
> =
  string extends StringKey<Definitions["boardDefinitions"]>
    ? BoardTopology
    : PreciseBoardTopologyOf<Table, Definitions, Id>;
