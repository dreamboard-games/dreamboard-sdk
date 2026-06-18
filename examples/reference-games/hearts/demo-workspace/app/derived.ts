// Memoized, pure projections of reducer state. Read them from reducer
// callbacks and view projections via the injected `derived` helper:
//
//   reduce({ state, derived, accept }) {
//     const winner = derived(winnerOf);
//     return accept({ ...state, publicState: { ...state.publicState, winnerPlayerId: winner } });
//   }
//
// Do NOT mirror derived values back into `publicState`. Keep the raw
// inputs (component locations, zone contents, counters) in state and
// express aggregates here.
//
// Uncomment the example below once you have something to derive.

// import { defineDerived } from "@dreamboard-games/sdk/reducer";
// import type { GameContract } from "./game-contract";
//
// export const winnerOf = defineDerived<GameContract>()({
//   name: "winnerOf",
//   compute: ({ state }) => {
//     // Example: return the first player at or above the VP target.
//     return state.publicState.winnerPlayerId ?? null;
//   },
// });

export {};
