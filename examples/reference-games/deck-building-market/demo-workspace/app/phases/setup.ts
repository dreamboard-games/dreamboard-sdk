import { z } from "zod";
import { definePhase } from "@dreamboard-games/sdk/reducer";
import { ids, type GameContract } from "../game-contract";
import { edit } from "../reducer-support";
import { shuffleOpeningDeck } from "../effects/deck";

const STARTER_DOODLE_COUNT = 7;
const STARTER_IDEA_COUNT = 3;

// Sketchbook setup deals each player a starter deck of 7 Doodles + 3
// Ideas from the shared supply piles, then draws an opening hand of 5
// cards. We do this imperatively in this phase's `enter` reducer rather
// than via declarative `setup-profiles.ts` bootstrap steps because the
// per-player gain pattern (one named card at a time) is the natural
// place to exercise the new `moveCardFromSharedZoneToPlayerZone` op.
//
// The starter order is deterministic but mixed, so the opening hand
// exercises both treasure and victory cards without depending on RNG.
export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: z.object({}),
  initialState: () => ({}),
  enter({ state, accept, q, fx }) {
    const order = q.player.order();
    const firstPlayer = order[0];
    if (!firstPlayer) {
      throw new Error("Sketchbook requires at least one player.");
    }

    // Snapshot the supply piles upfront, then partition disjoint id
    // ranges to each player. The reducer applies each op sequentially,
    // and `moveCardFromSharedZoneToPlayerZone` removes the named card
    // from its shared zone before the next op runs, so id-based moves
    // sidestep the "what's on top now?" question.
    const allDoodles = q.zone.sharedCards("supply-doodle");
    const allIdeas = q.zone.sharedCards("supply-idea");

    const tx = edit(state);
    tx.setActivePlayers([firstPlayer]);

    for (const [seatIndex, playerId] of order.entries()) {
      const doodleStart = seatIndex * STARTER_DOODLE_COUNT;
      const ideaStart = seatIndex * STARTER_IDEA_COUNT;
      const myDoodles = allDoodles.slice(
        doodleStart,
        doodleStart + STARTER_DOODLE_COUNT,
      );
      const myIdeas = allIdeas.slice(ideaStart, ideaStart + STARTER_IDEA_COUNT);
      const starterOrder = [
        myDoodles[0],
        myDoodles[1],
        myIdeas[0],
        myIdeas[1],
        myIdeas[2],
        myDoodles[2],
        myDoodles[3],
        myDoodles[4],
        myDoodles[5],
        myDoodles[6],
      ].filter((cardId): cardId is NonNullable<typeof cardId> =>
        Boolean(cardId),
      );
      for (const cardId of starterOrder) {
        tx.moveCardFromSharedZoneToPlayerZone({
          playerId,
          fromZoneId: cardId.startsWith("idea-")
            ? "supply-idea"
            : "supply-doodle",
          toZoneId: "deck",
          cardId,
        });
      }
    }

    return accept(tx.state, {
      instructions: order.map((playerId, index) =>
        fx.effect(shuffleOpeningDeck, {
          playerId,
          zoneId: "deck",
          context: {
            playerId,
            transitionToPlayerTurn: index === order.length - 1,
          },
        }),
      ),
    });
  },
});
