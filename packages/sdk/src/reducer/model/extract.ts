import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { BoardTopologyOf } from "./topology.js";
export type { BoardTopologyOf } from "./topology.js";
import type {
  RuntimeTableRecord,
  StringKeyOf,
  DeclaredZoneScopeOfHosts,
} from "./table";
import type {
  ReducerManifestContractLike,
  ManifestContract,
  StateDefinition,
} from "./manifest";
import type { z } from "zod";
import type { SchemaLike } from "./table";
import type { FrameworkErrorCode } from "./error-codes";

export type TableOfState<State> = State extends { table: infer Table }
  ? Table
  : never;
export type TableOfManifest<Manifest> = Manifest extends {
  tableSchema: z.ZodType<infer Table>;
}
  ? Extract<Table, RuntimeTableRecord>
  : Manifest extends ReducerManifestContractLike<infer Table>
    ? Table
    : never;
export type PhaseNameOfState<State> = State extends {
  flow: { currentPhase: infer PhaseName };
}
  ? Extract<PhaseName, string>
  : never;
export type PhaseNameOfManifest<Manifest> = Manifest extends {
  literals: { phaseNames: readonly (infer PhaseName)[] };
}
  ? Extract<PhaseName, string>
  : never;
export type PlayerIdOfTable<Table> = Table extends {
  playerOrder: readonly (infer PlayerId)[];
}
  ? Extract<PlayerId, string>
  : never;
export type PlayerIdOfManifest<Manifest> = Manifest extends {
  literals: { playerIds: readonly (infer PlayerId)[] };
}
  ? Extract<PlayerId, string>
  : string;
export type PlayerIdOfState<State> = PlayerIdOfTable<TableOfState<State>>;
export type ErrorCodeOfContract<Contract> = Contract extends {
  errors: infer Errors extends Record<string, string>;
}
  ? (keyof Errors & string) | FrameworkErrorCode
  : string;
/**
 * Manifest-declared resource id union for a runtime table.
 *
 * Derived from the shape of `table.resources`, which the generated
 * manifest contract seeds as `Record<PlayerId, Record<ResourceId, number>>`.
 * Resource identifiers come from the player balance record.
 */
export type ResourceIdOfTable<Table> = Table extends {
  resources: infer Resources;
}
  ? PlayerRecordValue<Resources> extends infer PlayerValue
    ? PlayerValue extends Record<string, unknown>
      ? StringKeyOf<PlayerValue>
      : never
    : never
  : never;
export type ResourceIdOfState<State> = ResourceIdOfTable<TableOfState<State>>;
/**
 * Per-player balance shape for a runtime table. Extracts the
 * value of `table.resources` so callers receive the manifest-typed
 * record directly (e.g. `Record<ResourceId, number>`).
 */
export type ResourceBalancesOfTable<Table> = Table extends {
  resources: infer Resources;
}
  ? PlayerRecordValue<Resources> extends infer PlayerValue
    ? PlayerValue extends Record<string, unknown>
      ? PlayerValue
      : never
    : never
  : never;
export type ResourceBalancesOfState<State> = ResourceBalancesOfTable<
  TableOfState<State>
>;
export type ResourceIdOfManifest<Manifest> = Manifest extends {
  literals: { resourceIds: readonly (infer ResourceId)[] };
}
  ? Extract<ResourceId, string>
  : string;
/**
 * Per-player resource counts: a partial `Record<ResourceId, number>`.
 *
 * Used as the input shape for {@link ReducerTransaction.addResources},
 * {@link ReducerTransaction.spendResources}, and {@link ReducerTransaction.transferResources}.
 */
export type ResourceAmountsOfTable<Table> = Partial<
  Record<ResourceIdOfTable<Table>, number>
>;
export type PhaseStateOfState<State> = State extends { phase: infer PhaseState }
  ? PhaseState
  : never;
export type PhaseStepOfState<State> =
  PhaseStateOfState<State> extends {
    step?: infer Step;
  }
    ? Extract<NonNullable<Step>, string>
    : never;
export type PhaseMapOfState<State> = PhaseStateOfState<State>;
export type PublicStateOfState<State> = State extends {
  publicState: infer PublicState;
}
  ? PublicState
  : never;
export type HiddenStateOfState<State> = State extends {
  hiddenState: infer HiddenState;
}
  ? HiddenState
  : never;
export type PrivateStateOfState<State> = State extends {
  privateState: Record<string, infer PrivateState>;
}
  ? PrivateState
  : never;
export type ZoneIdOfTable<Table> = Table extends { zones: infer Zones }
  ? StringKeyOf<Zones>
  : never;
export type ZoneHostsOfTable<
  Table,
  Z extends ZoneIdOfTable<Table>,
> = Table extends { zones: infer Zones }
  ? StringKeyOf<Zones[Z & keyof Zones]>
  : never;
type DeclaredZoneScope<Table, Z extends ZoneIdOfTable<Table>> = Table extends {
  zones: infer Zones;
}
  ? DeclaredZoneScopeOfHosts<Zones[Z & keyof Zones]>
  : never;
/** Compiled tables carry declaration scope; broad raw maps defer to runtime admission. */
export type ZoneScopeOfTable<Table, Z extends ZoneIdOfTable<Table>> = [
  DeclaredZoneScope<Table, Z>,
] extends [never]
  ? "shared" | "perPlayer" | "attached"
  : DeclaredZoneScope<Table, Z>;
export type SharedZoneIdOfTable<Table> = {
  [Z in ZoneIdOfTable<Table>]: "shared" extends ZoneScopeOfTable<Table, Z>
    ? Z
    : never;
}[ZoneIdOfTable<Table>];
export type PlayerZoneIdOfTable<Table> = {
  [Z in ZoneIdOfTable<Table>]: "perPlayer" extends ZoneScopeOfTable<Table, Z>
    ? Z
    : never;
}[ZoneIdOfTable<Table>];
type ScopedZoneArg<
  Table,
  Z extends ZoneIdOfTable<Table>,
  Scope,
> = Scope extends "shared"
  ? { readonly zoneId: Z; readonly hostId?: "table" }
  : { readonly zoneId: Z; readonly hostId: ZoneHostsOfTable<Table, Z> };
export type ZoneArg<
  Table,
  Z extends ZoneIdOfTable<Table> = ZoneIdOfTable<Table>,
> =
  Z extends ZoneIdOfTable<Table>
    ? ScopedZoneArg<Table, Z, ZoneScopeOfTable<Table, Z>>
    : never;
export type ZoneComponentsOfTable<
  Table,
  Z extends ZoneIdOfTable<Table>,
> = Table extends { zones: infer Zones }
  ? Zones[Z & keyof Zones][StringKeyOf<
      Zones[Z & keyof Zones]
    >] extends readonly (infer Id)[]
    ? Extract<Id, string>
    : never
  : never;
export type CardIdOfTable<Table> = Table extends { cards: infer Cards }
  ? StringKeyOf<Cards>
  : never;
export type CardTypeOfTable<Table> = Table extends {
  cards: Record<string, { cardType: infer CardType }>;
}
  ? Extract<CardType, string>
  : string;
export type CardIdOfState<State> = CardIdOfTable<TableOfState<State>>;
export type CardTypeOfState<State> = CardTypeOfTable<TableOfState<State>>;
export type CardIdOfManifest<Manifest> = Manifest extends {
  ids: { cardId: z.ZodType<infer Id> };
}
  ? Extract<Id, string>
  : Manifest extends { literals: { cardIds: readonly (infer Id)[] } }
    ? Extract<Id, string>
    : string;
export type BoardMapOfTable<Table> = Table extends {
  boards: infer Boards;
}
  ? Boards
  : never;
export type BoardIdOfTable<Table> = StringKeyOf<BoardMapOfTable<Table>>;
export type BoardStateOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = BoardTopologyOf<Table, Definitions, BoardId>;
export type BoardTypeIdOfTable<
  Table,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardIdOfTable<Table>, Definitions> extends {
    typeId?: infer BoardTypeId | null;
  }
    ? Extract<BoardTypeId, string>
    : never;
export type TiledBoardIdOfTable<
  Table,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in BoardIdOfTable<Table>]: [
    Extract<
      BoardStateOfTable<Table, BoardId, Definitions>,
      { layout: "hex" | "square" }
    >,
  ] extends [never]
    ? never
    : BoardId;
}[BoardIdOfTable<Table>];
export type TiledBoardStateOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends infer BoardState
    ? BoardState extends {
        layout: "hex" | "square";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type HexBoardIdOfTable<
  Table,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in BoardIdOfTable<Table>]: [
    Extract<BoardStateOfTable<Table, BoardId, Definitions>, { layout: "hex" }>,
  ] extends [never]
    ? never
    : BoardId;
}[BoardIdOfTable<Table>];
export type HexBoardStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends infer BoardState
    ? BoardState extends {
        layout: "hex";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type SquareBoardIdOfTable<
  Table,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  [BoardId in BoardIdOfTable<Table>]: [
    Extract<
      BoardStateOfTable<Table, BoardId, Definitions>,
      { layout: "square" }
    >,
  ] extends [never]
    ? never
    : BoardId;
}[BoardIdOfTable<Table>];
export type SquareBoardStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends infer BoardState
    ? BoardState extends {
        layout: "square";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type SpaceIdOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends infer Board
    ? Board extends { spaces: infer Spaces }
      ? StringKeyOf<Spaces>
      : never
    : never;
export type SpaceTypeIdOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type RelationTypeIdOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  BoardStateOfTable<Table, BoardId, Definitions> extends {
    relations: readonly (infer Relation)[];
  }
    ? Relation extends { typeId: infer RelationTypeId }
      ? Extract<RelationTypeId, string>
      : never
    : never;
export type TiledSpaceIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces;
  }
    ? StringKeyOf<Spaces>
    : never;
export type HexSpaceIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces;
  }
    ? StringKeyOf<Spaces>
    : never;
export type SquareSpaceIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces;
  }
    ? StringKeyOf<Spaces>
    : never;
export type HexSpaceTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type SquareSpaceTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type TiledEdgeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: infer EdgeId }
      ? Extract<EdgeId, string>
      : never
    : never;
export type HexEdgeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: infer EdgeId }
      ? Extract<EdgeId, string>
      : never
    : never;
export type SquareEdgeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: infer EdgeId }
      ? Extract<EdgeId, string>
      : never
    : never;
/**
 * Edge record on a tiled board narrowed to a specific `EdgeId` literal.
 *
 * The generated board state stores edges as a single array element type
 * `{ id: <union-of-edge-ids>, spaceIds, typeId, fields, ... }`. Looking up an
 * edge by id should return a record whose `id` is narrowed to the literal
 * that was requested, not the entire edge-id union.
 */
export type TiledEdgeStateOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  EdgeId extends TiledEdgeIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type HexEdgeStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  EdgeId extends HexEdgeIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type SquareEdgeStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  EdgeId extends SquareEdgeIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type TiledEdgeTypeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type HexEdgeTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type SquareEdgeTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type TiledVertexIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: infer VertexId }
      ? Extract<VertexId, string>
      : never
    : never;
export type HexVertexIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: infer VertexId }
      ? Extract<VertexId, string>
      : never
    : never;
export type SquareVertexIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: infer VertexId }
      ? Extract<VertexId, string>
      : never
    : never;
/**
 * Vertex record on a tiled board narrowed to a specific `VertexId` literal.
 * See {@link TiledEdgeStateOfTable} for rationale.
 */
export type TiledVertexStateOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  VertexId extends TiledVertexIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type HexVertexStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  VertexId extends HexVertexIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type SquareVertexStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  VertexId extends SquareVertexIdOfTable<Table, BoardId, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type TiledVertexTypeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  TiledBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type HexVertexTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  HexBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type SquareVertexTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table, Definitions>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> =
  SquareBoardStateOfTable<Table, BoardId, Definitions> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type TiledSpaceMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Value,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = Partial<Record<TiledSpaceIdOfTable<Table, BoardId, Definitions>, Value>>;
export type TiledEdgeMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Value,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = Partial<Record<TiledEdgeIdOfTable<Table, BoardId, Definitions>, Value>>;
export type TiledVertexMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table, Definitions>,
  Value,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = Partial<Record<TiledVertexIdOfTable<Table, BoardId, Definitions>, Value>>;
export type TileIdOfTable<Table> = Table extends { tiles: infer Tiles }
  ? StringKeyOf<Tiles>
  : never;
export type TileTypeIdOfTable<Table> = Table extends {
  tiles: Record<string, { tileTypeId: infer Id }>;
}
  ? Extract<Id, string>
  : never;
export type TileIdOfState<State> = TileIdOfTable<TableOfState<State>>;
export type TileIdOfManifest<Manifest> = Manifest extends {
  ids: { tileId: z.ZodType<infer Id> };
}
  ? Extract<Id, string>
  : string;
export type SpatialComponentIdOfTable<Table> = Table extends {
  cards: infer Cards;
  pieces: infer Pieces;
  dice: infer Dice;
}
  ? StringKeyOf<Cards> | StringKeyOf<Pieces> | StringKeyOf<Dice>
  : never;
export type ComponentIdOfTable<Table> = Table extends {
  componentLocations: infer ComponentLocations;
}
  ? StringKeyOf<ComponentLocations>
  : never;
export type SharedZoneIdOfManifest<Manifest> = Manifest extends {
  zoneDefinitions: infer Zones;
}
  ? {
      [Z in keyof Zones & string]: Zones[Z] extends { scope: "shared" }
        ? Z
        : never;
    }[keyof Zones & string]
  : string;
export type PlayerZoneIdOfManifest<Manifest> = Manifest extends {
  zoneDefinitions: infer Zones;
}
  ? {
      [Z in keyof Zones & string]: Zones[Z] extends { scope: "perPlayer" }
        ? Z
        : never;
    }[keyof Zones & string]
  : string;
export type SharedZoneIdOfState<State> = SharedZoneIdOfTable<
  TableOfState<State>
>;
export type PlayerZoneIdOfState<State> = PlayerZoneIdOfTable<
  TableOfState<State>
>;
export type BoardIdOfManifest<Manifest> = Manifest extends {
  ids: { boardId: z.ZodType<infer Id> };
}
  ? Extract<Id, string>
  : Manifest extends { literals: { boardIds: readonly (infer Id)[] } }
    ? Extract<Id, string>
    : string;
export type BoardLayoutOfManifest<Manifest> = Manifest extends {
  literals: { boardLayouts: readonly (infer BoardLayout)[] };
}
  ? Extract<BoardLayout, string>
  : "generic" | "hex" | "square";
export type BoardTypeIdOfManifest<Manifest> = Manifest extends {
  literals: { boardTypeIds: readonly (infer BoardTypeId)[] };
}
  ? Extract<BoardTypeId, string>
  : string;
export type BoardBaseIdOfManifest<Manifest> = Manifest extends {
  literals: { boardBaseIds: readonly (infer BoardBaseId)[] };
}
  ? Extract<BoardBaseId, string>
  : string;
// Relation tags are open; retain the manifest parameter for the extraction API.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- The public extraction signature remains generic without deriving tag membership from setup.
export type RelationTypeIdOfManifest<Manifest> = string;
export type EdgeTypeIdOfManifest<Manifest> = Manifest extends {
  literals: { edgeTypeIds: readonly (infer EdgeTypeId)[] };
}
  ? Extract<EdgeTypeId, string>
  : string;
export type VertexTypeIdOfManifest<Manifest> = Manifest extends {
  literals: { vertexTypeIds: readonly (infer VertexTypeId)[] };
}
  ? Extract<VertexTypeId, string>
  : string;
export type SpaceIdOfManifest<Manifest> = Manifest extends {
  literals: { spaceIds: readonly (infer SpaceId)[] };
}
  ? Extract<SpaceId, string>
  : string;
export type SpaceTypeIdOfManifest<Manifest> = Manifest extends {
  literals: { spaceTypeIds: readonly (infer SpaceTypeId)[] };
}
  ? Extract<SpaceTypeId, string>
  : string;
export type PieceIdOfManifest<Manifest> = Manifest extends {
  ids: { pieceId: z.ZodType<infer Id> };
}
  ? Extract<Id, string>
  : Manifest extends { literals: { pieceIds: readonly (infer Id)[] } }
    ? Extract<Id, string>
    : string;
export type DieIdOfManifest<Manifest> = Manifest extends {
  ids: { dieId: z.ZodType<infer Id> };
}
  ? Extract<Id, string>
  : Manifest extends { literals: { dieIds: readonly (infer Id)[] } }
    ? Extract<Id, string>
    : string;
export type ManifestOf<Source> = Source extends { contract: infer Contract }
  ? ManifestOf<Contract>
  : Source extends { manifest: infer Manifest }
    ? Manifest
    : never;
export type StateDefinitionOfContract<Contract> = Contract extends {
  state: infer StateDefinitionValue;
}
  ? StateDefinitionValue
  : never;
export type PhaseSchemasOfContract<Contract> = Contract extends {
  phases: infer Phases extends Record<string, SchemaLike<object>>;
}
  ? Phases
  : Record<PhaseNameOfManifest<ManifestOf<Contract>>, SchemaLike<object>>;
export type PhaseStateMapOfContract<Contract> = {
  [Name in keyof PhaseSchemasOfContract<Contract> & string]: z.infer<
    PhaseSchemasOfContract<Contract>[Name]
  >;
};
export type PublicSchemaOfContract<Contract> =
  StateDefinitionOfContract<Contract> extends StateDefinition<
    infer PublicSchema,
    SchemaLike<object>,
    SchemaLike<object>
  >
    ? PublicSchema
    : never;
export type PrivateSchemaOfContract<Contract> =
  StateDefinitionOfContract<Contract> extends StateDefinition<
    SchemaLike<object>,
    infer PrivateSchema,
    SchemaLike<object>
  >
    ? PrivateSchema
    : never;
export type HiddenSchemaOfContract<Contract> =
  StateDefinitionOfContract<Contract> extends StateDefinition<
    SchemaLike<object>,
    SchemaLike<object>,
    infer HiddenSchema
  >
    ? HiddenSchema
    : never;
export type PhaseNameOfContract<Contract> =
  keyof PhaseSchemasOfContract<Contract> extends string
    ? keyof PhaseSchemasOfContract<Contract> & string
    : PhaseNameOfManifest<ManifestOf<Contract>>;
type DefinitionMapsOf<Manifest> = Manifest extends {
  boardDefinitions: infer Boards extends
    TopologyDefinitions["boardDefinitions"];
  tileDefinitions: infer Tiles extends TopologyDefinitions["tileDefinitions"];
  zoneDefinitions: infer Zones extends
    import("./table.js").ZoneDefinitions["zoneDefinitions"];
}
  ? { boardDefinitions: Boards; tileDefinitions: Tiles; zoneDefinitions: Zones }
  : import("./table.js").ZoneDefinitions;
export type ManifestContractOf<Contract> = ManifestContract<
  TableOfManifest<ManifestOf<Contract>>,
  DefinitionMapsOf<ManifestOf<Contract>>
>;
export type ExactManifestContractOf<Contract> = ManifestOf<Contract> &
  Omit<
    ReducerManifestContractLike<TableOfManifest<ManifestOf<Contract>>>,
    "boardDefinitions" | "tileDefinitions" | "zoneDefinitions"
  >;
export type PhaseNameOf<Source> = Source extends {
  flow: { currentPhase: infer PhaseName };
}
  ? Extract<PhaseName, string>
  : PhaseNameOfContract<Source>;
type PlayerRecordValue<T> =
  T extends Record<string, infer Value> ? Value : never;
export type OptionsSchemaOfContract<Contract> = Contract extends {
  options: infer Schema extends SchemaLike<import("./table").RuntimeRecord>;
}
  ? Schema
  : SchemaLike<Record<string, never>>;
export type OptionsOfContract<Contract> = z.infer<
  OptionsSchemaOfContract<Contract>
>;
