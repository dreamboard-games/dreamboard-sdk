import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "river-guild.setup-and-determinism",
  description:
    "Normal seeded setup independently shuffles the complete cargo and instruction decks.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: [],
  when: [],
  then: ({ expect, state, view }) => {
    const cargoIds = [
      ...state().table.zones.shared.river,
      ...state().table.zones.shared["cargo-deck"],
    ];
    const instructionIds = state().table.zones.shared["instruction-deck"];
    expect(cargoIds).toHaveLength(24);
    expect(new Set(cargoIds).size).toBe(24);
    expect(cargoIds.filter((id) => id.startsWith("timber-"))).toHaveLength(8);
    expect(cargoIds.filter((id) => id.startsWith("grain-"))).toHaveLength(8);
    expect(cargoIds.filter((id) => id.startsWith("ore-"))).toHaveLength(8);
    expect(instructionIds).toHaveLength(6);
    expect(new Set(instructionIds).size).toBe(6);
    expect(view({ seat: 0 }).river.map(({ id }) => id)).toEqual([
      "timber-1-1",
      "ore-2-3",
      "grain-2-1",
      "timber-3-2",
    ]);
    expect(view({ seat: 0 }).cargoDeckCount).toBe(20);
    expect(view({ seat: 0 }).rival.instructionDeckCount).toBe(6);
  },
});
