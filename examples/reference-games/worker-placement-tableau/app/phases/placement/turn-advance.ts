import type { GameState } from "../../game-contract";
import { pieceTypeOfWorker, workerOwner } from "../../reducer-support";
import type { PlayerId } from "../../../shared/manifest-contract";

export type AdvanceResult =
  | { kind: "transition"; finalPassed: PlayerId[] }
  | {
      kind: "next";
      finalPassed: PlayerId[];
      nextIndex: number;
      nextPlayer: PlayerId;
    };

export function advanceAfterPlayerAction(
  publicState: GameState["publicState"],
  passed: readonly PlayerId[],
  projectedPublicOverrides: Partial<GameState["publicState"]>,
  currentPlayerId: PlayerId,
): AdvanceResult {
  const order = publicState.turnOrderThisSeason;
  const projectedPublic = { ...publicState, ...projectedPublicOverrides };
  const autoPassed = order.filter(
    (pid) =>
      !passed.includes(pid) &&
      !hasPlaceableWorkersInPublicState(projectedPublic, pid),
  );
  const finalPassed = [...new Set([...passed, ...autoPassed])];
  const remaining = order.filter((pid) => !finalPassed.includes(pid));
  if (remaining.length === 0) {
    return { kind: "transition", finalPassed };
  }
  const currentIdx = order.indexOf(currentPlayerId);
  let nextIdx = (currentIdx + 1) % order.length;
  let safety = order.length;
  while (safety-- > 0 && finalPassed.includes(order[nextIdx]!)) {
    nextIdx = (nextIdx + 1) % order.length;
  }
  return {
    kind: "next",
    finalPassed,
    nextIndex: nextIdx,
    nextPlayer: order[nextIdx]!,
  };
}

function hasPlaceableWorkersInPublicState(
  publicState: GameState["publicState"],
  playerId: PlayerId,
): boolean {
  let apprenticeBudget = publicState.apprenticeRosterSize[playerId] ?? 0;
  for (const [pieceId, location] of Object.entries(
    publicState.workerLocations,
  )) {
    if (location == null) continue;
    if (workerOwner(pieceId) !== playerId) continue;
    if (pieceTypeOfWorker(pieceId) === "apprentice") {
      apprenticeBudget -= 1;
    }
  }
  for (const [pieceId, location] of Object.entries(
    publicState.workerLocations,
  )) {
    if (location != null) continue;
    if (workerOwner(pieceId) !== playerId) continue;
    if (pieceTypeOfWorker(pieceId) === "master") return true;
    if (pieceTypeOfWorker(pieceId) === "apprentice" && apprenticeBudget > 0) {
      return true;
    }
  }
  return false;
}
