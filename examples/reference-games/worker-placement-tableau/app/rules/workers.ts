import {
  literals,
  type PieceId,
  type PlayerId,
} from "../../shared/manifest-contract";
import type { GameState } from "../game-contract";

export const TRAINING_HALL_COIN_COST = 3;

const PIECE_TYPE_BY_ID: Readonly<Record<PieceId, "apprentice" | "master">> =
  Object.fromEntries(
    literals.pieceIds.map((id) => [
      id,
      id.startsWith("master") ? "master" : "apprentice",
    ]),
  ) as Record<PieceId, "apprentice" | "master">;

const OWNER_BY_PIECE_ID: Readonly<Record<PieceId, PlayerId>> = (() => {
  const out: Record<string, PlayerId> = {};
  for (const id of literals.pieceIds) {
    if (id === "master-p1") out[id] = "player-1";
    else if (id === "master-p2") out[id] = "player-2";
    else if (id.startsWith("apprentice-p1-")) out[id] = "player-1";
    else if (id.startsWith("apprentice-p2-")) out[id] = "player-2";
  }
  return out as Record<PieceId, PlayerId>;
})();

export function workerOwner(pieceId: string): PlayerId | null {
  return OWNER_BY_PIECE_ID[pieceId as PieceId] ?? null;
}

export function pieceTypeOfWorker(
  pieceId: string,
): "apprentice" | "master" | null {
  return PIECE_TYPE_BY_ID[pieceId as PieceId] ?? null;
}

export function detachedWorkerIds(
  state: GameState,
  playerId: PlayerId,
  options: { extraApprentices?: number } = {},
): readonly PieceId[] {
  const extraApprentices = options.extraApprentices ?? 0;
  const out: PieceId[] = [];
  let apprenticeBudget =
    (state.publicState.apprenticeRosterSize[playerId] ?? 0) + extraApprentices;
  for (const [pieceId, location] of Object.entries(
    state.publicState.workerLocations,
  )) {
    if (location == null) continue;
    if (OWNER_BY_PIECE_ID[pieceId as PieceId] !== playerId) continue;
    if (PIECE_TYPE_BY_ID[pieceId as PieceId] === "apprentice") {
      apprenticeBudget -= 1;
    }
  }
  for (const pieceId of literals.pieceIds) {
    if (OWNER_BY_PIECE_ID[pieceId] !== playerId) continue;
    const location = state.publicState.workerLocations[pieceId];
    if (location != null) continue;
    const kind = PIECE_TYPE_BY_ID[pieceId];
    if (kind === "master") {
      out.push(pieceId);
    } else if (kind === "apprentice" && apprenticeBudget > 0) {
      out.push(pieceId);
      apprenticeBudget -= 1;
    }
  }
  return out;
}

export function hasPlaceableWorkers(
  state: GameState,
  playerId: PlayerId,
  options: { extraApprentices?: number } = {},
): boolean {
  return detachedWorkerIds(state, playerId, options).length > 0;
}
