import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "river-guild.no-fake-player",
  description:
    "The rival is public reducer state and never occupies a player-facing identity surface.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: [],
  when: [],
  then: ({ expect, state, view }) => {
    expect(state().table.playerOrder).toEqual(["player-1", "player-2"]);
    expect(view({ seat: 0 }).playerIds).toEqual(["player-1", "player-2"]);
    const serialized = JSON.stringify({
      state: state(),
      view: view({ seat: 0 }),
    });
    expect(serialized.includes("rivalPlayerId")).toBe(false);
    expect(serialized.includes("claimId")).toBe(false);
    expect(serialized.includes("processedClaims")).toBe(false);
  },
});
