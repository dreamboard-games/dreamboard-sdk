import * as reducer from "../src/reducer.js";
import {
  asPlayerId,
  type PlayerId,
  type ReducerTransaction,
} from "../src/reducer.js";
import type { RuntimeTableRecord, TableQueries } from "../src/reducer/model.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

type HexBoard = RuntimeTableRecord["boards"]["hex"][string];
type Board<Id extends string> = Omit<
  HexBoard,
  "spaces" | "containers" | "edges" | "vertices"
> & {
  spaces: Record<`${Id}-space`, HexBoard["spaces"][string]>;
  containers: Record<`${Id}-container`, HexBoard["containers"][string]>;
  edges: (HexBoard["edges"][number] & { id: `${Id}-edge` })[];
  vertices: (HexBoard["vertices"][number] & { id: `${Id}-vertex` })[];
};

type Table = Omit<
  RuntimeTableRecord,
  | "boards"
  | "zones"
  | "cards"
  | "pieces"
  | "playerOrder"
  | "componentLocations"
  | "dice"
> & {
  boards: Omit<RuntimeTableRecord["boards"], "byId"> & {
    byId: { north: Board<"north">; south: Board<"south"> };
  };
  dice: { d6: RuntimeTableRecord["dice"][string] };
  playerOrder: PlayerId[];
  pieces: { piece: RuntimeTableRecord["pieces"][string] };
  zones: {
    draw: { table: "red"[] };
    special: { table: "blue"[] };
    hand: Record<PlayerId, ("red" | "piece" | "d6")[]>;
    played: Record<PlayerId, ("red" | "piece" | "d6")[]>;
    specialHand: Record<PlayerId, "blue"[]>;
  };
  cards: Record<"red" | "blue", RuntimeTableRecord["cards"][string]>;
  componentLocations: Record<
    "red" | "blue" | "piece",
    RuntimeTableRecord["componentLocations"][string]
  >;
};
type State = { table: Table };

export function assertZoneQueryContract(
  q: TableQueries<Table>,
  player: PlayerId,
): void {
  const cards = q.zone.cards("draw");
  type _AllowedCards = Expect<Equal<(typeof cards.cardIds)[number], "red">>;
  const mixed = q.zone("hand", player);
  type _MixedComponents = Expect<
    Equal<(typeof mixed)[number], "red" | "piece" | "d6">
  >;
  const handCards = q.zone.cards("hand", player);
  type _CardsExcludeNonCards = Expect<
    Equal<(typeof handCards.cardIds)[number], "red">
  >;
  // @ts-expect-error A card-only collection excludes the destination's pieces.
  cards.cardsById.piece;
  // @ts-expect-error A zone's allowed card identities exclude another card set.
  cards.cardsById.blue;
}

export function assertTransactionContract(
  tx: ReducerTransaction<State>,
): State {
  const player = asPlayerId("player");
  const result: number = tx.roll("d6");
  void result;
  tx.shuffle({ zone: { zoneId: "draw" } });
  tx.shuffle({ zone: { zoneId: "hand", hostId: player } });
  // @ts-expect-error A declared die ID is required.
  tx.roll("missing");
  // @ts-expect-error A player zone needs its seat.
  tx.shuffle({ zone: { zoneId: "hand" } });
  // @ts-expect-error Shared zones cannot be shuffled as player zones.
  tx.shuffle({ zone: { zoneId: "draw", hostId: player } });
  // @ts-expect-error Effects have been removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Effects have been removed.
  tx.effect({});
  // @ts-expect-error Scheduling has been removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Scheduling has been removed.
  tx.schedule({});
  // @ts-expect-error The old deal name has been removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: The old deal name has been removed.
  tx.dealCardsToPlayerZone({});
  // @ts-expect-error Staged authoring has been removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Staged authoring has been removed.
  reducer.defineStepPhase();
  // @ts-expect-error Card actions use ordinary interactions.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Card actions use ordinary interactions.
  reducer.defineCardAction();
  tx.moveComponentToSpace({
    componentId: "piece",
    boardId: "north",
    spaceId: "north-space",
  });
  tx.moveComponentToContainer({
    componentId: "piece",
    boardId: "north",
    containerId: "north-container",
  });
  tx.moveComponentToEdge({
    componentId: "piece",
    boardId: "north",
    edgeId: "north-edge",
  });
  tx.moveComponentToVertex({
    componentId: "piece",
    boardId: "north",
    vertexId: "north-vertex",
  });
  tx.moveComponentToSpace({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Space IDs belong to the selected board.
    spaceId: "south-space",
  });
  tx.moveComponentToContainer({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Container IDs belong to the selected board.
    containerId: "south-container",
  });
  tx.moveComponentToEdge({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Edge IDs belong to the selected board.
    edgeId: "south-edge",
  });
  tx.moveComponentToVertex({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Vertex IDs belong to the selected board.
    vertexId: "south-vertex",
  });
  // @ts-expect-error Component IDs come from the table.
  tx.moveComponentToDetached({ componentId: "missing" });

  tx.moveComponentToZone({
    componentId: "red",
    to: { zoneId: "played", hostId: player },
  });
  tx.moveComponentToZone({ componentId: "red", to: { zoneId: "draw" } });
  tx.moveComponentToZone({
    componentId: "red",
    to: { zoneId: "hand", hostId: player },
  });
  tx.moveComponentToZone({
    componentId: "piece",
    to: { zoneId: "hand", hostId: player },
  });
  tx.moveComponentToZone({
    componentId: "d6",
    to: { zoneId: "hand", hostId: player },
  });
  tx.rotateZone({
    zoneId: "hand",
    direction: "left",
    componentIdsByPlayer: { [player]: ["red", "piece", "d6"] },
  });
  tx.rotateZone({
    zoneId: "hand",
    direction: "left",
    // @ts-expect-error Rotation selections retain the chosen zone's accepted identities.
    componentIdsByPlayer: {
      [player]: ["blue"],
    },
  });
  tx.deal({
    from: { zoneId: "draw" },
    to: { zoneId: "hand", hostId: player },
    count: 1,
  });
  tx.moveComponentToZone({
    to: { zoneId: "specialHand", hostId: player },
    // @ts-expect-error The component must be accepted by the destination zone.
    componentId: "red",
  });
  tx.moveComponentToZone({
    to: { zoneId: "special" },
    // @ts-expect-error Shared destinations retain their accepted component identities.
    componentId: "red",
  });
  tx.moveComponentToZone({
    to: { zoneId: "hand", hostId: player },
    // @ts-expect-error Player destinations retain their accepted component identities.
    componentId: "blue",
  });
  tx.deal({
    from: { zoneId: "draw" },
    // @ts-expect-error Dealing requires overlapping source and destination component identities.
    to: { zoneId: "specialHand", hostId: player },
    count: 1,
  });
  // @ts-expect-error Immutable operation composition is removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Immutable operation composition is removed.
  reducer.createReducerOps<State>();
  // @ts-expect-error Immutable operation composition is removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Immutable operation composition is removed.
  reducer.pipe(tx.state);
  // @ts-expect-error Flat state mutation is removed.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Flat state mutation is removed.
  reducer.setActivePlayers(tx.state, []);
  // @ts-expect-error Transactions have no immutable-operation escape hatch.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Negative compiler proof: Transactions have no immutable-operation escape hatch.
  tx.apply((state: State) => state);
  return tx.state;
}
