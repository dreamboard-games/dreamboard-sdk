import { defineScenario } from "../testing-types.ts";
import { claim } from "./commands.ts";

export default defineScenario({
  id: "river-guild.procedure-events",
  description:
    "One rival procedure emits its public reveal, resolution, refill, and round transition after both humans claim.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: [claim(0, "timber-1-1")],
  when: [claim(1, "timber-2-1")],
  then: ({ expect, state, view }) => {
    expect(state().publicState.procedureEvents).toEqual([
      {
        kind: "river-refilled",
        round: 1,
        cargoId: "timber-2-1",
        position: 0,
        source: "human",
        playerId: "player-1",
      },
      {
        kind: "river-refilled",
        round: 1,
        cargoId: "grain-1-1",
        position: 0,
        source: "human",
        playerId: "player-2",
      },
      {
        kind: "rival-instruction-revealed",
        round: 1,
        instructionId: "claim-highest-1",
        instructionKind: "claimHighest",
      },
      {
        kind: "rival-cargo-claimed",
        round: 1,
        cargoId: "timber-3-2",
        cargoKind: "timber",
        value: 3,
        position: 3,
        rivalProgress: 3,
      },
      {
        kind: "river-refilled",
        round: 1,
        cargoId: "grain-3-2",
        position: 3,
        source: "rival",
      },
      { kind: "river-round-advanced", completedRound: 1, nextRound: 2 },
    ]);
    expect(state().publicState.round).toBe(2);
    expect(view({ seat: 0 }).rival.instructionHistory).toHaveLength(1);
    expect(view({ seat: 0 }).rival.claimedCargo).toHaveLength(1);
  },
});
