import * as reducer from "../src/reducer.js";
import type { ReducerTransaction } from "../src/reducer.js";
import type { RuntimeTableRecord } from "../src/reducer/advanced.js";

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
  "boards" | "decks" | "hands" | "cards" | "componentLocations" | "dice"
> & {
  boards: Omit<RuntimeTableRecord["boards"], "byId"> & {
    byId: { north: Board<"north">; south: Board<"south"> };
  };
  dice: { d6: RuntimeTableRecord["dice"][string] };
  decks: { draw: "red"[]; special: "blue"[] };
  hands: {
    hand: Record<string, "red"[]>;
    played: Record<string, "red"[]>;
    specialHand: Record<string, "blue"[]>;
  };
  cards: Record<"red" | "blue", RuntimeTableRecord["cards"][string]>;
  componentLocations: Record<
    "red" | "blue" | "piece",
    RuntimeTableRecord["componentLocations"][string]
  >;
};
type State = { table: Table };

export function assertTransactionContract(
  tx: ReducerTransaction<State>,
): State {
  const result: number = tx.roll("d6");
  void result;
  tx.shuffle({ zoneId: "draw" });
  tx.shuffle({ zoneId: "hand", playerId: "player" });
  // @ts-expect-error A declared die ID is required.
  tx.roll("missing");
  // @ts-expect-error A player zone needs its seat.
  tx.shuffle({ zoneId: "hand" });
  // @ts-expect-error Shared zones cannot be shuffled as player zones.
  tx.shuffle({ zoneId: "draw", playerId: "player" });
  // @ts-expect-error Effects have been removed.
  tx.effect({});
  // @ts-expect-error Scheduling has been removed.
  tx.schedule({});
  // @ts-expect-error The old deal name has been removed.
  tx.dealCardsToPlayerZone({});
  // @ts-expect-error Staged authoring has been removed.
  reducer.defineStepPhase();
  // @ts-expect-error Card actions use ordinary interactions.
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

  tx.moveCardBetweenPlayerZones({
    playerId: "player",
    fromZoneId: "hand",
    toZoneId: "played",
    cardId: "red",
  });
  tx.moveCardFromPlayerZoneToSharedZone({
    playerId: "player",
    fromZoneId: "hand",
    toZoneId: "draw",
    cardId: "red",
  });
  tx.moveCardFromSharedZoneToPlayerZone({
    playerId: "player",
    fromZoneId: "draw",
    toZoneId: "hand",
    cardId: "red",
  });
  tx.deal({
    playerId: "player",
    fromZoneId: "draw",
    toZoneId: "hand",
    count: 1,
  });
  tx.moveCardBetweenPlayerZones({
    playerId: "player",
    fromZoneId: "hand",
    toZoneId: "specialHand",
    // @ts-expect-error The card must be accepted by both player zones.
    cardId: "red",
  });
  tx.moveCardFromPlayerZoneToSharedZone({
    playerId: "player",
    fromZoneId: "hand",
    toZoneId: "special",
    // @ts-expect-error The card must be accepted by both source hand and deck.
    cardId: "red",
  });
  tx.moveCardFromSharedZoneToPlayerZone({
    playerId: "player",
    fromZoneId: "special",
    toZoneId: "hand",
    // @ts-expect-error The card must be accepted by both source deck and hand.
    cardId: "blue",
  });
  tx.deal({
    playerId: "player",
    fromZoneId: "draw",
    // @ts-expect-error Dealing requires compatible deck and hand card sets.
    toZoneId: "specialHand",
    count: 1,
  });
  // @ts-expect-error Immutable operation composition is removed.
  reducer.createReducerOps<State>();
  // @ts-expect-error Immutable operation composition is removed.
  reducer.pipe(tx.state);
  // @ts-expect-error Flat state mutation is removed.
  reducer.setActivePlayers(tx.state, []);
  // @ts-expect-error Transactions have no immutable-operation escape hatch.
  tx.apply((state: State) => state);
  return tx.state;
}
