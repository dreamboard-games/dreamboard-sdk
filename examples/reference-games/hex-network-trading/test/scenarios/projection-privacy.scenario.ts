import { defineScenario } from "../testing-types.ts";
import {
  DISCARD_BARRIER_PREFIX_COMMANDS,
  bandits,
  discard,
  offer,
} from "../scenario-commands.ts";

export default defineScenario({
  id: "stormtrail.projection-privacy",
  description:
    "Private discards and a seeded stolen type remain owner/participant scoped while public counts and bilateral offer terms stay shared.",
  setup: { players: 3, seed: 1 },
  given: [
    ...DISCARD_BARRIER_PREFIX_COMMANDS,
    discard(1, { brick: 1, provisions: 3 }),
    discard(0, { brick: 4 }),
  ],
  when: [
    bandits(0, "centralBarrens", 1),
    offer(0, 1, { timber: 1 }, { provisions: 1 }),
  ],
  then: ({ expect, state, view }) => {
    expect(state().flow.currentPhase).toBe("pendingTrade");
    expect(state().publicState.currentTrade).toEqual({
      offerorPlayerId: "player-1",
      targetPlayerId: "player-2",
      give: { timber: 1 },
      want: { provisions: 1 },
    });
    expect(view({ seat: 0 }).myLastDiscard).toEqual({ brick: 4 });
    expect(view({ seat: 1 }).myLastDiscard).toEqual({
      brick: 1,
      provisions: 3,
    });
    expect(view({ seat: 2 }).myLastDiscard).toBeNull();
    expect(view({ seat: 0 }).myLastStolenResourceId).toBe("brick");
    expect(view({ seat: 0 }).myLastStolenResourceId).toBe(
      view({ seat: 1 }).myLastStolenResourceId,
    );
    expect(view({ seat: 2 }).myLastStolenResourceId).toBeNull();
  },
});
