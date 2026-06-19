import { z } from "zod";
import { ids, type CardId } from "../../shared/manifest-contract";
import type { GameContract, GameState } from "../game-contract";
import { draftingPhaseStateSchema } from "../game-contract";
import { destinationZoneForCard, hasChopsticksReady } from "../rules/scoring";
import {
  cardInput,
  cardTarget,
  definePhase,
  formInput,
  many,
} from "@dreamboard-games/sdk/reducer";

const HAND_ZONES = ["hand"] as const;
const handCardTarget = cardTarget
  .zones<GameState, CardId, typeof HAND_ZONES>(HAND_ZONES)
  .build();

const useChopsticksInput = formInput.choice({
  defaultValue: "no",
  choices: [
    { value: "no", label: "Pick one card" },
    { value: "yes", label: "Use chopsticks (pick two)" },
  ],
});

const submitParamsSchema = z.object({
  useChopsticks: z.enum(["no", "yes"]),
  cardIds: z.array(ids.cardId),
});

export const drafting = definePhase<GameContract>()({
  kind: "simultaneousPlayer",
  state: draftingPhaseStateSchema,
  initialState: () => ({}),
  actors: ({ q }) => q.player.order(),
  zones: ["hand"],
  submit: {
    commit: { mode: "manual" },
    inputs: {
      useChopsticks: useChopsticksInput,
      cardIds: many(
        cardInput<GameState, CardId, typeof HAND_ZONES>({
          target: handCardTarget,
        }),
        {
          min: 1,
          max: 2,
          distinct: true,
        },
      ),
    },
    paramsSchema: submitParamsSchema.superRefine((params, ctx) => {
      const count = params.cardIds.length;
      if (params.useChopsticks === "yes") {
        if (count !== 2) {
          ctx.addIssue({
            code: "custom",
            message: "Chopsticks require picking exactly two cards.",
            path: ["cardIds"],
          });
        }
      } else if (count !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Pick exactly one card.",
          path: ["cardIds"],
        });
      }
    }),
    rules: [
      {
        id: "chopsticks-available",
        errorCode: "CHOPSTICKS_NOT_AVAILABLE",
        message: "You do not have chopsticks to use yet.",
        validate: ({ input, q }) => {
          if (input.params.useChopsticks !== "yes") return null;
          if (!hasChopsticksReady(q, input.playerId)) {
            return "Chopsticks can only be used after you kept them on a previous turn.";
          }
          return null;
        },
      },
    ],
  },
  resolve({ state, submissions, accept, edit, fx, q }) {
    const order = q.player.order();

    const tx = edit(state);

    for (const submission of Object.values(submissions)) {
      const playerId = submission.playerId;
      const cardIds = submission.params.cardIds;
      const useChopsticks = submission.params.useChopsticks === "yes";

      for (const cardId of cardIds) {
        const toZone = destinationZoneForCard(q, cardId);
        tx.moveCardBetweenPlayerZones({
          playerId,
          fromZoneId: "hand",
          toZoneId: toZone,
          cardId,
        });
      }

      if (useChopsticks) {
        const chopsticksId = q.zone
          .playerCards(playerId, "played")
          .find(
            (cardId) => q.card.get(cardId).properties.category === "chopsticks",
          );
        if (chopsticksId && !cardIds.includes(chopsticksId)) {
          tx.moveCardBetweenPlayerZones({
            playerId,
            fromZoneId: "played",
            toZoneId: "hand",
            cardId: chopsticksId,
          });
        }
      }
    }

    const cardIdsByPlayer: Partial<
      Record<(typeof order)[number], readonly CardId[]>
    > = {};
    for (const playerId of order) {
      cardIdsByPlayer[playerId] = tx.q.zone.playerCards(playerId, "hand");
    }
    const allEmpty = order.every(
      (playerId) => (cardIdsByPlayer[playerId]?.length ?? 0) === 0,
    );

    tx.rotatePlayerZone({
      zoneId: "hand",
      direction: "left",
      players: order,
      cardIdsByPlayer,
    });

    if (allEmpty) {
      return accept(tx.state, { instructions: [fx.transition("scoreRound")] });
    }

    return accept(tx.state);
  },
});
