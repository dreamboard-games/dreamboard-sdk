import { defineScenario } from "../testing-types.ts";
import {
  DISCARD_BARRIER_PREFIX_COMMANDS,
  discard,
} from "../scenario-commands.ts";

export const discardBarrierSetup = { players: 3, seed: 1 } as const;
export const DISCARD_BARRIER_RESPONSES = [
  discard(1, { brick: 1, provisions: 3 }),
  discard(0, { brick: 4 }),
] as const;

export default defineScenario({
  id: "stormtrail.discard-barrier",
  description:
    "A legal hoarding replay reaches a turn-owner total of 8 and opponent total of 9 before both independently commit private exact-half discards.",
  setup: discardBarrierSetup,
  checkpoints: {
    "ready-to-discard": { segment: "given", completed: 179 },
  },
  given: DISCARD_BARRIER_PREFIX_COMMANDS,
  when: DISCARD_BARRIER_RESPONSES,
  then: ({ expect, interactions, state, view }) => {
    const finalState = state();
    expect(finalState.flow.currentPhase).toBe("moveBandits");
    expect(finalState.publicState.discardCountsByPlayerId).toEqual({
      "player-1": 4,
      "player-2": 4,
    });
    expect(view({ seat: 0 }).myLastDiscard).toEqual({ brick: 4 });
    expect(view({ seat: 1 }).myLastDiscard).toEqual({
      brick: 1,
      provisions: 3,
    });
    expect(view({ seat: 2 }).myLastDiscard).toBeNull();
    expect(view({ seat: 0 }).mySupplies).toEqual({
      brick: 2,
      provisions: 0,
      timber: 2,
    });
    expect(view({ seat: 1 }).mySupplies).toEqual({
      brick: 2,
      provisions: 3,
      timber: 0,
    });
    expect(
      interactions({ seat: 0 }).map(({ interactionId }) => interactionId),
    ).toEqual(["moveBandits"]);
  },
});
