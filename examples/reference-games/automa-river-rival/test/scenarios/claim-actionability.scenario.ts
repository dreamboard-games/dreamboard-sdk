import { defineScenario } from "../testing-types.ts";
import { claim } from "./commands.ts";

export default defineScenario({
  id: "river-guild.claim-actionability",
  description:
    "Only the active human may claim one current river card before exact-position refill.",
  setup: { players: 2, seed: 1, setupProfileId: "standard" },
  given: [claim(0, "timber-1-1")],
  when: [],
  then: ({ expect, interactions, state, view }) => {
    expect(view({ seat: 0 }).humanCargoByPlayer["player-1"]).toEqual([
      {
        id: "timber-1-1",
        cardType: "timber-1",
        name: "timber 1",
        cargoKind: "timber",
        value: 1,
      },
    ]);
    expect(view({ seat: 0 }).contributionByPlayer["player-1"]).toBe(1);
    expect(view({ seat: 1 }).river.map(({ id }) => id)).toEqual([
      "timber-2-1",
      "ore-2-3",
      "grain-2-1",
      "timber-3-2",
    ]);
    expect(state().publicState.activeHumanIndex).toBe(1);
    expect(
      interactions({ seat: 0 }).map(({ availability }) => availability?.status),
    ).toEqual(["notYourTurn"]);
    expect(
      interactions({ seat: 1 }).map(({ interactionId }) => interactionId),
    ).toEqual(["claimCargo"]);
  },
});
