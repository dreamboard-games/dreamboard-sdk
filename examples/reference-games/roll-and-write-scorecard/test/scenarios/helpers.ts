import type { PlayerId } from "../../shared/manifest-contract.ts";
import {
  createInitialPublicState,
  startRound,
  submitSurveyMark,
  type PublicState,
} from "../../app/model.ts";

export const scenarioPlayers = ["player-1", "player-2"] as PlayerId[];

export function rolledState(): PublicState {
  return startRound(createInitialPublicState(scenarioPlayers));
}

export function afterFirstMark(): PublicState {
  const result = submitSurveyMark(rolledState(), {
    playerId: scenarioPlayers[0],
    cellId: "cell-0-1",
    expectedRound: 1,
  });
  if (!result.accepted) {
    throw new Error((result.validation as { errorCode: string }).errorCode);
  }
  return result.state;
}
