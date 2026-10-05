import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { BoardTopologyOf } from "./topology.js";
import type { BoundBoardQueries } from "../table/board-queries";
import type {
  CardCollection,
  ViewCardOfTable,
} from "../../shared/domain/cards.js";
import type {
  ZoneIdOfTable,
  ZoneComponentsOfTable,
  ZoneHostsOfTable,
  TileIdOfTable,
  ZoneScopeOfTable,
  BoardIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  PlayerIdOfTable,
  ResourceAmountsOfTable,
  ResourceBalancesOfTable,
  ResourceIdOfTable,
  SpaceIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "./extract";
import type { RuntimeComponentLocation, RuntimeQueryTable } from "./table";

type ScopedZoneHostArgs<
  Table,
  Z extends ZoneIdOfTable<Table>,
  Scope,
> = Scope extends "shared"
  ? [hostId?: "table"]
  : [hostId: ZoneHostsOfTable<Table, Z>];
type ZoneHostArgs<Table, Z extends ZoneIdOfTable<Table>> = ScopedZoneHostArgs<
  Table,
  Z,
  ZoneScopeOfTable<Table, Z>
>;

type BoardRecord<
  Table extends RuntimeQueryTable,
  BoardId extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = BoardTopologyOf<Table, Definitions, BoardId>;

type TiledBoardRecord<
  Table extends RuntimeQueryTable,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = Extract<
  BoardRecord<Table, BoardId, Definitions>,
  { layout: "hex" | "square" }
>;

type CardsByIdOfTable<
  Table extends RuntimeQueryTable,
  CardIds extends readonly CardIdOfTable<Table>[],
> = Readonly<{
  [Id in CardIds[number]]: ViewCardOfTable<Table, Id>;
}>;

type CardCollectionOfTable<
  Table extends RuntimeQueryTable,
  Z extends ZoneIdOfTable<Table>,
> = CardCollection<
  Extract<ZoneComponentsOfTable<Table, Z>, CardIdOfTable<Table>>,
  ViewCardOfTable<
    Table,
    Extract<ZoneComponentsOfTable<Table, Z>, CardIdOfTable<Table>>
  >
>;

export type ComponentLocationOfTable<
  Table,
  ComponentId extends ComponentIdOfTable<Table>,
> = Table extends {
  componentLocations: infer ComponentLocations extends Record<string, unknown>;
}
  ? ComponentLocations[ComponentId]
  : never;

export type ComponentDataOfTable<
  Table,
  ComponentId extends ComponentIdOfTable<Table>,
> = Table extends {
  cards: infer Cards extends Record<string, unknown>;
  pieces: infer Pieces extends Record<string, unknown>;
  dice: infer Dice extends Record<string, unknown>;
  tiles: infer Tiles extends Record<string, unknown>;
}
  ? | (ComponentId extends keyof Cards ? Cards[ComponentId] : never)
    | (ComponentId extends keyof Pieces ? Pieces[ComponentId] : never)
    | (ComponentId extends keyof Dice ? Dice[ComponentId] : never)
    | (ComponentId extends keyof Tiles ? Tiles[ComponentId] : never)
  : never;

export type ComponentLocationByTypeOfTable<
  Table,
  ComponentId extends ComponentIdOfTable<Table>,
  Type extends RuntimeComponentLocation["type"],
> = Extract<ComponentLocationOfTable<Table, ComponentId>, { type: Type }>;

export type ResolvedZoneLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<Table>,
> =
  ComponentLocationByTypeOfTable<
    Table,
    ComponentId,
    "InZone"
  > extends infer Location
    ? Location extends {
        type: "InZone";
        zoneId: infer ZoneId extends string;
      }
      ? {
          componentId: ComponentId;
          zoneId: ZoneId;
          hostId: string;
          location: Location;
        }
      : never
    : never;

export type ResolvedSpaceLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in BoardIdOfTable<Table>]: {
    [SpaceId in SpaceIdOfTable<Table, BoardId, Definitions>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: BoardRecord<Table, BoardId, Definitions>;
      spaceId: SpaceId;
      space: BoardTopologyOf<Table, Definitions, BoardId>["spaces"][SpaceId];
      location: ComponentLocationByTypeOfTable<
        Table,
        ComponentId,
        "OnSpace"
      > & {
        boardId: BoardId;
        spaceId: SpaceId;
      };
    };
  }[SpaceIdOfTable<Table, BoardId, Definitions>];
}[BoardIdOfTable<Table>];

export type ResolvedEdgeLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in TiledBoardIdOfTable<Table, Definitions>]: {
    [EdgeId in TiledEdgeIdOfTable<Table, BoardId, Definitions>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: TiledBoardRecord<Table, BoardId, Definitions>;
      edgeId: EdgeId;
      edge: Extract<
        BoardTopologyOf<Table, Definitions, BoardId>,
        { layout: "hex" | "square" }
      >["edges"][number];
      location: ComponentLocationByTypeOfTable<Table, ComponentId, "OnEdge"> & {
        boardId: BoardId;
        edgeId: EdgeId;
      };
    };
  }[TiledEdgeIdOfTable<Table, BoardId, Definitions>];
}[TiledBoardIdOfTable<Table, Definitions>];

export type ResolvedVertexLocation<
  Table extends RuntimeQueryTable,
  ComponentId extends ComponentIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in TiledBoardIdOfTable<Table, Definitions>]: {
    [VertexId in TiledVertexIdOfTable<Table, BoardId, Definitions>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: TiledBoardRecord<Table, BoardId, Definitions>;
      vertexId: VertexId;
      vertex: Extract<
        BoardTopologyOf<Table, Definitions, BoardId>,
        { layout: "hex" | "square" }
      >["vertices"][number];
      location: ComponentLocationByTypeOfTable<
        Table,
        ComponentId,
        "OnVertex"
      > & {
        boardId: BoardId;
        vertexId: VertexId;
      };
    };
  }[TiledVertexIdOfTable<Table, BoardId, Definitions>];
}[TiledBoardIdOfTable<Table, Definitions>];

export type TableQueries<
  Table extends RuntimeQueryTable,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  board<BoardId extends BoardIdOfTable<Table>>(
    boardId: BoardId,
  ): BoundBoardQueries<
    BoardTopologyOf<Table, Definitions, BoardId>,
    ComponentIdOfTable<Table>
  >;
  tile: <Id extends TileIdOfTable<Table>>(tileId: Id) => Table["tiles"][Id];
  zone: {
    <Z extends ZoneIdOfTable<Table>>(
      zoneId: Z,
      ...host: ZoneHostArgs<Table, Z>
    ): readonly ZoneComponentsOfTable<Table, Z>[];
    cards<Z extends ZoneIdOfTable<Table>>(
      zoneId: Z,
      ...host: ZoneHostArgs<Table, Z>
    ): CardCollectionOfTable<Table, Z>;
  };
  zones<Z extends ZoneIdOfTable<Table>>(
    zoneId: Z,
  ): Readonly<
    Record<
      ZoneHostsOfTable<Table, Z>,
      readonly ZoneComponentsOfTable<Table, Z>[]
    >
  >;
  card: {
    get: <CardId extends CardIdOfTable<Table>>(
      cardId: CardId,
    ) => ViewCardOfTable<Table, CardId>;
    byIds: <CardIds extends readonly CardIdOfTable<Table>[]>(
      cardIds: CardIds,
    ) => CardsByIdOfTable<Table, CardIds>;
    owner: <CardId extends CardIdOfTable<Table>>(
      cardId: CardId,
    ) => Table["ownerOfCard"][CardId];
    visibility: <CardId extends CardIdOfTable<Table>>(
      cardId: CardId,
    ) => Table["visibility"][CardId];
  };
  player: {
    /** Seating order from the manifest / setup profile. */
    order: () => Table["playerOrder"];
    /**
     * Next player id in seating order after `playerId`, wrapping around to
     * the first seat. Returns `null` when `playerId` is unknown or the
     * order is empty. Convenient for "whose turn is next" logic.
     */
    nextInOrder: (
      playerId: PlayerIdOfTable<Table>,
    ) => PlayerIdOfTable<Table> | null;
    /** All resource balances for a player, as the manifest-typed record. */
    resources: <PlayerId extends PlayerIdOfTable<Table>>(
      playerId: PlayerId,
    ) => ResourceBalancesOfTable<Table>;
    /** Balance of a single resource; returns `0` when unset. */
    resource: (
      playerId: PlayerIdOfTable<Table>,
      resourceId: ResourceIdOfTable<Table>,
    ) => number;
    /**
     * Sum of every resource amount held by a player (e.g. "total cards in
     * hand" checks). Returns `0` for unknown players or empty balances.
     */
    resourceTotal: (playerId: PlayerIdOfTable<Table>) => number;
    /** `true` when the player can pay every non-zero amount in `amounts`. */
    canAfford: (
      playerId: PlayerIdOfTable<Table>,
      amounts: ResourceAmountsOfTable<Table>,
    ) => boolean;
    /** Shortfall per resource when the player cannot afford `amounts`. */
    missingResources: (
      playerId: PlayerIdOfTable<Table>,
      amounts: ResourceAmountsOfTable<Table>,
    ) => Partial<Record<ResourceIdOfTable<Table>, number>>;
  };
  component: {
    data: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ComponentDataOfTable<Table, ComponentId>;
    location: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ComponentLocationOfTable<Table, ComponentId>;
    zone: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedZoneLocation<Table, ComponentId> | null;
    space: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedSpaceLocation<Table, ComponentId, Definitions> | null;
    edge: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedEdgeLocation<Table, ComponentId, Definitions> | null;
    vertex: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedVertexLocation<Table, ComponentId, Definitions> | null;
  };
};

export type TableQueriesOfState<
  State extends { table: RuntimeQueryTable },
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TableQueries<TableOfState<State>, Definitions>;
