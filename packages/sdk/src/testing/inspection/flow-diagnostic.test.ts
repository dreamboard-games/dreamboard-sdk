import { describe, expect, test } from "vitest";
import { createFlowDiagnostic } from "./flow-diagnostic.js";

const playerIds = ["player-1", "player-2", "player-3"];

describe("flow diagnostic", () => {
  test("does not describe inactive ordinary-turn players as blocked", () => {
    expect(
      createFlowDiagnostic({
        playerIds,
        scheduler: {
          phase: "turn",
          step: null,
          activePlayerIds: ["player-2"],
          pendingPlayerIds: [],
        },
      }),
    ).toEqual({
      phase: "turn",
      step: null,
      activeActors: [{ seat: 1, playerId: "player-2" }],
      pendingActors: [],
      continuationWaiters: [],
      blockedBy: [],
    });
  });

  test("orders trusted simultaneous obligations and causal edges by seat", () => {
    expect(
      createFlowDiagnostic({
        playerIds,
        scheduler: {
          phase: "respond",
          step: "commit",
          activePlayerIds: ["player-3", "player-1"],
          pendingPlayerIds: ["player-3", "player-1"],
          continuationDependencies: [
            {
              waiterPlayerId: "player-2",
              blockerPlayerIds: ["player-3", "player-1"],
            },
          ],
        },
      }),
    ).toMatchObject({
      activeActors: [
        { seat: 0, playerId: "player-1" },
        { seat: 2, playerId: "player-3" },
      ],
      pendingActors: [
        { seat: 0, playerId: "player-1" },
        { seat: 2, playerId: "player-3" },
      ],
      continuationWaiters: [{ seat: 1, playerId: "player-2" }],
      blockedBy: [
        {
          actor: { seat: 1, playerId: "player-2" },
          blockers: [
            { seat: 0, playerId: "player-1" },
            { seat: 2, playerId: "player-3" },
          ],
          source: "scheduler",
        },
      ],
    });
  });

  test("omits unknown or unproven scheduler identities", () => {
    expect(
      createFlowDiagnostic({
        playerIds,
        scheduler: {
          phase: "turn",
          step: null,
          activePlayerIds: ["not-a-session-player"],
          pendingPlayerIds: [],
          continuationDependencies: [
            {
              waiterPlayerId: "player-1",
              blockerPlayerIds: ["not-a-session-player"],
            },
          ],
        },
      }),
    ).toMatchObject({
      activeActors: [],
      continuationWaiters: [],
      blockedBy: [],
    });
  });
});
