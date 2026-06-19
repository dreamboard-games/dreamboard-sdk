import type { PlayerId } from "../../shared/manifest-contract";

/** Hand size dealt at the start of each round by player count. */
export function handSizeForPlayerCount(playerCount: number): number {
  if (playerCount <= 2) return 10;
  if (playerCount === 3) return 9;
  if (playerCount === 4) return 8;
  return 7;
}

export function allHandsEmpty(
  playerIds: readonly PlayerId[],
  handCounts: Readonly<Record<string, number>>,
): boolean {
  return playerIds.every((id) => (handCounts[id] ?? 0) === 0);
}
