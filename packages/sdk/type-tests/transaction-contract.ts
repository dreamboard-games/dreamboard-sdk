import * as reducer from "../src/reducer.js";
import {
  asPlayerId,
  type PlayerId,
  type ReducerTransaction,
} from "../src/reducer.js";
import type { TableQueries } from "../src/reducer/model.js";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

const manifestInput = {
  players: { minPlayers: 1, maxPlayers: 4 },
  cardSets: [
    {
      id: "main",
      name: "Main",
      cardSchema: reducer.z.object({}),
      defaultHome: { type: "detached" },
      cards: [
        { id: "red", name: "Red", cardType: "red", count: 1, properties: {} },
      ],
    },
    {
      id: "special",
      name: "Special",
      cardSchema: reducer.z.object({}),
      defaultHome: { type: "detached" },
      cards: [
        {
          id: "blue",
          name: "Blue",
          cardType: "blue",
          count: 1,
          properties: {},
        },
      ],
    },
  ],
  zones: [
    {
      id: "cargo",
      name: "Cargo",
      attachedTo: { board: "north" },
      allowedCardSetIds: ["main"],
    },
    { id: "draw", name: "Draw", scope: "shared", allowedCardSetIds: ["main"] },
    {
      id: "special",
      name: "Special",
      scope: "shared",
      allowedCardSetIds: ["special"],
    },
    {
      id: "hand",
      name: "Hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["main"],
    },
    {
      id: "played",
      name: "Played",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["main"],
    },
    {
      id: "specialHand",
      name: "Special hand",
      scope: "perPlayer",
      visibility: "ownerOnly",
      allowedCardSetIds: ["special"],
    },
  ],
  boards: [
    { id: "north", name: "North", layout: "hex", scope: "shared" },
    { id: "south", name: "South", layout: "hex", scope: "shared" },
    {
      id: "northTrack",
      name: "North track",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "north-space" }],
    },
    {
      id: "southTrack",
      name: "South track",
      layout: "generic",
      scope: "shared",
      spaces: [{ id: "south-space" }],
    },
  ],
  tileTypes: [
    {
      id: "land",
      name: "Land",
      layout: "hex",
      cells: [{ id: "center", at: { q: 0, r: 0 } }],
    },
  ],
  tileSeeds: [
    {
      id: "northTile",
      typeId: "land",
      home: {
        type: "board",
        boardId: "north",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
    {
      id: "southTile",
      typeId: "land",
      home: {
        type: "board",
        boardId: "south",
        layout: "hex",
        q: 0,
        r: 0,
        rotation: 0,
      },
    },
  ],
  pieceTypes: [{ id: "token", name: "Token" }],
  pieceSeeds: [{ id: "piece", typeId: "token" }],
  dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
  dieSeeds: [{ id: "d6", typeId: "d6" }],
} as const;
const manifest = reducer.compileManifest(manifestInput);
type Table = ReturnType<typeof manifest.createInitialTable>;
type State = { table: Table };

export function assertZoneQueryContract(
  q: TableQueries<Table, typeof manifest>,
  player: PlayerId,
): void {
  const cards = q.zone.cards("draw");
  type _AllowedCards = Expect<Equal<(typeof cards.cardIds)[number], "red">>;
  const mixed = q.zone("hand", player);
  type _MixedComponents = Expect<
    Equal<
      (typeof mixed)[number],
      "red" | "piece" | "d6" | "northTile" | "southTile"
    >
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
  tx: ReducerTransaction<State, string, typeof manifest>,
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
    boardId: "northTrack",
    spaceId: "north-space",
  });
  tx.moveComponentToZone({
    componentId: "piece",
    to: { zoneId: "cargo", hostId: "north" },
  });
  tx.moveComponentToEdge({
    componentId: "piece",
    boardId: "north",
    edgeId: tx.q.board("north").edges[0].id,
  });
  tx.moveComponentToVertex({
    componentId: "piece",
    boardId: "north",
    vertexId: tx.q.board("north").vertices[0].id,
  });
  tx.moveComponentToSpace({
    componentId: "piece",
    boardId: "northTrack",
    // @ts-expect-error Space IDs belong to the selected board.
    spaceId: "south-space",
  });
  tx.moveComponentToZone({
    componentId: "piece",
    to: {
      zoneId: "cargo",
      // @ts-expect-error Attached zone host must belong to its declared board family.
      hostId: "south",
    },
  });
  tx.moveComponentToEdge({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Edge IDs belong to the selected board.
    edgeId: tx.q.board("south").edges[0].id,
  });
  tx.moveComponentToVertex({
    componentId: "piece",
    boardId: "north",
    // @ts-expect-error Vertex IDs belong to the selected board.
    vertexId: tx.q.board("south").vertices[0].id,
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
    // Pieces and dice are accepted by both zones despite disjoint card sets.
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

const cardOnlyManifest = reducer.compileManifest({
  ...manifestInput,
  boards: [],
  tileTypes: [],
  tileSeeds: [],
  pieceTypes: [],
  pieceSeeds: [],
  dieTypes: [],
  dieSeeds: [],
  zones: manifestInput.zones.filter((zone) => zone.id !== "cargo"),
});
type CardOnlyState = {
  table: ReturnType<typeof cardOnlyManifest.createInitialTable>;
};
export function assertDisjointDealContract(
  tx: ReducerTransaction<CardOnlyState, string, typeof cardOnlyManifest>,
  player: PlayerId,
): void {
  tx.deal({
    from: { zoneId: "draw" },
    // @ts-expect-error Card-only zones with disjoint card sets cannot exchange components.
    to: { zoneId: "specialHand", hostId: player },
    count: 1,
  });
}
