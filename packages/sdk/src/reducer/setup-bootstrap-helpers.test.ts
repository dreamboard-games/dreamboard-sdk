import { describe, expect, test } from "bun:test";
import {
  dealToPlayerBoardContainer,
  dealToPlayerZone,
  seedSharedBoardContainer,
  seedSharedBoardSpace,
  shuffle,
} from "./setup-bootstrap-helpers";

describe("setup bootstrap helpers", () => {
  test("shuffle emits a canonical shuffle step", () => {
    expect(
      shuffle({
        type: "sharedZone",
        zoneId: "draw-deck",
      }),
    ).toEqual({
      type: "shuffle",
      container: {
        type: "sharedZone",
        zoneId: "draw-deck",
      },
    });
  });

  test("deal helpers emit canonical deal steps", () => {
    expect(
      dealToPlayerZone({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        zoneId: "hand",
        count: 5,
      }),
    ).toEqual({
      type: "deal",
      from: {
        type: "sharedZone",
        zoneId: "draw-deck",
      },
      to: {
        type: "playerZone",
        zoneId: "hand",
      },
      count: 5,
      playerIds: undefined,
    });

    expect(
      dealToPlayerBoardContainer({
        from: {
          type: "sharedBoardContainer",
          boardId: "market",
          containerId: "offer-deck",
        },
        boardId: "player-mat",
        containerId: "reserve",
        count: 2,
        playerIds: ["player-1"],
      }),
    ).toEqual({
      type: "deal",
      from: {
        type: "sharedBoardContainer",
        boardId: "market",
        containerId: "offer-deck",
      },
      to: {
        type: "playerBoardContainer",
        boardId: "player-mat",
        containerId: "reserve",
      },
      count: 2,
      playerIds: ["player-1"],
    });
  });

  test("seed helpers emit canonical move steps", () => {
    expect(
      seedSharedBoardContainer({
        from: {
          type: "sharedZone",
          zoneId: "draw-deck",
        },
        boardId: "market",
        containerId: "offer",
        count: 4,
      }),
    ).toEqual({
      type: "move",
      from: {
        type: "sharedZone",
        zoneId: "draw-deck",
      },
      to: {
        type: "sharedBoardContainer",
        boardId: "market",
        containerId: "offer",
      },
      count: 4,
      componentIds: undefined,
    });

    expect(
      seedSharedBoardSpace({
        from: {
          type: "sharedBoardContainer",
          boardId: "frontier",
          containerId: "staging",
        },
        boardId: "frontier",
        spaceId: "hex-0-0",
        componentIds: ["scout-1"],
      }),
    ).toEqual({
      type: "move",
      from: {
        type: "sharedBoardContainer",
        boardId: "frontier",
        containerId: "staging",
      },
      to: {
        type: "sharedBoardSpace",
        boardId: "frontier",
        spaceId: "hex-0-0",
      },
      count: undefined,
      componentIds: ["scout-1"],
    });
  });
});
