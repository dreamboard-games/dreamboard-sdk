import {
  createReducerEdit,
  perPlayer,
  type PlayerId,
  type RuntimeTableRecord,
} from "../src/reducer";

type BenchState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: "build"; activePlayers: PlayerId[] };
  phase: Record<string, never>;
  publicState: Record<string, never>;
  hiddenState: Record<string, never>;
  privateState: Record<string, Record<string, never>>;
};

const playerIds = ["player-1", "player-2", "player-3", "player-4"].map(
  (id) => id as PlayerId,
);

function createBenchState(): BenchState {
  const cards = Object.fromEntries(
    Array.from({ length: 60 }, (_, index) => [
      `card-${index}`,
      {
        id: `card-${index}`,
        cardSetId: "main",
        cardType: "resource",
        properties: {},
      },
    ]),
  );
  const pieces = Object.fromEntries([
    ["trail", { id: "trail", pieceTypeId: "trail", properties: {} }],
    ["camp", { id: "camp", pieceTypeId: "camp", properties: {} }],
    ...Array.from({ length: 58 }, (_, index) => [
      `piece-${index}`,
      {
        id: `piece-${index}`,
        pieceTypeId: "marker",
        properties: {},
      },
    ]),
  ]);
  const componentLocations = Object.fromEntries([
    ...Array.from({ length: 60 }, (_, index) => [
      `card-${index}`,
      {
        type: "InDeck" as const,
        deckId: "main-deck",
        playedBy: null,
        position: index,
      },
    ]),
    ["trail", { type: "Detached" as const }],
    ["camp", { type: "Detached" as const }],
    ...Array.from({ length: 58 }, (_, index) => [
      `piece-${index}`,
      { type: "Detached" as const },
    ]),
  ]);
  const spaces = Object.fromEntries(
    Array.from({ length: 19 }, (_, index) => [
      `tile-${index}`,
      {
        id: `tile-${index}`,
        q: index % 5,
        r: Math.floor(index / 5),
        typeId: "land",
        fields: {},
      },
    ]),
  );
  const edges = Array.from({ length: 72 }, (_, index) => ({
    id: `edge-${index}`,
    spaceIds: [`tile-${index % 19}`, `tile-${(index + 1) % 19}`],
    typeId: null,
    label: null,
    ownerId: null,
    fields: {},
  }));
  const vertices = Array.from({ length: 54 }, (_, index) => ({
    id: `vertex-${index}`,
    spaceIds: [
      `tile-${index % 19}`,
      `tile-${(index + 1) % 19}`,
      `tile-${(index + 2) % 19}`,
    ],
    typeId: null,
    label: null,
    fields: {},
  }));

  return {
    table: {
      playerOrder: playerIds,
      zones: {
        shared: {
          "main-deck": Array.from(
            { length: 60 },
            (_, index) => `card-${index}`,
          ),
        },
        perPlayer: {},
        visibility: { "main-deck": "public" },
      },
      decks: {
        "main-deck": Array.from({ length: 60 }, (_, index) => `card-${index}`),
      },
      hands: {},
      handVisibility: {},
      cards,
      pieces,
      dice: {},
      componentLocations,
      ownerOfCard: Object.fromEntries(
        Array.from({ length: 60 }, (_, index) => [`card-${index}`, null]),
      ),
      visibility: Object.fromEntries(
        Array.from({ length: 60 }, (_, index) => [
          `card-${index}`,
          { faceUp: true },
        ]),
      ),
      resources: perPlayer(playerIds, (playerId) =>
        playerId === ("player-1" as PlayerId)
          ? { wood: 8, brick: 8 }
          : { wood: 3, brick: 3 },
      ),
      boards: {
        byId: {
          island: {
            id: "island",
            baseId: "island",
            layout: "hex",
            typeId: "map",
            scope: "shared",
            orientation: "pointy-top",
            fields: {},
            spaces,
            relations: [],
            containers: {},
            edges,
            vertices,
          },
        },
      },
      slots: {},
    },
    flow: { currentPhase: "build", activePlayers: [playerIds[0]!] },
    phase: {},
    publicState: {},
    hiddenState: {},
    privateState: {},
  };
}

const baseState = createBenchState();
const edit = createReducerEdit<BenchState>();

function runFiveOpTransaction(): BenchState {
  const tx = edit(baseState);
  tx.spendResources({
    playerId: playerIds[0]!,
    amounts: { wood: 1, brick: 1 },
  });
  tx.moveComponentToEdge({
    componentId: "trail",
    boardId: "island",
    edgeId: "edge-0",
  });
  tx.moveComponentToVertex({
    componentId: "camp",
    boardId: "island",
    vertexId: "vertex-0",
  });
  tx.transferResources({
    fromPlayerId: playerIds[0]!,
    toPlayerId: playerIds[1]!,
    amounts: { wood: 1 },
  });
  tx.setActivePlayers([playerIds[1]!]);
  return tx.state;
}

const warmupIterations = 1_000;
const measuredIterations = 50_000;

for (let index = 0; index < warmupIterations; index += 1) {
  runFiveOpTransaction();
}

const startedAt = performance.now();
for (let index = 0; index < measuredIterations; index += 1) {
  runFiveOpTransaction();
}
const elapsedMs = performance.now() - startedAt;
const opsPerSecond = measuredIterations / (elapsedMs / 1_000);

console.log(
  JSON.stringify(
    {
      name: "5-op reduce transaction",
      iterations: measuredIterations,
      elapsedMs,
      opsPerSecond,
    },
    null,
    2,
  ),
);
