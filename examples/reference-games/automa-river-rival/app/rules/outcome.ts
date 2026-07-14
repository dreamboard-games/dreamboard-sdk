import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import type { PlayerId } from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";
import { createStateQueries } from "../reducer-support";
import { cargoCard } from "./cards";

type Q = ReturnType<typeof createStateQueries<GameState>>;

export function contributionByPlayer(
  q: Q,
  playerIds: readonly PlayerId[],
): Record<PlayerId, number> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      q.zone
        .playerCards(playerId, "human-cargo")
        .reduce((sum, cardId) => sum + cargoCard(q, cardId).value, 0),
    ]),
  ) as Record<PlayerId, number>;
}

export function cooperativeOutcome(
  q: Q,
  playerIds: readonly PlayerId[],
  rivalProgress: number,
): GameOutcome<PlayerId> {
  const contributions = contributionByPlayer(q, playerIds);
  const teamScore = playerIds.reduce(
    (sum, playerId) => sum + contributions[playerId],
    0,
  );
  const result =
    teamScore > rivalProgress
      ? "win"
      : teamScore === rivalProgress
        ? "draw"
        : "loss";
  const scoreBreakdown = playerIds.map((playerId, seat) => ({
    id: `seat-${seat + 1}-contribution`,
    label: `Seat ${seat + 1} cargo`,
    value: contributions[playerId],
  }));
  return {
    reason: { code: "SIX_RIVER_ROUNDS_COMPLETE" },
    standings: playerIds.map((playerId) => ({
      playerId,
      rank: 1,
      result,
      score: teamScore,
      scoreBreakdown: scoreBreakdown.map((component) => ({ ...component })),
    })),
  };
}
