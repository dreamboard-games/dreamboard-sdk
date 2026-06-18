import { z } from "zod";
import type { CardId } from "../../shared/manifest-contract";
import type { GameContract, GameState } from "../game-contract";
import {
  cardInput,
  cardTarget,
  definePhase,
  many,
} from "@dreamboard-games/sdk/reducer";

const passingPhaseStateSchema = z.object({});

// `cardTarget.zones(["hand"])` filters eligible cards to the actor's own
// per-player hand zone, so each seated player can only nominate a card they
// actually hold. The trusted runtime evaluates the rule per-actor when
// projecting eligible targets and again at submit-validation time.
const handCardTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .build();

// Simultaneous-pass barrier: every seated player picks three cards, the trusted
// runtime seals each submission until all four are in, then `resolve` runs
// once with every submission and we redistribute the cards atomically.
// The pass direction is "left" — each player passes to the next seat in turn
// order, with wrap-around.
export const passing = definePhase<GameContract>()({
  kind: "simultaneousPlayer",
  state: passingPhaseStateSchema,
  initialState: () => ({}),
  actors: ({ q }) => q.player.order(),
  zones: ["hand"],
  submit: {
    commit: { mode: "manual" },
    inputs: {
      cardIds: many(
        cardInput<GameState, CardId, readonly ["hand"]>({
          target: handCardTarget,
        }),
        {
          count: 3,
          distinct: true,
        },
      ),
    },
  },
  resolve({ state, submissions, accept, edit, fx, q }) {
    const order = q.player.order();
    const cardIdsByPlayer: Partial<
      Record<(typeof order)[number], readonly CardId[]>
    > = {};

    for (const submission of Object.values(submissions)) {
      cardIdsByPlayer[submission.playerId] = submission.params.cardIds;
    }

    const tx = edit(state);
    tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "left",
      players: order,
      cardIdsByPlayer,
    });

    return accept(tx.state, [fx.transition("playing")]);
  },
});
