import { test, expect } from "vitest";
import type { GameTopologyManifest } from "@dreamboard-games/sdk-types";

test("materializeManifestTable rejects player-scoped seed homes without ownerId", async () => {
  const { materializeManifestTable } =
    await import("@dreamboard-games/workspace-codegen");

  const manifest = {
    players: {
      minPlayers: 2,
      maxPlayers: 2,
      optimalPlayers: 2,
    },
    cardSets: [],
    zones: [
      {
        id: "main-hand",
        name: "Main Hand",
        scope: "perPlayer",
      },
    ],
    boardTemplates: [],
    boards: [
      {
        id: "player-mat",
        name: "Player Mat",
        layout: "square",
        scope: "perPlayer",
        spaces: [{ id: "camp", row: 0, col: 0 }],
        relations: [],
        containers: [],
        edges: [],
        vertices: [],
      },
    ],
    pieceTypes: [{ id: "meeple", name: "Meeple" }],
    pieceSeeds: [
      {
        id: "worker-a",
        typeId: "meeple",
        home: {
          type: "space",
          boardId: "player-mat",
          spaceId: "camp",
        },
      },
    ],
    dieTypes: [{ id: "d6", name: "D6", sides: 6 }],
    dieSeeds: [
      {
        id: "die-a",
        typeId: "d6",
        home: {
          type: "zone",
          zoneId: "main-hand",
        },
      },
    ],
    resources: [],
    setupOptions: [],
    setupProfiles: [],
  } satisfies GameTopologyManifest;

  expect(() =>
    materializeManifestTable({
      manifest,
      playerIds: ["player-1", "player-2"],
      shuffleItems: <Value>(values: readonly Value[]) => [...values],
    }),
  ).toThrow(
    "manifest.pieceSeeds[0].home.boardId: Piece seed 'worker-a' requires ownerId because board 'player-mat' has scope 'perPlayer'. Add ownerId to resolve the player-scoped destination.",
  );
});
