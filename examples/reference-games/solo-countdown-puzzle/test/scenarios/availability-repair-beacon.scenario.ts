import { repair } from "../scenario-commands.ts";
import { defineScenario } from "../testing-types.ts";

export default defineScenario({
  id: "last-light.availability-repair-beacon",
  description:
    "Repair targets only known beacons below level two and rejects full or unknown targets.",
  setup: { players: 1, seed: 13 },
  given: [repair("beacon-north")],
  when: [repair("beacon-north")],
  then: async ({ expect, probe, state }) => {
    expect(state().publicState.beacons["beacon-north"]).toBe(2);
    await expect(await probe(repair("beacon-north"))).toRejectWith({
      errorCode: "BEACON_ALREADY_LIT",
    });
    await expect(await probe(repair("empty-nw"))).toRejectWith({
      errorCode: "UNKNOWN_BEACON",
    });
  },
});
