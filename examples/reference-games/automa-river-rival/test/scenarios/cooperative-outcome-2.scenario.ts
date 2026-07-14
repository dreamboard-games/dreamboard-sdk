import { defineScenario } from "../testing-types.ts";
import { COMPLETE_GAME_COMMANDS } from "./commands.ts";

export default defineScenario({
  id: "river-guild.cooperative-outcome-2",
  description:
    "Both human standings share rank, result, score, and stable seat contributions.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: COMPLETE_GAME_COMMANDS.slice(0, -1),
  when: COMPLETE_GAME_COMMANDS.slice(-1),
  then: ({ expect, state }) => {
    const standings = state().publicState.outcome?.standings ?? [];
    expect(standings).toHaveLength(2);
    expect(standings.map(({ rank }) => rank)).toEqual([1, 1]);
    expect(standings.map(({ result }) => result)).toEqual(["win", "win"]);
    expect(standings.map(({ score }) => score)).toEqual([24, 24]);
    expect(standings.map(({ scoreBreakdown }) => scoreBreakdown)).toEqual([
      [
        { id: "seat-1-contribution", label: "Seat 1 cargo", value: 10 },
        { id: "seat-2-contribution", label: "Seat 2 cargo", value: 14 },
      ],
      [
        { id: "seat-1-contribution", label: "Seat 1 cargo", value: 10 },
        { id: "seat-2-contribution", label: "Seat 2 cargo", value: 14 },
      ],
    ]);
  },
});
