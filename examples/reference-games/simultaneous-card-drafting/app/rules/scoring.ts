import type { GameOutcome } from "@dreamboard-games/sdk/reducer";
import type { CardId, PlayerId } from "../../shared/manifest-contract";
import type { GameState, RoundHistoryEntry } from "../game-contract";
import { createStateQueries } from "../reducer-support";

type Q = ReturnType<typeof createStateQueries<GameState>>;

export type MarketCardFamily = "lantern" | "tea-cup" | "festival-banner";

export function scoreFamilies(families: readonly MarketCardFamily[]): number {
  const counts: Record<MarketCardFamily, number> = {
    lantern: 0,
    "tea-cup": 0,
    "festival-banner": 0,
  };
  for (const family of families) counts[family] += 1;
  return (
    counts.lantern * 2 +
    Math.floor(counts["tea-cup"] / 2) * 5 +
    Math.floor(counts["festival-banner"] / 3) * 9
  );
}

export function scoreCardIds(q: Q, cardIds: readonly CardId[]): number {
  return scoreFamilies(
    cardIds.map((cardId) => q.card.get(cardId).properties.family),
  );
}

export function scoreStalls(
  q: Q,
  playerIds: readonly PlayerId[],
): Record<string, number> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      scoreCardIds(q, q.zone.playerCards(playerId, "stall")),
    ]),
  );
}

export function addScores(
  current: Readonly<Record<string, number>>,
  round: Readonly<Record<string, number>>,
  playerIds: readonly PlayerId[],
): Record<string, number> {
  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      (current[playerId] ?? 0) + (round[playerId] ?? 0),
    ]),
  );
}

export function buildOutcome(
  totals: Readonly<Record<string, number>>,
  playerIds: readonly PlayerId[],
  history: readonly RoundHistoryEntry[],
): GameOutcome<PlayerId> {
  const seatByPlayer = new Map(
    playerIds.map((playerId, seat) => [playerId, seat]),
  );
  const ranked = [...playerIds].sort((left, right) => {
    const scoreDelta = (totals[right] ?? 0) - (totals[left] ?? 0);
    return scoreDelta !== 0
      ? scoreDelta
      : (seatByPlayer.get(left) ?? 0) - (seatByPlayer.get(right) ?? 0);
  });
  const topScore = Math.max(...ranked.map((id) => totals[id] ?? 0));
  const topCount = ranked.filter(
    (playerId) => (totals[playerId] ?? 0) === topScore,
  ).length;
  return {
    reason: { code: "TWO_ROUNDS_COMPLETE" },
    standings: ranked.map((playerId) => {
      const score = totals[playerId] ?? 0;
      const rank =
        1 +
        playerIds.filter((otherPlayerId) => {
          return (totals[otherPlayerId] ?? 0) > score;
        }).length;
      return {
        playerId,
        rank,
        result:
          rank === 1 ? (topCount > 1 ? "draw" : "win") : ("loss" as const),
        score,
        scoreBreakdown: history.map((entry) => ({
          id: `round-${entry.round}`,
          label: `Round ${entry.round}`,
          value: entry.scoreByPlayer[playerId] ?? 0,
        })),
      };
    }),
  };
}
