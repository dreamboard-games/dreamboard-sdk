import { describe, expect, test } from "vitest";
import { acceptResult, endGameResult } from "./trusted-runtime-result";
import { gameEvent } from "../../game-event";

const state = {
  table: { playerOrder: ["player-1", "player-2"] },
  flow: { currentPhase: "score" },
};

describe("endGameResult", () => {
  test("acceptResult normalizes bounded system action events", () => {
    const result = acceptResult(state, {
      events: [
        gameEvent.systemAction({
          procedureId: "river-advance",
          title: "The river advanced",
          summary: "A card moved through the public river.",
          details: [
            { label: "Discarded", value: "Ford" },
            { label: "Revealed", value: "Storm" },
            { label: "Threat", value: 2 },
            { label: "Safe", value: false },
          ],
        }),
      ],
    });

    expect(result.events).toEqual([
      {
        kind: "systemAction",
        procedureId: "river-advance",
        title: "The river advanced",
        summary: "A card moved through the public river.",
        details: [
          { label: "Discarded", value: "Ford" },
          { label: "Revealed", value: "Storm" },
          { label: "Threat", value: 2 },
          { label: "Safe", value: false },
        ],
      },
    ]);
  });

  test("acceptResult rejects malformed game events", () => {
    expect(() =>
      acceptResult(state, {
        events: [
          gameEvent.systemAction({
            procedureId: "",
            title: "Bad event",
          }),
        ],
      }),
    ).toThrow("procedureId must be a non-empty string");

    expect(() =>
      acceptResult(state, {
        events: [
          gameEvent.systemAction({
            procedureId: "bad-number",
            title: "Bad number",
            details: [{ label: "Amount", value: Infinity }],
          }),
        ],
      }),
    ).toThrow("finite number");
  });

  test("normalizes canonical GameOutcome standings by rank then player order", () => {
    const result = endGameResult(state, {
      reason: {
        code: "ROUND_LIMIT_REACHED",
        message: "The final round is complete.",
      },
      standings: [
        {
          playerId: "player-2",
          rank: 1,
          result: "draw",
          score: 21,
          tieBreaks: [{ id: "coins", label: "Coins", value: 3 }],
        },
        {
          playerId: "player-1",
          rank: 1,
          result: "draw",
          score: 21,
          scoreBreakdown: [
            { id: "guild-sets", label: "Guild sets", value: 12 },
            { id: "prestige", label: "Prestige", value: 9 },
          ],
          tieBreaks: [{ id: "coins", label: "Coins", value: 3 }],
        },
      ],
    });

    expect(
      result.terminal.standings.map((standing) => standing.playerId),
    ).toEqual(["player-1", "player-2"]);
  });

  test("rejects missing, duplicate, and unknown players", () => {
    expect(() =>
      endGameResult(state, {
        reason: { code: "MISSING_PLAYER" },
        standings: [{ playerId: "player-1", rank: 1, result: "win" }],
      }),
    ).toThrow("missing player 'player-2'");

    expect(() =>
      endGameResult(state, {
        reason: { code: "DUPLICATE_PLAYER" },
        standings: [
          { playerId: "player-1", rank: 1, result: "win" },
          { playerId: "player-1", rank: 2, result: "loss" },
        ],
      }),
    ).toThrow("duplicate player 'player-1'");

    expect(() =>
      endGameResult(state, {
        reason: { code: "UNKNOWN_PLAYER" },
        standings: [
          { playerId: "player-1", rank: 1, result: "win" },
          { playerId: "player-3", rank: 2, result: "loss" },
        ],
      }),
    ).toThrow("unknown player 'player-3'");
  });

  test("rejects invalid ranks, non-finite values, and duplicate evidence ids", () => {
    expect(() =>
      endGameResult(state, {
        reason: { code: "BAD_RANK" },
        standings: [
          { playerId: "player-1", rank: 0, result: "win" },
          { playerId: "player-2", rank: 2, result: "loss" },
        ],
      }),
    ).toThrow("invalid rank");

    expect(() =>
      endGameResult(state, {
        reason: { code: "BAD_SCORE" },
        standings: [
          { playerId: "player-1", rank: 1, result: "win", score: Infinity },
          { playerId: "player-2", rank: 2, result: "loss" },
        ],
      }),
    ).toThrow("finite number");

    expect(() =>
      endGameResult(state, {
        reason: { code: "DUPLICATE_BREAKDOWN" },
        standings: [
          {
            playerId: "player-1",
            rank: 1,
            result: "win",
            scoreBreakdown: [
              { id: "sets", label: "Sets", value: 4 },
              { id: "sets", label: "Sets again", value: 2 },
            ],
          },
          { playerId: "player-2", rank: 2, result: "loss" },
        ],
      }),
    ).toThrow("duplicate id 'sets'");
  });
});
