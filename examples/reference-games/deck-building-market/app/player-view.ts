import { definePlayerView } from "@dreamboard-games/sdk/reducer";
import type { GameContract, PlayerTurnPhaseState } from "./game-contract";
import { vpTotalsByPlayer } from "./derived";
import { literals, type CardType } from "../shared/manifest-contract";

// Per-seat projection. The SDK already projects shared/perPlayer zones via
// the runtime; this view supplies the gameplay-specific summary the UI
// reads (hand, supply piles' top counts, current mode/coins/buys/actions,
// VP totals).
//
// We summarise card ids only — the runtime card metadata (name, properties)
// is available everywhere via the static manifest projection.
export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q, derived }) {
    const handCards = q.zone.playerCards(playerId, "hand");
    const inPlayCards = q.zone.playerCards(playerId, "in-play");
    const discardCards = q.zone.playerCards(playerId, "discard");
    const deckCards = q.zone.playerCards(playerId, "deck");
    const vpTotals = derived(vpTotalsByPlayer);
    const supplyCosts = Object.fromEntries(
      Object.entries(literals.homeSharedZoneIdByCardType).map(
        ([cardType, pileId]) => {
          const pile = q.zone.sharedCards(pileId);
          const cardId = pile[0];
          const cost = cardId ? q.card.get(cardId).properties.cost : 0;
          return [cardType, cost];
        },
      ),
    ) as Record<CardType, number>;

    // Phase state is only present while currentPhase === "playerTurn".
    // Default to a zeroed turn snapshot otherwise so the UI never sees
    // undefined.
    const phase: PlayerTurnPhaseState = state.phase.get("playerTurn") ?? {
      step: "action",
      actionsLeft: 0,
      buysLeft: 0,
      coins: 0,
      pendingDraw: 0,
      pendingAction: null,
    };

    return {
      mode: phase.step,
      actionsLeft: phase.actionsLeft,
      buysLeft: phase.buysLeft,
      coins: phase.coins,
      pendingDraw: phase.pendingDraw,
      // Which follow-up selection (if any) the UI should surface. Non-null
      // only while `mode === "resolve"`.
      pendingAction: phase.pendingAction,
      turnNumber: state.publicState.turnNumber,
      handCards: [...handCards],
      inPlayCards: [...inPlayCards],
      discardCards: [...discardCards],
      deckCards: [...deckCards],
      deckCount: deckCards.length,
      supplyCosts,
      myVp: vpTotals[playerId] ?? 0,
      vpTotals,
      gameOver: state.publicState.outcome !== null,
      outcome: state.publicState.outcome,
    };
  },
});
