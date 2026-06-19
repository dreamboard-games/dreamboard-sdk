import { defineInteraction, definePhase } from "@dreamboard-games/sdk/reducer";
import {
  claimCargoParamsSchema,
  type ClaimCargoParams,
  humanTurnPhaseStateSchema,
  type GameContract,
  type GameState,
  type PlayerId,
  type PublicState,
} from "../game-contract";
import { cooperativeOutcome, resolveRivalProcedure } from "./rival-procedure";

export function claimCargoForPublicState({
  publicState,
  playerId,
  claimId,
}: {
  publicState: PublicState;
  playerId: string;
  claimId: string;
}):
  | {
      accepted: true;
      publicState: PublicState;
      events: PublicState["eventLog"];
      terminal: ReturnType<typeof cooperativeOutcome> | null;
      duplicate: boolean;
    }
  | {
      accepted: false;
      errorCode: "PLAYER_NOT_AUTHORIZED" | "GAME_ALREADY_COMPLETE";
      message: string;
    } {
  if (playerId !== "player-1") {
    return {
      accepted: false,
      errorCode: "PLAYER_NOT_AUTHORIZED",
      message: "Only the human player may claim cargo.",
    };
  }
  if (publicState.outcome) {
    return {
      accepted: false,
      errorCode: "GAME_ALREADY_COMPLETE",
      message: "This river race is already complete.",
    };
  }
  const existing = publicState.processedClaims[claimId];
  if (existing) {
    return {
      accepted: true,
      publicState,
      events: publicState.eventLog.slice(
        existing.eventStart,
        existing.eventStart + existing.eventCount,
      ),
      terminal: null,
      duplicate: true,
    };
  }

  const eventStart = publicState.eventLog.length;
  const scored = {
    ...publicState,
    teamScore: publicState.teamScore + 2,
  };
  const resolved = resolveRivalProcedure(scored);
  const eventCount = resolved.events.length;
  const terminal =
    publicState.round >= 6
      ? cooperativeOutcome({
          teamScore: resolved.publicState.teamScore,
          rivalProgress: resolved.publicState.rivalProgress,
        })
      : null;
  return {
    accepted: true,
    publicState: {
      ...resolved.publicState,
      processedClaims: {
        ...resolved.publicState.processedClaims,
        [claimId]: { eventStart, eventCount },
      },
      outcome: terminal,
    },
    events: resolved.events,
    terminal,
    duplicate: false,
  };
}

export function applyClaimToState({
  state,
  playerId,
  claimId,
}: {
  state: GameState;
  playerId: PlayerId;
  claimId: string;
}) {
  const result = claimCargoForPublicState({
    publicState: state.publicState,
    playerId,
    claimId,
  });
  if (!result.accepted) return result;
  return {
    ...result,
    state: {
      ...state,
      publicState: result.publicState,
    },
  };
}

export const humanTurn = definePhase<GameContract>()({
  kind: "player",
  state: humanTurnPhaseStateSchema,
  initialState: () => ({}),
  actor: ({ q }) => q.player.order(),
  interactions: {
    claimCargo: defineInteraction<
      GameContract,
      typeof humanTurnPhaseStateSchema
    >()({
      inputs: {},
      paramsSchema: claimCargoParamsSchema,
      reduce({ state, input, accept, reject, fx }) {
        const params = input.params as ClaimCargoParams;
        const claimId = params.claimId ?? "main-claim";
        const result = applyClaimToState({
          state,
          playerId: input.playerId as PlayerId,
          claimId,
        });
        if (!result.accepted) {
          return reject(result.errorCode, result.message);
        }
        if (result.terminal) {
          return {
            type: "accept",
            state: result.state,
            events: result.events,
            terminal: result.terminal,
            instructions: [fx.transition("gameOver")],
          };
        }
        return accept(result.state, { events: result.events });
      },
    }),
  },
});
