import { playerTurn as playerTurnAuthoring } from "../../authoring";
import { zones } from "../../../shared/manifest-contract";
import { FRESH_TURN } from "./turn-state";
import { rollDice, discardCards, moveStorm } from "./dice-and-storm";
import { buildTrail, buildCamp, upgradeToTown } from "./build";
import {
  buyCharterCard,
  playScout,
  playClaimMarker,
  playShortcut,
  playLandmark,
  playSurveyGrant,
} from "./charter-cards";
import { tradeWithBank } from "./bank-trade";
import {
  cancelTrade,
  confirmTrade,
  offerTrade,
  respondToTrade,
} from "./player-trade";
import { endTurn } from "./end-turn";
import { edit } from "../../reducer-support";

export { discardCardsParamsSchema } from "./dice-and-storm";
export { offerTradeParamsSchema } from "./player-trade";

export const playerTurn = playerTurnAuthoring.stepPhase({
  kind: "player",
  steps: ["roll", "discard", "storm", "main"],
  initialState: () => ({ ...FRESH_TURN }),
  enter({ state, accept, q }) {
    // Entering `playerTurn` from `setup` — seed the first player's turn.
    // Re-entering on a subsequent turn is a no-op because `checkGameEnd`
    // already set active players.
    const activePlayer = state.flow.activePlayers[0] ?? q.player.order()[0]!;
    const tx = edit(state);
    tx.setActivePlayers([activePlayer]);
    return accept(tx.state);
  },
  actor: ({ state }) => state.flow.activePlayers,
  zones: [zones.charterHand],
  cardActions: {
    playLandmark: { steps: ["main"], action: playLandmark },
    playScout: { steps: ["main"], action: playScout },
    playSurveyGrant: { steps: ["main"], action: playSurveyGrant },
    playClaimMarker: { steps: ["main"], action: playClaimMarker },
    playShortcut: { steps: ["main"], action: playShortcut },
  },
  interactions: {
    rollDice: { steps: ["roll"], interaction: rollDice },
    discardCards: { steps: ["discard"], interaction: discardCards },
    moveStorm: { steps: ["storm"], interaction: moveStorm },
    buildTrail: { steps: ["main"], interaction: buildTrail },
    buildCamp: { steps: ["main"], interaction: buildCamp },
    upgradeToTown: { steps: ["main"], interaction: upgradeToTown },
    buyCharterCard: { steps: ["main"], interaction: buyCharterCard },
    tradeWithBank: { steps: ["main"], interaction: tradeWithBank },
    offerTrade: { steps: ["main"], interaction: offerTrade },
    respondToTrade: { steps: ["main"], interaction: respondToTrade },
    confirmTrade: { steps: ["main"], interaction: confirmTrade },
    cancelTrade: { steps: ["main"], interaction: cancelTrade },
    endTurn: { steps: ["main"], interaction: endTurn },
  },
});
