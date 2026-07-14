import {
  createReducerEdit,
  createStateQueries,
} from "@dreamboard-games/sdk/reducer";
import type { GameState } from "./game-contract";

export { createStateQueries };

/**
 * Small, SDK-shaped reducer helpers belong here.
 *
 * Keep schema and contract declarations in app/game-contract.ts.
 * Keep initial state callbacks and defineGame wiring in app/game.ts.
 * Keep memoized aggregates (winner checks, VP totals, longest-road,
 * largest-army) in app/derived.ts via `defineDerived`.
 * Keep phase files focused on one game-flow state.
 *
 * When this file starts collecting real game rules, split them by domain
 * under app/rules/ instead, for example app/rules/board.ts,
 * app/rules/resources.ts, or app/rules/scoring.ts.
 *
 * Recommended authoring pattern inside a phase reducer:
 *
 *   const tx = edit(state);
 *   tx.setActivePlayers([q.players.order()[0]]);
 *   return accept(tx.state);
 */

export const edit = createReducerEdit<GameState>();

export function stateQueries(state: GameState) {
  return createStateQueries(state);
}
