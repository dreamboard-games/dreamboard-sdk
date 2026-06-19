import {
  ids,
  type CardId,
  type PlayerId,
} from "../../shared/manifest-contract";
import {
  playingPhaseStateSchema,
  type GameContract,
  type GameErrorCode,
  type GameState,
} from "../game-contract";
import {
  cardInput,
  cardTarget,
  defineInteraction,
  definePhase,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import { edit } from "../reducer-support";

const RANK_ORDER: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

type CardPlayIssue = {
  errorCode: Extract<
    GameErrorCode,
    | "NOT_YOUR_TURN"
    | "MUST_FOLLOW_SUIT"
    | "MUST_LEAD_TWO_OF_CLUBS"
    | "HEARTS_NOT_BROKEN"
    | "NO_PENALTIES_FIRST_TRICK"
  >;
  message: string;
};

function validateCardPlay({
  state,
  playerId,
  cardId,
  q,
}: {
  state: GameState;
  playerId: PlayerId;
  cardId: CardId;
  q: TableQueriesOfState<GameState>;
}): CardPlayIssue | null {
  if (!state.flow.activePlayers.includes(playerId)) {
    return {
      errorCode: "NOT_YOUR_TURN",
      message: "Not your turn.",
    };
  }
  const card = q.card.get(cardId);
  const props = card.properties;
  const suit = props.suit;
  const rank = props.rank;
  if (!suit || !rank) {
    return {
      errorCode: "NOT_YOUR_TURN",
      message: "Card missing suit/rank.",
    };
  }
  const phaseState = state.phase;
  const leadSuit = phaseState.leadSuit;
  const isLead = phaseState.plays.length === 0;
  const isFirstTrick = state.publicState.isFirstTrick;
  const heartsBroken = state.publicState.heartsBroken;
  const handCardIds = q.zone.playerCards(playerId, "hand");
  const handSuits = new Set(
    handCardIds.map((cid) => q.card.get(cid).properties.suit),
  );

  if (isFirstTrick && isLead && !(suit === "clubs" && rank === "2")) {
    return {
      errorCode: "MUST_LEAD_TWO_OF_CLUBS",
      message: "The 2 of Clubs must lead the first trick.",
    };
  }

  if (isFirstTrick) {
    const isPenalty = suit === "hearts" || (suit === "spades" && rank === "Q");
    if (isPenalty) {
      const hasNonPenalty = handCardIds.some((cid) => {
        const c = q.card.get(cid).properties;
        return !(
          c.suit === "hearts" ||
          (c.suit === "spades" && c.rank === "Q")
        );
      });
      if (hasNonPenalty) {
        return {
          errorCode: "NO_PENALTIES_FIRST_TRICK",
          message: "Penalty cards may not be played on the first trick.",
        };
      }
    }
  }

  if (!isLead && leadSuit && suit !== leadSuit && handSuits.has(leadSuit)) {
    return {
      errorCode: "MUST_FOLLOW_SUIT",
      message: `Must follow suit (${leadSuit}).`,
    };
  }

  if (isLead && suit === "hearts" && !heartsBroken) {
    const hasNonHeart = handCardIds.some(
      (cid) => q.card.get(cid).properties.suit !== "hearts",
    );
    if (hasNonHeart) {
      return {
        errorCode: "HEARTS_NOT_BROKEN",
        message: "Hearts have not been broken.",
      };
    }
  }

  return null;
}

const legalHandCardTarget = cardTarget
  .zones<GameState, CardId, readonly ["hand"]>(["hand"])
  .where({
    id: "legal-hearts-card-play",
    errorCode: "INVALID_CARD_PLAY",
    message: "Card is not legal right now.",
    test: ({ state, playerId, q, target }) =>
      validateCardPlay({
        state,
        playerId: playerId as PlayerId,
        cardId: target,
        q,
      }) == null,
  })
  .build();

export const playing = definePhase<GameContract>()({
  kind: "player",
  state: playingPhaseStateSchema,
  initialState: () => ({ leadSuit: null, plays: [], tricksPlayed: 0 }),
  actor: ({ state }) => state.flow.activePlayers,
  zones: ["hand"],
  enter({ state, accept, q }) {
    // First entry into the phase: find the 2♣ holder and seat them as the
    // lead. Subsequent re-entries (none in wave 2 — single hand only) would
    // hit this same path because phase state resets on transition.
    if (state.flow.activePlayers.length > 0) {
      return accept(state);
    }
    for (const playerId of q.player.order()) {
      for (const cardId of q.zone.playerCards(playerId, "hand")) {
        const card = q.card.get(cardId);
        const props = card.properties;
        if (props.suit === "clubs" && props.rank === "2") {
          const tx = edit(state);
          tx.setActivePlayers([playerId]);
          return accept(tx.state);
        }
      }
    }
    // Defensive: no 2♣ found (would mean a setup bug). Fall back to seat 0.
    const fallback = q.player.order()[0];
    const tx = edit(state);
    tx.setActivePlayers(fallback ? [fallback] : []);
    return accept(tx.state);
  },
  interactions: {
    playCard: defineInteraction<GameContract, typeof playingPhaseStateSchema>()(
      {
        errorCodes: [
          "NOT_YOUR_TURN",
          "MUST_FOLLOW_SUIT",
          "MUST_LEAD_TWO_OF_CLUBS",
          "HEARTS_NOT_BROKEN",
          "NO_PENALTIES_FIRST_TRICK",
        ],
        inputs: {
          cardId: cardInput<GameState, CardId, readonly ["hand"]>({
            target: legalHandCardTarget,
          }),
        },
        rules: [
          {
            id: "play-card-rules",
            errorCode: "INVALID_CARD_PLAY",
            validate({ state, input, q }) {
              const playerId = input.playerId as PlayerId;
              const cardId = input.params.cardId as CardId;
              return validateCardPlay({ state, playerId, cardId, q });
            },
          },
        ],
        reduce({ state, input, accept, fx, q }) {
          const playerId = input.playerId as PlayerId;
          const cardId = input.params.cardId as CardId;
          const card = q.card.get(cardId);
          const props = card.properties;
          const phaseState = state.phase;
          const isLead = phaseState.plays.length === 0;
          const newPlays = [...phaseState.plays, { playerId, cardId }];

          // Move the card from hand to the shared current-trick zone.
          const tx = edit(state);
          tx.moveCardFromPlayerZoneToSharedZone({
            playerId,
            fromZoneId: "hand",
            toZoneId: "current-trick",
            cardId,
            playedBy: playerId,
          });
          tx.patchPhaseState({
            leadSuit: isLead ? props.suit : phaseState.leadSuit,
            plays: newPlays,
          });

          // Heart played → hearts broken (sticky for the rest of the hand).
          if (props.suit === "hearts" && !state.publicState.heartsBroken) {
            tx.patchPublicState({ heartsBroken: true });
          }

          // Trick incomplete: rotate to the next seat.
          if (newPlays.length < 4) {
            const nextPlayer = q.player.nextInOrder(playerId);
            if (!nextPlayer) {
              throw new Error("no next player");
            }
            tx.setActivePlayers([nextPlayer]);
            return accept(tx.state);
          }

          // Trick complete: determine the winner (highest card of lead suit).
          const leadSuit = isLead ? props.suit : phaseState.leadSuit;
          let trickWinnerPlayerId = newPlays[0]!.playerId;
          let winnerRank = -1;
          for (const play of newPlays) {
            const c = q.card.get(play.cardId).properties;
            if (c.suit === leadSuit) {
              const r = RANK_ORDER[c.rank] ?? 0;
              if (r > winnerRank) {
                winnerRank = r;
                trickWinnerPlayerId = play.playerId;
              }
            }
          }

          // Tally penalty cards from the trick.
          let heartsInTrick = 0;
          let queenInTrick = false;
          for (const play of newPlays) {
            const c = q.card.get(play.cardId).properties;
            if (c.suit === "hearts") heartsInTrick += 1;
            if (c.suit === "spades" && c.rank === "Q") queenInTrick = true;
          }

          const heartsTaken = state.publicState.heartsTakenByPlayer ?? {};
          const tricksWon = state.publicState.tricksWonByPlayer ?? {};
          const updatedHearts = {
            ...heartsTaken,
            [trickWinnerPlayerId]:
              (heartsTaken[trickWinnerPlayerId] ?? 0) + heartsInTrick,
          };
          const updatedTricks = {
            ...tricksWon,
            [trickWinnerPlayerId]: (tricksWon[trickWinnerPlayerId] ?? 0) + 1,
          };

          // Move the four trick cards into the shared discard pile.
          for (const play of newPlays) {
            tx.moveCardBetweenSharedZones({
              fromZoneId: "current-trick",
              toZoneId: "discard",
              cardId: play.cardId as CardId,
            });
          }

          const tricksPlayed = phaseState.tricksPlayed + 1;
          const handDone = tricksPlayed === 13;

          tx.patchPublicState({
            heartsTakenByPlayer: updatedHearts,
            tricksWonByPlayer: updatedTricks,
            queenTakenBy: queenInTrick
              ? trickWinnerPlayerId
              : state.publicState.queenTakenBy,
            isFirstTrick: false,
          });
          tx.patchPhaseState({
            leadSuit: null,
            plays: [],
            tricksPlayed,
          });
          tx.setActivePlayers(handDone ? [] : [trickWinnerPlayerId]);

          return accept(tx.state, {
            instructions: handDone ? [fx.transition("scoreHand")] : [],
          });
        },
      },
    ),
  },
});
