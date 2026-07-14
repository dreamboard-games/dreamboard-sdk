import {
  createReducerEdit,
  type TableQueriesOfState,
} from "@dreamboard-games/sdk/reducer";
import type {
  CardId,
  PlayerId,
  SharedZoneId,
} from "../shared/manifest-contract";
import type { GameState, HistoryEntry } from "./game-contract";
import { supplyZoneForCardType } from "./model";

export type Q = TableQueriesOfState<GameState>;
export const edit = createReducerEdit<GameState>();

export function appendHistory(
  state: GameState,
  entry: Omit<HistoryEntry, "turn">,
): GameState {
  return {
    ...state,
    publicState: {
      ...state.publicState,
      history: [
        ...state.publicState.history,
        { ...entry, turn: state.publicState.turnNumber },
      ],
    },
  };
}

export function inspirationOf(q: Q, cardId: CardId): number | null {
  const properties = q.card.get(cardId).properties;
  const value =
    "inspiration" in properties ? properties.inspiration : undefined;
  return typeof value === "number" ? value : null;
}

export function costOf(q: Q, cardId: CardId): number {
  return q.card.get(cardId).properties.cost;
}

export function pileForCard(q: Q, cardId: CardId): SharedZoneId {
  return supplyZoneForCardType(q.card.get(cardId).cardType);
}

export function prepareMidTurnDraw(options: {
  state: GameState;
  q: Q;
  playerId: PlayerId;
  count: number;
}): { state: GameState; shuffleDrawCount: number } {
  const { state, q, playerId, count } = options;
  const deckCards = q.zone.playerCards(playerId, "deck");
  const immediate = Math.min(count, deckCards.length);
  const remaining = count - immediate;
  const discardCards = q.zone.playerCards(playerId, "discard");
  const shuffleDrawCount = Math.min(remaining, discardCards.length);
  const tx = edit(state);
  if (immediate > 0) {
    tx.dealCardsBetweenPlayerZones({
      playerId,
      fromZoneId: "deck",
      toZoneId: "hand",
      count: immediate,
    });
  }
  if (shuffleDrawCount > 0) {
    for (const cardId of discardCards) {
      tx.moveCardBetweenPlayerZones({
        playerId,
        fromZoneId: "discard",
        toZoneId: "deck",
        cardId,
      });
    }
  }
  return { state: tx.state, shuffleDrawCount };
}
