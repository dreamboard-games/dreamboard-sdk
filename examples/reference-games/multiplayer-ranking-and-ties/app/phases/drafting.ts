import { z } from "zod";
import { defineInteraction, definePhase } from "@dreamboard-games/sdk/reducer";
import { ids } from "../../shared/manifest-contract";
import type { CardId } from "../../shared/manifest-contract";
import type { DraftingPhaseState, GameContract } from "../game-contract";
import { edit } from "../reducer-support";
import { activePlayerId, draftStall } from "./draft-flow";

export const draftStallInteraction = defineInteraction<
  GameContract,
  DraftingPhaseState
>()({
  inputs: {},
  paramsSchema: z.object({
    cardId: ids.cardId,
  }),
  reduce({ state, input, accept, reject, fx }) {
    const params = input.params as { cardId: CardId };
    const result = draftStall(state.publicState, {
      playerId: input.playerId,
      cardId: params.cardId,
    });
    if (!result.accepted) {
      return reject(result.validation.errorCode, result.validation.message);
    }

    const tx = edit(state);
    tx.patchPublicState(result.state);

    if (result.state.completed) {
      tx.setActivePlayers([]);
      return accept(tx.state, { instructions: [fx.transition("gameOver")] });
    }

    tx.setActivePlayers([activePlayerId(result.state)]);
    return accept(tx.state);
  },
});

export const drafting = definePhase<GameContract>()({
  kind: "player",
  state: z.object({}),
  initialState: () => ({}),
  actor: ({ state }) => [activePlayerId(state.publicState)],
  interactions: {
    draftStall: draftStallInteraction,
  },
});
