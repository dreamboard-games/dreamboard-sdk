import { FRONTIER_GEOMETRY } from "../../app/model";
import { asPlayerId } from "@dreamboard-games/sdk/reducer";
import { defineScenario } from "../testing-types.ts";
import { STANDARD_SETUP_COMMANDS } from "../scenario-commands.ts";

export default defineScenario({
  id: "stormtrail.topology-and-setup",
  description:
    "The fixed seven-hex map receives one adjacent camp-and-trail pair per crew in seat order and grants adjacent starting supplies.",
  setup: { players: 3, seed: 1 },
  checkpoints: {
    opening: { segment: "setup", completed: 0 },
  },
  given: STANDARD_SETUP_COMMANDS.slice(0, -1),
  when: STANDARD_SETUP_COMMANDS.slice(-1),
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("roll");
    expect(state().flow.activePlayers).toEqual([asPlayerId("player-1")]);
    expect(state().publicState.setup).toBeNull();
    expect(view({ seat: 0 }).hexes).toEqual([
      {
        id: "centralBarrens",
        terrain: "barrens",
        number: null,
        resourceId: null,
      },
      {
        id: "northEastClay",
        terrain: "clayFlats",
        number: 6,
        resourceId: "brick",
      },
      {
        id: "northForest",
        terrain: "pineForest",
        number: 5,
        resourceId: "timber",
      },
      {
        id: "northWestFields",
        terrain: "grainFields",
        number: 10,
        resourceId: "provisions",
      },
      {
        id: "southEastFields",
        terrain: "grainFields",
        number: 8,
        resourceId: "provisions",
      },
      {
        id: "southForest",
        terrain: "pineForest",
        number: 9,
        resourceId: "timber",
      },
      {
        id: "southWestClay",
        terrain: "clayFlats",
        number: 4,
        resourceId: "brick",
      },
    ]);
    expect(view({ seat: 0 }).campsByIntersectionId).toEqual({
      [FRONTIER_GEOMETRY.vertexAt("northForest", 1)]: "player-1",
      [FRONTIER_GEOMETRY.vertexAt("southEastFields", 3)]: "player-2",
      [FRONTIER_GEOMETRY.vertexAt("southWestClay", 5)]: "player-3",
    });
    expect(view({ seat: 0 }).mySupplies).toEqual({
      brick: 1,
      provisions: 0,
      timber: 1,
    });
    expect(view({ seat: 1 }).mySupplies).toEqual({
      brick: 0,
      provisions: 1,
      timber: 1,
    });
    expect(view({ seat: 2 }).mySupplies).toEqual({
      brick: 1,
      provisions: 1,
      timber: 0,
    });
  },
});
