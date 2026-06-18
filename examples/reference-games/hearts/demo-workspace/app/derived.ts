// Memoized, pure projections of reducer state. Read them from reducer
// callbacks and view projections via the injected `derived` helper:
//
//   reduce({ state, derived, accept }) {
//     const standings = derived(standingsForHand);
//     return accept(state, {
//       instructions: standings.length > 0 ? [fx.transition("scoreHand")] : [],
//     });
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
// export const standingsForHand = defineDerived<GameContract>()({
//   name: "standingsForHand",
//   compute: ({ state }) => {
//     // Example: return reducer-owned rows for the current hand.
//     return [];
//   },
// });

export {};
