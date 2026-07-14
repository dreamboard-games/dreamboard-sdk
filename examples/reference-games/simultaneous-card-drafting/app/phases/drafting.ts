import type { CardId } from "../../shared/manifest-contract";
import type { GameContract, GameState } from "../game-contract";
import { draftingPhaseStateSchema } from "../game-contract";
import {
  cardInput,
  cardTarget,
  definePhase,
} from "@dreamboard-games/sdk/reducer";

const HAND_ZONES = ["hand"] as const;
const handCardTarget = cardTarget
  .zones<GameState, CardId, typeof HAND_ZONES>(HAND_ZONES)
  .build();

export const drafting = definePhase<GameContract>()({
  kind: "simultaneousPlayer",
  state: draftingPhaseStateSchema,
  initialState: () => ({}),
  actors: ({ q }) => q.player.order(),
  zones: ["hand"],
  submit: {
    commit: { mode: "manual" },
    inputs: {
      cardId: cardInput<GameState, CardId, typeof HAND_ZONES>({
        target: handCardTarget,
      }),
    },
  },
  resolve({ state, submissions, accept, edit, fx, q }) {
    const playerIds = q.player.order();
    const tx = edit(state);

    for (const submission of Object.values(submissions)) {
      tx.moveCardBetweenPlayerZones({
        playerId: submission.playerId,
        fromZoneId: "hand",
        toZoneId: "stall",
        cardId: submission.params.cardId,
      });
    }

    const remainingByPlayer = Object.fromEntries(
      playerIds.map((playerId) => [
        playerId,
        tx.q.zone.playerCards(playerId, "hand"),
      ]),
    );
    const handsAreEmpty = playerIds.every(
      (playerId) => remainingByPlayer[playerId]?.length === 0,
    );

    if (handsAreEmpty) {
      return accept(tx.state, {
        instructions: [fx.transition("scoreRound")],
      });
    }

    tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "left",
      players: playerIds,
      cardIdsByPlayer: remainingByPlayer,
    });
    tx.patchPublicState({ pick: state.publicState.pick + 1 });
    return accept(tx.state);
  },
});
