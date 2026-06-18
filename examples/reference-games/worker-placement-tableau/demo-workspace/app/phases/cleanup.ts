import { definePhase } from "@dreamboard-games/sdk/reducer";
import { cleanupPhaseStateSchema, type GameContract } from "../game-contract";
import {
  PERSISTENT_HOOKS,
  PERSISTENT_HOOK_ORDER,
  edit,
  persistentCardsFor,
} from "../reducer-support";
import {
  literals,
  type PieceId,
  type PlayerId,
} from "../../shared/manifest-contract";

const SEASON_LIMIT = 6;

// Cleanup is `kind: "auto"` and runs in a single onEnter stage:
//   1. Fire each persistent card's `onSeasonEnd` hook (Patron's Favor
//      for now). Iterate players in seating order and cards in
//      PERSISTENT_HOOK_ORDER so multi-card / multi-player fires are
//      deterministic.
//   2. Return every placed worker to detached. We update both
//      `componentLocations` (via `tx.moveComponentToDetached`) and the
//      derived `publicState.workerLocations` map so eligibility checks
//      next season see a clean slate.
//   3. Resolve `pendingApprenticeBuysByPlayer`: for each pending buy,
//      bump `apprenticeRosterSize` by 1 (capped at 4 — the manifest
//      only seeded 4 apprentices per player) and zero the counter.
//   4. Increment `seasonNumber`. If the new season exceeds
//      `SEASON_LIMIT`, transition to `scoring`; otherwise `wakeup`.
export const cleanup = definePhase<GameContract>()({
  kind: "auto",
  state: cleanupPhaseStateSchema,
  initialState: () => ({}),
  enter({ state, accept, fx }) {
    const tx = edit(state);

    // ── 1. onSeasonEnd hooks ────────────────────────────────────
    const players = state.publicState.turnOrderThisSeason;
    for (const playerId of players) {
      const persistent = persistentCardsFor(state, playerId);
      const ordered = PERSISTENT_HOOK_ORDER.filter((id) =>
        persistent.includes(id),
      );
      for (const cardId of ordered) {
        const hook = PERSISTENT_HOOKS[cardId].onSeasonEnd;
        if (!hook) continue;
        const effects = hook({ playerId });
        for (const effect of effects) {
          if (effect.kind === "addResources") {
            tx.addResources({ playerId, amounts: effect.amounts });
          }
        }
      }
    }

    // ── 2. Return every placed worker to detached ──────────────
    // Build a fresh workerLocations map first so the patch is one
    // op rather than 10. The componentLocations / table state has
    // to be updated separately via moveComponentToDetached for
    // each piece because the SDK owns that index.
    const placed: PieceId[] = [];
    for (const [pieceId, location] of Object.entries(
      state.publicState.workerLocations,
    )) {
      if (location != null) placed.push(pieceId as PieceId);
    }
    for (const pieceId of placed) {
      tx.moveComponentToDetached({ componentId: pieceId });
    }
    if (placed.length > 0) {
      const clearedLocations = { ...state.publicState.workerLocations };
      for (const pieceId of placed) clearedLocations[pieceId] = null;
      tx.patchPublicState({ workerLocations: clearedLocations });
    }

    // ── 3. Resolve pending Training Hall buys ──────────────────
    const APPRENTICE_CAP = 4;
    const nextRosterSize: Record<string, number> = {
      ...state.publicState.apprenticeRosterSize,
    };
    const nextPendingBuys: Record<string, number> = {
      ...state.publicState.pendingApprenticeBuysByPlayer,
    };
    for (const playerId of literals.playerIds) {
      const pending = nextPendingBuys[playerId] ?? 0;
      if (pending <= 0) continue;
      const current = nextRosterSize[playerId] ?? 0;
      const grown = Math.min(APPRENTICE_CAP, current + pending);
      nextRosterSize[playerId] = grown;
      nextPendingBuys[playerId] = 0;
    }

    // ── 4. Advance season + decide next phase ──────────────────
    const newSeason = state.publicState.seasonNumber + 1;
    const seasonOverflow = newSeason > SEASON_LIMIT;
    // For seasons that continue, we keep this season's turn
    // order until wakeup overwrites it. Cleanup itself is a
    // no-op on turn order beyond clearing state.
    tx.patchPublicState({
      apprenticeRosterSize: nextRosterSize as Record<PlayerId, number>,
      pendingApprenticeBuysByPlayer: nextPendingBuys as Record<
        PlayerId,
        number
      >,
      seasonNumber: seasonOverflow ? state.publicState.seasonNumber : newSeason,
    });

    return accept(tx.state, [
      fx.transition(seasonOverflow ? "scoring" : "wakeup"),
    ]);
  },
});
