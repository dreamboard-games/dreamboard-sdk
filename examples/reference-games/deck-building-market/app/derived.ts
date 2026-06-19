import { defineDerived } from "@dreamboard-games/sdk/reducer";
import type { GameContract } from "./game-contract";
import {
  cardTypes,
  literals,
  type PlayerId,
} from "../shared/manifest-contract";

const supplyPileIds = Object.values(literals.homeSharedZoneIdByCardType);
const masterpiecePileId =
  literals.homeSharedZoneIdByCardType[cardTypes.masterpiece];
const starterPileIds = new Set<string>([
  literals.homeSharedZoneIdByCardType[cardTypes.doodle],
  literals.homeSharedZoneIdByCardType[cardTypes.idea],
]);

// VP totals are computed across every card a player owns — deck, hand,
// in-play, and discard. We don't mirror this into publicState; the
// derived layer recomputes it whenever a UI projection asks.
export const vpTotalsByPlayer = defineDerived<GameContract>()({
  name: "vpTotalsByPlayer",
  compute: ({ state: _state, q }) => {
    const totals: Record<PlayerId, number> = {
      "player-1": 0,
      "player-2": 0,
    };
    for (const playerId of q.player.order()) {
      let total = 0;
      for (const zoneId of ["deck", "hand", "in-play", "discard"] as const) {
        const cards = q.zone.playerCards(playerId, zoneId);
        for (const cardId of cards) {
          const card = q.card.get(cardId);
          if ("vp" in card.properties) {
            total += card.properties.vp;
          }
        }
      }
      totals[playerId] = total;
    }
    return totals;
  },
});

// Game-end check: Masterpiece pile empty OR any 3 non-starter supply piles empty.
export const gameEnded = defineDerived<GameContract>()({
  name: "gameEnded",
  compute: ({ state: _state, q }) => {
    const masterpieceLeft = q.zone.sharedCards(masterpiecePileId).length;
    if (masterpieceLeft === 0) return true;

    let emptyPiles = 0;
    for (const pileId of supplyPileIds) {
      if (starterPileIds.has(pileId)) continue;
      const pile = q.zone.sharedCards(pileId);
      if (pile.length === 0) {
        emptyPiles += 1;
        if (emptyPiles >= 3) return true;
      }
    }
    return false;
  },
});

// Winner: highest VP. Tiebreak by fewer turns taken (`turnNumber` is the
// number of *total* turns played at game-end, so a player who won on the
// active player's turn end has parity unless their opponent already
// played; we keep it simple with VP-only for Wave 2).
export const winnerOf = defineDerived<GameContract>()({
  name: "winnerOf",
  compute: ({ state: _state, q, derived }): PlayerId | null => {
    if (!derived(gameEnded)) return null;
    const totals = derived(vpTotalsByPlayer);
    let best: { playerId: PlayerId; vp: number } | null = null;
    for (const playerId of q.player.order()) {
      const vp = totals[playerId] ?? 0;
      if (best === null || vp > best.vp) {
        best = { playerId, vp };
      }
    }
    return best?.playerId ?? null;
  },
});
