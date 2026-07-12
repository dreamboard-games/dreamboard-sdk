import { definePhase } from "@dreamboard-games/sdk/reducer";
import type { PieceId, PlayerId } from "../../shared/manifest-contract";
import { cleanupPhaseStateSchema, type GameContract } from "../game-contract";
import { otherPlayer } from "../reducer-support";

export const cleanup = definePhase<GameContract>()({
  kind: "auto",
  state: cleanupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, edit, fx, q }) {
    const tx = edit(state);
    const workerLocations = { ...state.publicState.workerLocations };
    for (const [workerId, location] of Object.entries(workerLocations) as Array<
      [PieceId, string | null]
    >) {
      if (location === null) continue;
      tx.moveComponentToDetached({ componentId: workerId });
      workerLocations[workerId] = null;
    }
    const completedSeason = state.publicState.season;
    const nextSeason = completedSeason === 4 ? null : completedSeason + 1;
    const playerIds = q.player.order() as readonly PlayerId[];
    const nextFirstPlayer =
      nextSeason === null
        ? state.publicState.firstPlayerId
        : otherPlayer(playerIds, state.publicState.firstPlayerId);
    tx.patchPublicState({
      workerLocations,
      passedPlayerIds: [],
      ...(nextSeason === null ? {} : { season: nextSeason }),
      firstPlayerId: nextFirstPlayer,
      activePlayerId: nextSeason === null ? null : nextFirstPlayer,
      events: [
        ...state.publicState.events,
        { kind: "seasonCompleted", completedSeason, nextSeason },
      ],
    });
    return accept(tx.state, {
      instructions: [
        fx.transition(nextSeason === null ? "scoring" : "placement"),
      ],
    });
  },
});
