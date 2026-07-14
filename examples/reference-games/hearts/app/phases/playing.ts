import type { CardId, PlayerId } from "../../shared/manifest-contract";
import {
  cardInput,
  cardTarget,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";
import {
  playingPhaseStateSchema,
  type GameContract,
  type GameState,
  type Suit,
} from "../game-contract";
import { isPenaltyCard, trickWinner, validateCardPlay } from "../rules";

const HAND_ZONES = ["hand"] as const;
const legalHandCardTarget = cardTarget
  .zones<GameState, CardId, typeof HAND_ZONES>(HAND_ZONES)
  .where({
    id: "legal-hearts-card-play",
    errorCode: "INVALID_CARD_PLAY",
    message: "Choose one of the currently legal cards in your hand.",
    test: ({ state, playerId, q, targetId }) =>
      validateCardPlay({
        state,
        playerId: playerId as PlayerId,
        cardId: targetId,
        q,
      }) === null,
  })
  .build();

const playCard = defineInteraction<
  GameContract,
  typeof playingPhaseStateSchema
>()({
  presentation: {
    label: "Play card",
    help: "Play one legal card face up to the current trick.",
  },
  errorCodes: [
    "NOT_YOUR_TURN",
    "MUST_FOLLOW_SUIT",
    "MUST_LEAD_TWO_OF_CLUBS",
    "HEARTS_NOT_BROKEN",
    "NO_PENALTIES_FIRST_TRICK",
  ],
  inputs: {
    cardId: cardInput<GameState, CardId, typeof HAND_ZONES>({
      target: legalHandCardTarget,
    }),
  },
  rules: [
    {
      id: "revalidate-hearts-card-play",
      errorCode: "INVALID_CARD_PLAY",
      validate({ state, input, q }) {
        return validateCardPlay({
          state,
          playerId: input.playerId,
          cardId: input.params.cardId,
          q,
        });
      },
    },
  ],
  reduce({ state, input, accept, edit, fx, q }) {
    const playerId = input.playerId;
    const cardId = input.params.cardId;
    const properties = q.card.get(cardId).properties;
    if (!properties.suit || !properties.rank) {
      throw new Error(
        `Hearts card ${cardId} is missing suit or rank metadata.`,
      );
    }

    const phase = state.phase;
    const newPlays = [...phase.plays, { playerId, cardId }];
    const leadSuit = (phase.leadSuit ?? properties.suit) as Suit;
    const tx = edit(state);
    tx.moveCardFromPlayerZoneToSharedZone({
      playerId,
      fromZoneId: "hand",
      toZoneId: "current-trick",
      cardId,
      playedBy: playerId,
    });

    if (properties.suit === "hearts" && !state.publicState.heartsBroken) {
      tx.patchPublicState({ heartsBroken: true });
    }

    if (newPlays.length < 4) {
      const nextPlayerId = q.player.nextInOrder(playerId);
      if (!nextPlayerId)
        throw new Error("Hearts could not find the next seat.");
      tx.patchPhaseState({ leadSuit, plays: newPlays });
      tx.setActivePlayers([nextPlayerId]);
      return accept(tx.state);
    }

    const winnerPlayerId = trickWinner({ leadSuit, plays: newPlays, q });
    const heartsCaptured = newPlays.filter(({ cardId: playedCardId }) => {
      const card = q.card.get(playedCardId).properties;
      return card.suit === "hearts";
    }).length;
    const queenOfSpadesCaptured = newPlays.some(
      ({ cardId: playedCardId }) => playedCardId === "spades-Q",
    );

    for (const play of newPlays) {
      tx.moveCardBetweenSharedZones({
        fromZoneId: "current-trick",
        toZoneId: "discard",
        cardId: play.cardId,
      });
    }

    const tricksCompleted = state.publicState.tricksCompleted + 1;
    tx.patchPublicState({
      tricksCompleted,
      capturedHeartsByPlayer: {
        ...state.publicState.capturedHeartsByPlayer,
        [winnerPlayerId]:
          (state.publicState.capturedHeartsByPlayer[winnerPlayerId] ?? 0) +
          heartsCaptured,
      },
      queenOfSpadesCapturedBy: queenOfSpadesCaptured
        ? winnerPlayerId
        : state.publicState.queenOfSpadesCapturedBy,
      tricksWonByPlayer: {
        ...state.publicState.tricksWonByPlayer,
        [winnerPlayerId]:
          (state.publicState.tricksWonByPlayer[winnerPlayerId] ?? 0) + 1,
      },
      trickHistory: [
        ...state.publicState.trickHistory,
        {
          number: tricksCompleted,
          leadSuit,
          plays: newPlays,
          winnerPlayerId,
          heartsCaptured,
          queenOfSpadesCaptured,
        },
      ],
    });
    tx.patchPhaseState({ leadSuit: null, plays: [] });

    if (tricksCompleted === 13) {
      tx.setActivePlayers([]);
      return accept(tx.state, {
        instructions: [fx.transition("scoreHand")],
      });
    }

    tx.setActivePlayers([winnerPlayerId]);
    return accept(tx.state);
  },
});

export const playing = definePhase<GameContract>()({
  kind: "player",
  state: playingPhaseStateSchema,
  initialState: () => ({ leadSuit: null, plays: [] }),
  actor: ({ state }) => state.flow.activePlayers,
  zones: ["hand"],
  enter({ state, accept, edit, q }) {
    for (const playerId of q.player.order()) {
      if (q.zone.playerCards(playerId, "hand").includes("clubs-2")) {
        const tx = edit(state);
        tx.setActivePlayers([playerId]);
        return accept(tx.state);
      }
    }
    throw new Error("Hearts setup completed without a 2 of Clubs holder.");
  },
  interactions: { playCard },
});
