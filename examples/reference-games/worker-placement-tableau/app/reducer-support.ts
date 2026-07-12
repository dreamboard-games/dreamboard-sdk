import {
  createReducerEdit,
  type GameOutcome,
} from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../shared/manifest-contract";
import type { GameState } from "./game-contract";
import { scorePlayer } from "./rules/scoring";

export const edit = createReducerEdit<GameState>();

export function finalOutcome(
  state: GameState,
  playerIds: readonly PlayerId[],
): {
  outcome: GameOutcome<PlayerId>;
  scores: Record<PlayerId, number>;
} {
  const scores = {} as Record<PlayerId, number>;
  const details = Object.fromEntries(
    playerIds.map((playerId) => {
      const score = scorePlayer(state, playerId);
      scores[playerId] = score.total;
      return [playerId, score] as const;
    }),
  ) as Record<PlayerId, ReturnType<typeof scorePlayer>>;
  const tied = details[playerIds[0]!]!.total === details[playerIds[1]!]!.total;
  const winner = tied
    ? null
    : details[playerIds[0]!]!.total > details[playerIds[1]!]!.total
      ? playerIds[0]!
      : playerIds[1]!;
  return {
    scores,
    outcome: {
      reason: { code: "FOUR_SEASONS_COMPLETE" },
      standings: playerIds.map((playerId) => ({
        playerId,
        rank: tied || playerId === winner ? 1 : 2,
        result: tied ? "draw" : playerId === winner ? "win" : "loss",
        score: details[playerId]!.total,
        scoreBreakdown: [
          {
            id: "printed-prestige",
            label: "Printed Prestige",
            value: details[playerId]!.printed,
          },
          {
            id: "harmony-prestige",
            label: "Harmony Prestige",
            value: details[playerId]!.harmony,
          },
        ],
      })),
    },
  };
}

export * from "./rules/model";
export * from "./rules/scoring";
