import { createMutableRandomHelpers } from "../src/reducer/bundle/trusted/rng-sampler";
import {
  asPlayerId,
  compileManifest,
  createTableQueries,
  hexagon,
  z,
  type PlayerId,
} from "../src/reducer";
import type { RuntimeTableRecord } from "../src/reducer/model";
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
const manifest = compileManifest({
  players: { minPlayers: 4, maxPlayers: 4 },
  cardSets: [
    {
      id: "main",
      name: "Main",
      cardSchema: z.object({}),
      defaultHome: { type: "zone", zoneId: "main-deck" },
      cards: Array.from({ length: 60 }, (_, index) => ({
        id: `card-${index}`,
        name: `Card ${index}`,
        cardType: "resource",
        count: 1,
        properties: {},
      })),
    },
  ],
  zones: [
    {
      id: "main-deck",
      name: "Main deck",
      scope: "shared",
      allowedCardSetIds: ["main"],
    },
  ],
  boards: [
    {
      id: "island",
      name: "Island",
      layout: "hex",
      scope: "shared",
      orientation: "pointy",
    },
  ],
  ...hexagon({
    boardId: "island",
    tileTypeId: "island",
    tileId: "island",
    radius: 2,
  }),
  pieceTypes: [
    { id: "trail", name: "Trail" },
    { id: "camp", name: "Camp" },
    { id: "marker", name: "Marker" },
  ],
  pieceSeeds: [
    { id: "trail", typeId: "trail" },
    { id: "camp", typeId: "camp" },
    { id: "piece", typeId: "marker", count: 58 },
  ],
  resources: [
    { id: "wood", name: "Wood" },
    { id: "brick", name: "Brick" },
  ],
});
function createBenchState() {
  const table = manifest.createInitialTable({ playerIds });
  for (const playerId of playerIds)
    table.resources[playerId] =
      playerId === playerIds[0] ? { wood: 8, brick: 8 } : { wood: 3, brick: 3 };
  return {
    table,
    flow: { currentPhase: "build", activePlayers: [playerIds[0]] },
    phase: {},
    publicState: {},
    hiddenState: {},
    privateState: {},
  } satisfies BenchState;
}
const baseState = createBenchState();
const board = createTableQueries(baseState.table, manifest).board("island");
const edgeId = board.edges[0].id;
const vertexId = board.vertices[0].id;
const edit = createReducerEdit<typeof baseState, typeof manifest>(manifest);

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
    edgeId,
  });
  tx.moveComponentToVertex({
    componentId: "camp",
    boardId: "island",
    vertexId,
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
