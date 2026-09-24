import { many } from "@dreamboard-games/sdk/reducer";
import type { CardId } from "../manifest";
import { hearts } from "../game-model";

// Simultaneous-pass barrier: every seated player picks three cards, the trusted
// runtime seals each submission until all four are in, then `resolve` runs
// once with every submission and we redistribute the cards atomically.
// The pass direction is "left" — each player passes to the next seat in turn
// order, with wrap-around.
const passing = hearts.phase("passing");

export default passing.define({
  kind: "simultaneousPlayer",
  initialState: () => ({}),
  actors: ({ q }) => q.player.order(),
  zones: ["hand"],
  submit: {
    presentation: {
      label: "Pass three cards left",
      help: "Commit exactly three distinct cards from your original hand.",
    },
    commit: { mode: "manual" },
    inputs: {
      // `from: ["hand"]` limits candidates to the actor's own hand, so each
      // seated player can only nominate cards they actually hold. The trusted
      // runtime evaluates it per-actor for eligibility and again at submit.
      cardIds: many(passing.inputs.card({ from: ["hand"] }), {
        count: 3,
        distinct: true,
      }),
    },
  },
  resolve({ tx, submissions, q }) {
    const order = q.player.order();
    const cardIdsByPlayer: Partial<
      Record<(typeof order)[number], readonly CardId[]>
    > = {};

    for (const submission of Object.values(submissions)) {
      cardIdsByPlayer[submission.playerId] = submission.params.cardIds;
    }

    tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "left",
      players: order,
      cardIdsByPlayer,
    });

    tx.setActivePlayers([]);
    return tx.transition("playing");
  },
});
