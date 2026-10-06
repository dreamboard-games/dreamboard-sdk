import { createMutableRandomHelpers } from "../src/reducer/bundle/trusted/rng-sampler";
import { asPlayerId, type PlayerId } from "../src/reducer";

import type {
  RuntimeTableRecord,
  RuntimeHexBoardState,
} from "../src/reducer/model";
import { createReducerEdit } from "../src/reducer/transaction";

type BenchState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: "build"; activePlayers: PlayerId[] };
  phase: Record<string, never>;
  publicState: Record<string, never>;
  hiddenState: Record<string, never>;
  privateState: Record<string, Record<string, never>>;
};

const playerIds = [
  asPlayerId("player-1"),
  asPlayerId("player-2"),
  asPlayerId("player-3"),
  asPlayerId("player-4"),
] satisfies [PlayerId, PlayerId, PlayerId, PlayerId];

function createBenchState() {
  const cards = Object.fromEntries<RuntimeTableRecord["cards"][string]>(
    Array.from(
      { length: 60 },
      (_, index) =>
        [
          `card-${index}`,
          {
            id: `card-${index}`,
            cardSetId: "main",
            cardType: "resource",
            properties: {},
          },
        ] as const,
    ),
  );
  const pieces = Object.fromEntries<RuntimeTableRecord["pieces"][string]>([
    ["trail", { id: "trail", pieceTypeId: "trail", properties: {} }],
    ["camp", { id: "camp", pieceTypeId: "camp", properties: {} }],
    ...Array.from(
      { length: 58 },
      (_, index) =>
        [
          `piece-${index}`,
          {
            id: `piece-${index}`,
            pieceTypeId: "marker",
            properties: {},
          },
        ] as const,
    ),
  ]);
  const componentLocations = Object.fromEntries<
    RuntimeTableRecord["componentLocations"][string]
  >([
    ...Array.from(
      { length: 60 },
      (_, index) =>
        [
          `card-${index}`,
          {
            type: "InZone" as const,
            zoneId: "main-deck",
            hostId: "table",
            playedBy: null,
          },
        ] as const,
    ),
    ["trail", { type: "Detached" as const }],
    ["camp", { type: "Detached" as const }],
    ...Array.from(
      { length: 58 },
      (_, index) => [`piece-${index}`, { type: "Detached" as const }] as const,
    ),
  ]);
  const spaces = Object.fromEntries(
    Array.from(
      { length: 19 },
      (_, index) =>
        [
          `tile-${index}`,
          {
            id: `tile-${index}`,
            q: index % 5,
            r: Math.floor(index / 5),
            typeId: "land",
            fields: {},
          },
        ] as const,
    ),
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

  const island = {
    id: "island",
    baseId: "island",
    layout: "hex",
    typeId: "map",
    scope: "shared",
    orientation: "pointy",
    fields: {},
    spaces,
    relations: [],
    edges,
    vertices,
  } satisfies RuntimeHexBoardState;
  return {
    table: {
      playerOrder: playerIds,
      zones: {
        "main-deck": {
          table: Array.from({ length: 60 }, (_, index) => `card-${index}`),
        },
      },
      cards,
      pieces,
      dice: {},
      componentLocations,
      ownerOfCard: Object.fromEntries(
        Array.from({ length: 60 }, (_, index) => [`card-${index}`, null]),
      ),
      visibility: Object.fromEntries(
        Array.from(
          { length: 60 },
          (_, index) => [`card-${index}`, { faceUp: true }] as const,
        ),
      ),
      resources: Object.fromEntries(
        playerIds.map(
          (playerId) =>
            [
              playerId,
              playerId === "player-1"
                ? { wood: 8, brick: 8 }
                : { wood: 3, brick: 3 },
            ] as const,
        ),
      ),
      boards: {
        byId: {
          island,
        },
        hex: { island },
        square: {},
        network: {},
        track: {},
      },
    },
    flow: { currentPhase: "build", activePlayers: [playerIds[0]] },
    phase: {},
    publicState: {},
    hiddenState: {},
    privateState: {},
  } satisfies BenchState;
}

const baseState = createBenchState();
const edit = createReducerEdit<typeof baseState>({
  zoneDefinitions: {
    "main-deck": {
      scope: "shared",
      visibility: "public",
      allowedCardSetIds: ["main"],
    },
  },
});

function runFiveOpTransaction(): BenchState {
  const tx = edit(
    baseState,
    createMutableRandomHelpers({ seed: 42, cursor: 0, trace: [], draws: [] }),
  );
  tx.spendResources({
    playerId: playerIds[0],
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
    fromPlayerId: playerIds[0],
    toPlayerId: playerIds[1],
    amounts: { wood: 1 },
  });
  tx.setActivePlayers([playerIds[1]]);
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
