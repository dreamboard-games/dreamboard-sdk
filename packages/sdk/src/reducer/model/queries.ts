import type {
  CardCollection,
  ViewCard,
  ViewSlotOccupant,
} from "@dreamboard-games/sdk-types";
import type {
  BoardContainerIdOfTable,
  BoardIdOfTable,
  BoardTypeIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  DeckCardsOfTable,
  DeckIdOfTable,
  HandCardsOfTable,
  HandIdOfTable,
  HexBoardIdOfTable,
  HexSpaceIdOfTable,
  PlayerIdOfTable,
  ResourceAmountsOfTable,
  ResourceBalancesOfTable,
  ResourceIdOfTable,
  SquareBoardIdOfTable,
  SquareSpaceIdOfTable,
  SpaceIdOfTable,
  RelationTypeIdOfTable,
  SpaceTypeIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledEdgeStateOfTable,
  TiledEdgeTypeIdOfTable,
  TiledVertexIdOfTable,
  TiledVertexStateOfTable,
  TiledVertexTypeIdOfTable,
} from "./extract";
import type {
  RuntimeComponentLocation,
  RuntimeSlotHostRef,
  RuntimeTableRecord,
} from "./table";

type BoardRecord<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
> = Table["boards"]["byId"][BoardId];

type TiledBoardRecord<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<Table>,
> = Extract<BoardRecord<Table, BoardId>, { layout: "hex" | "square" }>;

type ViewCardOfTable<
  Table extends RuntimeTableRecord,
  CardId extends CardIdOfTable<Table>,
> =
  CardId extends CardIdOfTable<Table>
    ? ViewCard<
        CardId & string,
        Table["cards"][CardId]["cardType"] & string,
        Extract<Table["cards"][CardId]["properties"], Record<string, unknown>>
      >
    : never;

type CardsByIdOfTable<
  Table extends RuntimeTableRecord,
  CardIds extends readonly CardIdOfTable<Table>[],
> = Readonly<{
  [Id in CardIds[number]]: ViewCardOfTable<Table, Id> | undefined;
}>;

type DeckCardsForZone<
  Table extends RuntimeTableRecord,
  ZoneId extends DeckIdOfTable<Table>,
> = ZoneId extends infer Each extends DeckIdOfTable<Table>
  ? DeckCardsOfTable<Table, Each>
  : never;

type HandCardsForZone<
  Table extends RuntimeTableRecord,
  ZoneId extends HandIdOfTable<Table>,
> = ZoneId extends infer Each extends HandIdOfTable<Table>
  ? HandCardsOfTable<Table, Each>
  : never;

type CardCollectionOfTable<Table extends RuntimeTableRecord> = CardCollection<
  CardIdOfTable<Table> & string,
  ViewCardOfTable<Table, CardIdOfTable<Table>>
>;

type SlotOccupantOfTable<Table extends RuntimeTableRecord> = ViewSlotOccupant<
  ComponentIdOfTable<Table> & string,
  PlayerIdOfTable<Table> & string,
  string,
  Record<string, unknown>
>;

type SlotOccupantsOfTable<Table extends RuntimeTableRecord> = ReadonlyArray<
  SlotOccupantOfTable<Table>
>;

type SlotOccupantsBySlotIdOfTable<Table extends RuntimeTableRecord> = Readonly<
  Record<string, SlotOccupantsOfTable<Table>>
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
}
  ? ComponentId extends keyof Cards
    ? Cards[ComponentId]
    : ComponentId extends keyof Pieces
      ? Pieces[ComponentId]
      : ComponentId extends keyof Dice
        ? Dice[ComponentId]
        : never
  : never;

export type ComponentLocationByTypeOfTable<
  Table,
  ComponentId extends ComponentIdOfTable<Table>,
  Type extends RuntimeComponentLocation["type"],
> = Extract<ComponentLocationOfTable<Table, ComponentId>, { type: Type }>;

export type ResolvedDeckLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [DeckId in DeckIdOfTable<Table>]: {
    componentId: ComponentId;
    deckId: DeckId;
    cards: DeckCardsOfTable<Table, DeckId>;
    location: ComponentLocationByTypeOfTable<Table, ComponentId, "InDeck"> & {
      deckId: DeckId;
    };
  };
}[DeckIdOfTable<Table>];

export type ResolvedHandLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [HandId in HandIdOfTable<Table>]: {
    [PlayerId in PlayerIdOfTable<Table>]: {
      componentId: ComponentId;
      handId: HandId;
      playerId: PlayerId;
      cards: HandCardsOfTable<Table, HandId>;
      location: ComponentLocationByTypeOfTable<Table, ComponentId, "InHand"> & {
        handId: HandId;
        playerId: PlayerId;
      };
    };
  }[PlayerIdOfTable<Table>];
}[HandIdOfTable<Table>];

export type ResolvedZoneLocation<
  Table extends RuntimeTableRecord,
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
          location: Location;
        }
      : never
    : never;

export type ResolvedSpaceLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [BoardId in BoardIdOfTable<Table>]: {
    [SpaceId in SpaceIdOfTable<Table, BoardId>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: BoardRecord<Table, BoardId>;
      spaceId: SpaceId;
      space: Table["boards"]["byId"][BoardId]["spaces"][SpaceId];
      location: ComponentLocationByTypeOfTable<
        Table,
        ComponentId,
        "OnSpace"
      > & {
        boardId: BoardId;
        spaceId: SpaceId;
      };
    };
  }[SpaceIdOfTable<Table, BoardId>];
}[BoardIdOfTable<Table>];

export type ResolvedContainerLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [BoardId in BoardIdOfTable<Table>]: {
    [ContainerId in BoardContainerIdOfTable<Table, BoardId>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: BoardRecord<Table, BoardId>;
      containerId: ContainerId;
      container: Table["boards"]["byId"][BoardId]["containers"][ContainerId];
      location: ComponentLocationByTypeOfTable<
        Table,
        ComponentId,
        "InContainer"
      > & {
        boardId: BoardId;
        containerId: ContainerId;
      };
    };
  }[BoardContainerIdOfTable<Table, BoardId>];
}[BoardIdOfTable<Table>];

export type ResolvedEdgeLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [BoardId in TiledBoardIdOfTable<Table>]: {
    [EdgeId in TiledEdgeIdOfTable<Table, BoardId>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: TiledBoardRecord<Table, BoardId>;
      edgeId: EdgeId;
      edge: Extract<
        Table["boards"]["byId"][BoardId],
        { layout: "hex" | "square" }
      >["edges"][number];
      location: ComponentLocationByTypeOfTable<Table, ComponentId, "OnEdge"> & {
        boardId: BoardId;
        edgeId: EdgeId;
      };
    };
  }[TiledEdgeIdOfTable<Table, BoardId>];
}[TiledBoardIdOfTable<Table>];

export type ResolvedVertexLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> = {
  [BoardId in TiledBoardIdOfTable<Table>]: {
    [VertexId in TiledVertexIdOfTable<Table, BoardId>]: {
      componentId: ComponentId;
      boardId: BoardId;
      board: TiledBoardRecord<Table, BoardId>;
      vertexId: VertexId;
      vertex: Extract<
        Table["boards"]["byId"][BoardId],
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
  }[TiledVertexIdOfTable<Table, BoardId>];
}[TiledBoardIdOfTable<Table>];

export type ResolvedSlotLocation<
  Table extends RuntimeTableRecord,
  ComponentId extends ComponentIdOfTable<Table>,
> =
  ComponentLocationByTypeOfTable<
    Table,
    ComponentId,
    "InSlot"
  > extends infer Location
    ? Location extends {
        type: "InSlot";
        host: infer Host extends RuntimeSlotHostRef;
        slotId: infer SlotId extends string;
      }
      ? {
          componentId: ComponentId;
          host: Host;
          slotId: SlotId;
          location: Location;
        }
      : never
    : never;

export type TableQueries<Table extends RuntimeTableRecord> = {
  board: {
    get: <BoardId extends BoardIdOfTable<Table>>(
      boardId: BoardId,
    ) => BoardRecord<Table, BoardId>;
    hex: <BoardId extends HexBoardIdOfTable<Table>>(
      boardId: BoardId,
    ) => Extract<BoardRecord<Table, BoardId>, { layout: "hex" }>;
    square: <BoardId extends SquareBoardIdOfTable<Table>>(
      boardId: BoardId,
    ) => Extract<BoardRecord<Table, BoardId>, { layout: "square" }>;
    tiled: <BoardId extends TiledBoardIdOfTable<Table>>(
      boardId: BoardId,
    ) => TiledBoardRecord<Table, BoardId>;
    space: <
      BoardId extends BoardIdOfTable<Table>,
      SpaceId extends SpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
    ) => Table["boards"]["byId"][BoardId]["spaces"][SpaceId];
    hexSpace: <
      BoardId extends HexBoardIdOfTable<Table>,
      SpaceId extends HexSpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
    ) => Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "hex" }
    >["spaces"][SpaceId];
    squareSpace: <
      BoardId extends SquareBoardIdOfTable<Table>,
      SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
    ) => Extract<
      Table["boards"]["byId"][BoardId],
      { layout: "square" }
    >["spaces"][SpaceId];
    container: <
      BoardId extends BoardIdOfTable<Table>,
      ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      containerId: ContainerId,
    ) => Table["boards"]["byId"][BoardId]["containers"][ContainerId];
    edge: <
      BoardId extends TiledBoardIdOfTable<Table>,
      EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      edgeId: EdgeId,
    ) => TiledEdgeStateOfTable<Table, BoardId, EdgeId>;
    vertex: <
      BoardId extends TiledBoardIdOfTable<Table>,
      VertexId extends TiledVertexIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      vertexId: VertexId,
    ) => TiledVertexStateOfTable<Table, BoardId, VertexId>;
    byType: <TypeId extends BoardTypeIdOfTable<Table>>(
      typeId: TypeId,
    ) => BoardIdOfTable<Table>[];
    spacesByType: <
      BoardId extends BoardIdOfTable<Table>,
      TypeId extends SpaceTypeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      typeId: TypeId,
    ) => SpaceIdOfTable<Table, BoardId>[];
    edgesByType: <
      BoardId extends TiledBoardIdOfTable<Table>,
      TypeId extends TiledEdgeTypeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      typeId: TypeId,
    ) => TiledEdgeIdOfTable<Table, BoardId>[];
    verticesByType: <
      BoardId extends TiledBoardIdOfTable<Table>,
      TypeId extends TiledVertexTypeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      typeId: TypeId,
    ) => TiledVertexIdOfTable<Table, BoardId>[];
    adjacentSpaces: <
      BoardId extends BoardIdOfTable<Table>,
      SpaceId extends SpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
    ) => SpaceIdOfTable<Table, BoardId>[];
    relatedSpaces: <
      BoardId extends BoardIdOfTable<Table>,
      SpaceId extends SpaceIdOfTable<Table, BoardId>,
      TypeId extends RelationTypeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
      relationTypeId: TypeId,
    ) => SpaceIdOfTable<Table, BoardId>[];
    incidentEdges: <
      BoardId extends TiledBoardIdOfTable<Table>,
      VertexId extends TiledVertexIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      vertexId: VertexId,
    ) => TiledEdgeIdOfTable<Table, BoardId>[];
    incidentVertices: <
      BoardId extends TiledBoardIdOfTable<Table>,
      EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      edgeId: EdgeId,
    ) => TiledVertexIdOfTable<Table, BoardId>[];
    spaceEdges: <BoardId extends TiledBoardIdOfTable<Table>>(
      boardId: BoardId,
      spaceId: SpaceIdOfTable<Table, BoardId>,
    ) => TiledEdgeIdOfTable<Table, BoardId>[];
    spaceVertices: <BoardId extends TiledBoardIdOfTable<Table>>(
      boardId: BoardId,
      spaceId: SpaceIdOfTable<Table, BoardId>,
    ) => TiledVertexIdOfTable<Table, BoardId>[];
    spaceDistance: <
      BoardId extends BoardIdOfTable<Table>,
      SpaceId extends SpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      fromSpaceId: SpaceId,
      toSpaceId: SpaceId,
    ) => number;
    hexSpaceAt: <BoardId extends HexBoardIdOfTable<Table>>(
      boardId: BoardId,
      q: number,
      r: number,
    ) =>
      | Extract<
          Table["boards"]["byId"][BoardId],
          { layout: "hex" }
        >["spaces"][HexSpaceIdOfTable<Table, BoardId>]
      | undefined;
    squareSpaceAt: <BoardId extends SquareBoardIdOfTable<Table>>(
      boardId: BoardId,
      row: number,
      col: number,
    ) =>
      | Extract<
          Table["boards"]["byId"][BoardId],
          { layout: "square" }
        >["spaces"][SquareSpaceIdOfTable<Table, BoardId>]
      | undefined;
    squareNeighbors: <
      BoardId extends SquareBoardIdOfTable<Table>,
      SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
      options?: { mode?: "orthogonal" | "diagonal" | "all" },
    ) => SquareSpaceIdOfTable<Table, BoardId>[];
    squareDistance: <
      BoardId extends SquareBoardIdOfTable<Table>,
      SpaceId extends SquareSpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      fromSpaceId: SpaceId,
      toSpaceId: SpaceId,
      options?: { metric?: "manhattan" | "chebyshev" },
    ) => number;
    spaceOccupants: <
      BoardId extends BoardIdOfTable<Table>,
      SpaceId extends SpaceIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      spaceId: SpaceId,
    ) => ComponentIdOfTable<Table>[];
    containerOccupants: <
      BoardId extends BoardIdOfTable<Table>,
      ContainerId extends BoardContainerIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      containerId: ContainerId,
    ) => ComponentIdOfTable<Table>[];
    edgeOccupants: <
      BoardId extends TiledBoardIdOfTable<Table>,
      EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      edgeId: EdgeId,
    ) => ComponentIdOfTable<Table>[];
    vertexOccupants: <
      BoardId extends TiledBoardIdOfTable<Table>,
      VertexId extends TiledVertexIdOfTable<Table, BoardId>,
    >(
      boardId: BoardId,
      vertexId: VertexId,
    ) => ComponentIdOfTable<Table>[];
  };
  zone: {
    sharedCards: <ZoneId extends DeckIdOfTable<Table>>(
      zoneId: ZoneId,
    ) => DeckCardsForZone<Table, ZoneId>;
    sharedCardCollection: <ZoneId extends DeckIdOfTable<Table>>(
      zoneId: ZoneId,
    ) => CardCollectionOfTable<Table>;
    allSharedCards: () => {
      readonly [Z in DeckIdOfTable<Table>]: DeckCardsOfTable<Table, Z>;
    };
    playerCards: <
      PlayerId extends PlayerIdOfTable<Table>,
      ZoneId extends HandIdOfTable<Table>,
    >(
      playerId: PlayerId,
      zoneId: ZoneId,
    ) => HandCardsForZone<Table, ZoneId>;
    playerCardCollection: <
      PlayerId extends PlayerIdOfTable<Table>,
      ZoneId extends HandIdOfTable<Table>,
    >(
      playerId: PlayerId,
      zoneId: ZoneId,
    ) => CardCollectionOfTable<Table>;
    allPlayerCards: <ZoneId extends HandIdOfTable<Table>>(
      zoneId: ZoneId,
    ) => {
      readonly [P in PlayerIdOfTable<Table>]: HandCardsOfTable<Table, ZoneId>;
    };
  };
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
  slot: {
    occupants: (
      host: RuntimeSlotHostRef,
      slotId: string,
    ) => SlotOccupantsOfTable<Table>;
    occupantsByHost: (
      host: RuntimeSlotHostRef,
    ) => SlotOccupantsBySlotIdOfTable<Table>;
    pieceOccupants: (
      hostId: string,
      slotId: string,
    ) => SlotOccupantsOfTable<Table>;
    pieceOccupantsByHost: (
      hostId: string,
    ) => SlotOccupantsBySlotIdOfTable<Table>;
    dieOccupants: (
      hostId: string,
      slotId: string,
    ) => SlotOccupantsOfTable<Table>;
    dieOccupantsByHost: (hostId: string) => SlotOccupantsBySlotIdOfTable<Table>;
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
    ) => ComponentDataOfTable<Table, ComponentId> | undefined;
    location: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ComponentLocationOfTable<Table, ComponentId> | undefined;
    deck: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedDeckLocation<Table, ComponentId> | null;
    hand: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedHandLocation<Table, ComponentId> | null;
    zone: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedZoneLocation<Table, ComponentId> | null;
    space: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedSpaceLocation<Table, ComponentId> | null;
    container: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedContainerLocation<Table, ComponentId> | null;
    edge: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedEdgeLocation<Table, ComponentId> | null;
    vertex: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedVertexLocation<Table, ComponentId> | null;
    slot: <ComponentId extends ComponentIdOfTable<Table>>(
      componentId: ComponentId,
    ) => ResolvedSlotLocation<Table, ComponentId> | null;
  };
};

export type TableQueriesOfState<State extends { table: RuntimeTableRecord }> =
  TableQueries<TableOfState<State>>;
