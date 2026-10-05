import type { BoundBoardQueries } from "../table/board-queries";
import type {
  CardCollection,
  ViewCardOfTable,
} from "../../shared/domain/cards.js";
import type { ViewSlotOccupant } from "../../shared/domain/slots.js";
import type {
  ZoneIdOfTable,
  ZoneComponentsOfTable,
  ZoneHostsOfTable,
  ZoneScopeOfTable,
  BoardContainerIdOfTable,
  BoardIdOfTable,
  CardIdOfTable,
  ComponentIdOfTable,
  PlayerIdOfTable,
  ResourceAmountsOfTable,
  ResourceBalancesOfTable,
  ResourceIdOfTable,
  SpaceIdOfTable,
  SlotHostOfTable,
  SlotIdOfTable,
  TableOfState,
  TiledBoardIdOfTable,
  TiledEdgeIdOfTable,
  TiledVertexIdOfTable,
} from "./extract";
import type {
  RuntimeComponentLocation,
  RuntimeSlotHostRef,
  RuntimeTableRecord,
} from "./table";

type ScopedZoneHostArgs<Table, Scope> = Scope extends "shared"
  ? [hostId?: "table"]
  : [hostId: PlayerIdOfTable<Table>];
type ZoneHostArgs<Table, Z extends ZoneIdOfTable<Table>> = ScopedZoneHostArgs<
  Table,
  ZoneScopeOfTable<Table, Z>
>;

type BoardRecord<
  Table extends RuntimeTableRecord,
  BoardId extends BoardIdOfTable<Table>,
> = Table["boards"]["byId"][BoardId];

type TiledBoardRecord<
  Table extends RuntimeTableRecord,
  BoardId extends TiledBoardIdOfTable<Table>,
> = Extract<BoardRecord<Table, BoardId>, { layout: "hex" | "square" }>;

type CardsByIdOfTable<
  Table extends RuntimeTableRecord,
  CardIds extends readonly CardIdOfTable<Table>[],
> = Readonly<{
  [Id in CardIds[number]]: ViewCardOfTable<Table, Id>;
}>;

type CardCollectionOfTable<
  Table extends RuntimeTableRecord,
  Z extends ZoneIdOfTable<Table>,
> = CardCollection<
  Extract<ZoneComponentsOfTable<Table, Z>, CardIdOfTable<Table>>,
  ViewCardOfTable<
    Table,
    Extract<ZoneComponentsOfTable<Table, Z>, CardIdOfTable<Table>>
  >
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
          hostId: string;
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
  board<BoardId extends BoardIdOfTable<Table>>(
    boardId: BoardId,
  ): BoundBoardQueries<
    Table["boards"]["byId"][BoardId],
    ComponentIdOfTable<Table>
  >;
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
  slot: {
    occupants: <Host extends SlotHostOfTable<Table>>(
      host: Host,
      slotId: SlotIdOfTable<Table, NoInfer<Host>>,
    ) => SlotOccupantsOfTable<Table>;
    occupantsByHost: (
      host: SlotHostOfTable<Table>,
    ) => SlotOccupantsBySlotIdOfTable<Table>;
    pieceOccupants: <Id extends keyof Table["pieces"] & string>(
      hostId: Id,
      slotId: SlotIdOfTable<Table, { kind: "piece"; id: NoInfer<Id> }>,
    ) => SlotOccupantsOfTable<Table>;
    pieceOccupantsByHost: (
      hostId: keyof Table["pieces"] & string,
    ) => SlotOccupantsBySlotIdOfTable<Table>;
    dieOccupants: <Id extends keyof Table["dice"] & string>(
      hostId: Id,
      slotId: SlotIdOfTable<Table, { kind: "die"; id: NoInfer<Id> }>,
    ) => SlotOccupantsOfTable<Table>;
    dieOccupantsByHost: (
      hostId: keyof Table["dice"] & string,
    ) => SlotOccupantsBySlotIdOfTable<Table>;
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
