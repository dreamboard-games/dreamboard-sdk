import type { PlayerId } from "../shared/manifest-contract";
import type { GameContract, GameState } from "./game-contract";
import { createStateQueries } from "./reducer-support";
import { cargoCard, rivalInstruction } from "./rules/cards";
import { contributionByPlayer } from "./rules/outcome";
import {
  definePlayerView,
  defineSharedView,
} from "@dreamboard-games/sdk/reducer";

type Q = ReturnType<typeof createStateQueries<GameState>>;

function projectSharedState(state: GameState, q: Q) {
  const playerIds = q.player.order() as readonly PlayerId[];
  const humanCargoByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      q.zone
        .playerCards(playerId, "human-cargo")
        .map((cardId) => cargoCard(q, cardId)),
    ]),
  );
  const contributions = contributionByPlayer(q, playerIds);
  const teamScore = playerIds.reduce(
    (sum, playerId) => sum + contributions[playerId],
    0,
  );
  const activeHumanId =
    state.flow.currentPhase === "humanTurn"
      ? (playerIds[state.publicState.activeHumanIndex] ?? null)
      : null;
  return {
    currentPhase: state.flow.currentPhase,
    round: state.publicState.round,
    activeHumanId,
    playerIds,
    river: q.zone.sharedCards("river").map((cardId) => cargoCard(q, cardId)),
    cargoDeckCount: q.zone.sharedCards("cargo-deck").length,
    humanCargoByPlayer,
    contributionByPlayer: contributions,
    teamScore,
    rival: {
      label: "Rival Guild",
      progress: state.publicState.rivalProgress,
      instructionDeckCount: q.zone.sharedCards("instruction-deck").length,
      instructionHistory: q.zone
        .sharedCards("instruction-history")
        .map((cardId) => rivalInstruction(q, cardId)),
      claimedCargo: q.zone
        .sharedCards("rival-claimed")
        .map((cardId) => cargoCard(q, cardId)),
      discardedCargo: q.zone
        .sharedCards("rival-discarded")
        .map((cardId) => cargoCard(q, cardId)),
    },
    procedureEvents: state.publicState.procedureEvents,
    outcome: state.publicState.outcome,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state, q }) {
    return projectSharedState(state, q);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId, q }) {
    const shared = projectSharedState(state, q);
    return {
      ...shared,
      playerId,
      isActiveHuman: shared.activeHumanId === playerId,
    };
  },
});
