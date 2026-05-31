import type { StringKeyOf } from "./table";
import type {
  GeneratedManifestContractLike,
  ManifestContract,
  StateDefinition,
} from "./manifest";
import type { z } from "zod";
import type { SchemaLike } from "./table";

export type TableOfState<State> = State extends { table: infer Table }
  ? Table
  : never;
export type TableOfManifest<Manifest> =
  Manifest extends GeneratedManifestContractLike<infer Table> ? Table : never;
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
/**
 * Manifest-declared resource id union for a runtime table.
 *
 * Derived from the shape of `table.resources`, which the generated
 * manifest contract seeds as `PerPlayer<Record<ResourceId, number>>`.
 * The helper peeks inside the `PerPlayer` wrapper to surface the
 * resource-id keys without forcing callers to remember the wrapper.
 */
export type ResourceIdOfTable<Table> = Table extends {
  resources: infer Resources;
}
  ? ValueOfPerPlayer<Resources> extends infer PerPlayerValue
    ? PerPlayerValue extends Record<string, unknown>
      ? StringKeyOf<PerPlayerValue>
      : never
    : never
  : never;
export type ResourceIdOfState<State> = ResourceIdOfTable<TableOfState<State>>;
/**
 * Per-player balance shape for a runtime table. Strips the `PerPlayer`
 * wrapper around `table.resources` so callers receive the manifest-typed
 * record directly (e.g. `Record<ResourceId, number>`).
 */
export type ResourceBalancesOfTable<Table> = Table extends {
  resources: infer Resources;
}
  ? ValueOfPerPlayer<Resources> extends infer PerPlayerValue
    ? PerPlayerValue extends Record<string, unknown>
      ? PerPlayerValue
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
 * Used as the input shape for {@link ReducerOps.addResources},
 * {@link ReducerOps.spendResources}, and {@link ReducerOps.transferResources}.
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
export type DeckIdOfTable<Table> = Table extends { decks: infer Decks }
  ? StringKeyOf<Decks>
  : never;
export type HandIdOfTable<Table> = Table extends { hands: infer Hands }
  ? StringKeyOf<Hands>
  : never;
export type CardIdOfTable<Table> = Table extends { cards: infer Cards }
  ? StringKeyOf<Cards>
  : never;
export type CardTypeOfTable<Table> = Table extends {
  cards: Record<string, { cardType: infer CardType }>;
}
  ? Extract<CardType, string>
  : string;
export type DeckIdOfState<State> = DeckIdOfTable<TableOfState<State>>;
export type HandIdOfState<State> = HandIdOfTable<TableOfState<State>>;
export type CardIdOfState<State> = CardIdOfTable<TableOfState<State>>;
export type CardTypeOfState<State> = CardTypeOfTable<TableOfState<State>>;
export type CardIdOfManifest<Manifest> = Manifest extends {
  literals: { cardIds: readonly (infer CardId)[] };
}
  ? Extract<CardId, string>
  : string;
export type SharedZoneIdOfTable<Table> = DeckIdOfTable<Table>;
export type PlayerZoneIdOfTable<Table> = HandIdOfTable<Table>;
export type BoardMapOfTable<Table> = Table extends {
  boards: { byId: infer Boards };
}
  ? Boards
  : never;
export type BoardIdOfTable<Table> = StringKeyOf<BoardMapOfTable<Table>>;
export type BoardStateOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
> = BoardMapOfTable<Table>[BoardId];
export type BoardTypeIdOfTable<Table> =
  BoardStateOfTable<Table, BoardIdOfTable<Table>> extends {
    typeId?: infer BoardTypeId | null;
  }
    ? Extract<BoardTypeId, string>
    : never;
export type TiledBoardIdOfTable<Table> = {
  [BoardId in BoardIdOfTable<Table>]: BoardStateOfTable<
    Table,
    BoardId
  > extends { layout: "hex" | "square" }
    ? BoardId
    : never;
}[BoardIdOfTable<Table>];
export type TiledBoardStateOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  BoardStateOfTable<Table, BoardId> extends infer BoardState
    ? BoardState extends {
        layout: "hex" | "square";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type HexBoardIdOfTable<Table> = {
  [BoardId in BoardIdOfTable<Table>]: BoardStateOfTable<
    Table,
    BoardId
  > extends { layout: "hex" }
    ? BoardId
    : never;
}[BoardIdOfTable<Table>];
export type HexBoardStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
> =
  BoardStateOfTable<Table, BoardId> extends infer BoardState
    ? BoardState extends {
        layout: "hex";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type SquareBoardIdOfTable<Table> = {
  [BoardId in BoardIdOfTable<Table>]: BoardStateOfTable<
    Table,
    BoardId
  > extends { layout: "square" }
    ? BoardId
    : never;
}[BoardIdOfTable<Table>];
export type SquareBoardStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  BoardStateOfTable<Table, BoardId> extends infer BoardState
    ? BoardState extends {
        layout: "square";
        spaces: Record<string, unknown>;
        edges: readonly { id: string }[];
        vertices: readonly { id: string }[];
      }
      ? BoardState
      : never
    : never;
export type SpaceIdOfTable<Table, BoardId extends BoardIdOfTable<Table>> =
  BoardStateOfTable<Table, BoardId> extends { spaces: infer Spaces }
    ? StringKeyOf<Spaces>
    : never;
export type SpaceTypeIdOfTable<Table, BoardId extends BoardIdOfTable<Table>> =
  BoardStateOfTable<Table, BoardId> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type BoardContainerIdOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
> =
  BoardStateOfTable<Table, BoardId> extends { containers: infer Containers }
    ? StringKeyOf<Containers>
    : never;
export type RelationTypeIdOfTable<
  Table,
  BoardId extends BoardIdOfTable<Table>,
> =
  BoardStateOfTable<Table, BoardId> extends {
    relations: readonly (infer Relation)[];
  }
    ? Relation extends { typeId: infer RelationTypeId }
      ? Extract<RelationTypeId, string>
      : never
    : never;
export type TiledSpaceIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends { spaces: infer Spaces }
    ? StringKeyOf<Spaces>
    : never;
export type HexSpaceIdOfTable<Table, BoardId extends HexBoardIdOfTable<Table>> =
  HexBoardStateOfTable<Table, BoardId> extends { spaces: infer Spaces }
    ? StringKeyOf<Spaces>
    : never;
export type SquareSpaceIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends { spaces: infer Spaces }
    ? StringKeyOf<Spaces>
    : never;
export type HexSpaceTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type SquareSpaceTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
    spaces: infer Spaces extends Record<string, unknown>;
  }
    ? Spaces[StringKeyOf<Spaces>] extends { typeId?: infer SpaceTypeId | null }
      ? Extract<SpaceTypeId, string>
      : never
    : never;
export type TiledEdgeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: infer EdgeId }
      ? Extract<EdgeId, string>
      : never
    : never;
export type HexEdgeIdOfTable<Table, BoardId extends HexBoardIdOfTable<Table>> =
  HexBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: infer EdgeId }
      ? Extract<EdgeId, string>
      : never
    : never;
export type SquareEdgeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
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
  BoardId extends TiledBoardIdOfTable<Table>,
  EdgeId extends TiledEdgeIdOfTable<Table, BoardId>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type HexEdgeStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
  EdgeId extends HexEdgeIdOfTable<Table, BoardId>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type SquareEdgeStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
  EdgeId extends SquareEdgeIdOfTable<Table, BoardId>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { id: string }
      ? Omit<Edge, "id"> & { id: EdgeId }
      : never
    : never;

export type TiledEdgeTypeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type HexEdgeTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type SquareEdgeTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
    edges: readonly (infer Edge)[];
  }
    ? Edge extends { typeId?: infer EdgeTypeId | null }
      ? Extract<EdgeTypeId, string>
      : never
    : never;
export type TiledVertexIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: infer VertexId }
      ? Extract<VertexId, string>
      : never
    : never;
export type HexVertexIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: infer VertexId }
      ? Extract<VertexId, string>
      : never
    : never;
export type SquareVertexIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
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
  BoardId extends TiledBoardIdOfTable<Table>,
  VertexId extends TiledVertexIdOfTable<Table, BoardId>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type HexVertexStateOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
  VertexId extends HexVertexIdOfTable<Table, BoardId>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type SquareVertexStateOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
  VertexId extends SquareVertexIdOfTable<Table, BoardId>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { id: string }
      ? Omit<Vertex, "id"> & { id: VertexId }
      : never
    : never;

export type TiledVertexTypeIdOfTable<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
> =
  TiledBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type HexVertexTypeIdOfTable<
  Table,
  BoardId extends HexBoardIdOfTable<Table>,
> =
  HexBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type SquareVertexTypeIdOfTable<
  Table,
  BoardId extends SquareBoardIdOfTable<Table>,
> =
  SquareBoardStateOfTable<Table, BoardId> extends {
    vertices: readonly (infer Vertex)[];
  }
    ? Vertex extends { typeId?: infer VertexTypeId | null }
      ? Extract<VertexTypeId, string>
      : never
    : never;
export type TiledSpaceMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
  Value,
> = Partial<Record<TiledSpaceIdOfTable<Table, BoardId>, Value>>;
export type TiledEdgeMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
  Value,
> = Partial<Record<TiledEdgeIdOfTable<Table, BoardId>, Value>>;
export type TiledVertexMap<
  Table,
  BoardId extends TiledBoardIdOfTable<Table>,
  Value,
> = Partial<Record<TiledVertexIdOfTable<Table, BoardId>, Value>>;
export type ComponentIdOfTable<Table> = Table extends {
  componentLocations: infer ComponentLocations;
}
  ? StringKeyOf<ComponentLocations>
  : never;
export type SharedZoneIdOfManifest<Manifest> = Manifest extends {
  literals: { sharedZoneIds: readonly (infer ZoneId)[] };
}
  ? Extract<ZoneId, string>
  : string;
export type PlayerZoneIdOfManifest<Manifest> = Manifest extends {
  literals: { playerZoneIds: readonly (infer ZoneId)[] };
}
  ? Extract<ZoneId, string>
  : string;
export type SharedZoneIdOfState<State> = DeckIdOfState<State>;
export type PlayerZoneIdOfState<State> = HandIdOfState<State>;
export type BoardIdOfManifest<Manifest> = Manifest extends {
  literals: { boardIds: readonly (infer BoardId)[] };
}
  ? Extract<BoardId, string>
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
export type RelationTypeIdOfManifest<Manifest> = Manifest extends {
  literals: { relationTypeIds: readonly (infer RelationTypeId)[] };
}
  ? Extract<RelationTypeId, string>
  : string;
export type BoardContainerIdOfManifest<Manifest> = Manifest extends {
  literals: { boardContainerIds: readonly (infer ContainerId)[] };
}
  ? Extract<ContainerId, string>
  : string;
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
  literals: { pieceIds: readonly (infer PieceId)[] };
}
  ? Extract<PieceId, string>
  : string;
export type DieIdOfManifest<Manifest> = Manifest extends {
  literals: { dieIds: readonly (infer DieId)[] };
}
  ? Extract<DieId, string>
  : string;
export type ManifestOf<Source> = Source extends { contract: infer Contract }
  ? ManifestOf<Contract>
  : Source extends { manifest: infer Manifest }
    ? Manifest
    : never;
export type SetupOptionIdOfManifest<Manifest> = Manifest extends {
  literals: { setupOptionIds: readonly (infer SetupOptionId)[] };
}
  ? Extract<SetupOptionId, string>
  : string;
export type SetupProfileIdOfManifest<Manifest> = Manifest extends {
  literals: { setupProfileIds: readonly (infer SetupProfileId)[] };
}
  ? Extract<SetupProfileId, string>
  : string;
export type SetupSelectionInputOfManifest<Manifest> = {
  profileId: SetupProfileIdOfManifest<Manifest>;
  optionValues?: Partial<Record<SetupOptionIdOfManifest<Manifest>, string>>;
};
export type SetupSelectionOfManifest<Manifest> = {
  profileId: SetupProfileIdOfManifest<Manifest>;
  optionValues: Record<SetupOptionIdOfManifest<Manifest>, string | null>;
};
export type RuntimeSetupSelectionInput<
  Manifest extends
    GeneratedManifestContractLike = GeneratedManifestContractLike,
> = SetupSelectionInputOfManifest<Manifest>;
export type RuntimeSetupSelection<
  Manifest extends
    GeneratedManifestContractLike = GeneratedManifestContractLike,
> = SetupSelectionOfManifest<Manifest>;
export type RuntimeSetupSelectionOverride<
  Manifest extends
    GeneratedManifestContractLike = GeneratedManifestContractLike,
> = SetupSelectionInputOfManifest<Manifest>;
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
    infer _PrivateSchema,
    infer _HiddenSchema
  >
    ? PublicSchema
    : never;
export type PrivateSchemaOfContract<Contract> =
  StateDefinitionOfContract<Contract> extends StateDefinition<
    infer _PublicSchema,
    infer PrivateSchema,
    infer _HiddenSchema
  >
    ? PrivateSchema
    : never;
export type HiddenSchemaOfContract<Contract> =
  StateDefinitionOfContract<Contract> extends StateDefinition<
    infer _PublicSchema,
    infer _PrivateSchema,
    infer HiddenSchema
  >
    ? HiddenSchema
    : never;
export type PhaseNameOfContract<Contract> =
  keyof PhaseSchemasOfContract<Contract> extends string
    ? keyof PhaseSchemasOfContract<Contract> & string
    : PhaseNameOfManifest<ManifestOf<Contract>>;
export type ManifestContractOf<Contract> = ManifestContract<
  TableOfManifest<ManifestOf<Contract>>
>;
export type ExactManifestContractOf<Contract> = ManifestOf<Contract> &
  GeneratedManifestContractLike<TableOfManifest<ManifestOf<Contract>>>;
export type PhaseNameOf<Source> = Source extends {
  flow: { currentPhase: infer PhaseName };
}
  ? Extract<PhaseName, string>
  : PhaseNameOfContract<Source>;
export type DeckCardsOfTable<
  Table,
  DeckId extends DeckIdOfTable<Table>,
> = Table extends {
  decks: infer Decks extends Record<string, readonly unknown[]>;
}
  ? Decks[DeckId]
  : never;
// `hands` is a `Record<string, PerPlayer<string[]>>`-shaped map. Extracting the
// per-player cards type through the `PerPlayer<Value>` wrapper requires
// digging into the `entries` tuple. This intermediate helper resolves the
// tuple-value type even when `PerPlayer` is generic.
type ValueOfPerPlayer<T> = T extends {
  readonly entries: ReadonlyArray<readonly [unknown, infer Value]>;
}
  ? Value
  : never;
export type HandCardsOfTable<
  Table,
  HandId extends HandIdOfTable<Table>,
> = Table extends {
  hands: infer Hands extends Record<string, unknown>;
}
  ? HandId extends keyof Hands
    ? ValueOfPerPlayer<Hands[HandId]> extends infer Value
      ? Value extends readonly unknown[]
        ? Value
        : never
      : never
    : never
  : never;
export type CardIdOfDeck<
  Table,
  DeckId extends DeckIdOfTable<Table>,
> = DeckCardsOfTable<Table, DeckId>[number];
export type CardIdOfHand<
  Table,
  HandId extends HandIdOfTable<Table>,
> = HandCardsOfTable<Table, HandId>[number];
export type CompatibleHandIdForDeck<
  Table,
  DeckId extends DeckIdOfTable<Table>,
> = {
  [CandidateHandId in HandIdOfTable<Table>]: Extract<
    CardIdOfDeck<Table, DeckId>,
    CardIdOfHand<Table, CandidateHandId>
  > extends never
    ? never
    : CandidateHandId;
}[HandIdOfTable<Table>];
export type CompatibleCardIdForHandAndDeck<
  Table,
  HandId extends HandIdOfTable<Table>,
  DeckId extends DeckIdOfTable<Table>,
> = Extract<CardIdOfHand<Table, HandId>, CardIdOfDeck<Table, DeckId>>;
export type CompatibleCardIdForTwoPlayerZones<
  Table,
  FromZoneId extends HandIdOfTable<Table>,
  ToZoneId extends HandIdOfTable<Table>,
> = Extract<CardIdOfHand<Table, FromZoneId>, CardIdOfHand<Table, ToZoneId>>;
