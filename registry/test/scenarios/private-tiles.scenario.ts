import { createScenarioAuthoring } from "@dreamboard-games/sdk/testing";
import { privateTilesGame } from "../../stories/private-tiles-game";
const { defineScenario } = createScenarioAuthoring(privateTilesGame);
export default defineScenario({
  id: "registry.private-tiles",
  description:
    "A concealed independent back is placed, then revealed through an accepted action.",
  setup: { players: 2, seed: 1 },
  given: [],
  checkpoints: {
    opening: { segment: "given", completed: 0 },
    concealed: { segment: "when", completed: 2 },
  },
  when: [
    { actor: { seat: 0 }, interactionId: "place", params: { tile: "island" } },
    {
      actor: { seat: 0 },
      interactionId: "place",
      params: { confirm: "place" },
    },
    { actor: { seat: 1 }, interactionId: "reveal", params: {} },
  ],
  then: ({ expect, state }) => {
    expect(state().table.componentLocations.island).toMatchObject({
      type: "OnBoard",
      boardId: "map",
      col: 0,
      row: 0,
    });
    expect(state().table.tiles.island.disclosure.face).toEqual({
      audience: "public",
    });
    expect(state().table.zones.bag.table).toEqual(["grove"]);
  },
});
