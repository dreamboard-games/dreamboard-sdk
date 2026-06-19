import { definePhase } from "@dreamboard-games/sdk/reducer";
import { boardHelpers, ids } from "../../shared/manifest-contract";
import { setupPhaseStateSchema, type GameContract } from "../game-contract";
import { edit } from "../reducer-support";

// Pre-resolved ids from the manifest for the 6 fixed and 6 variable-pool
// candidate spaces. The 9 enabled spaces this game = all 6 fixed + 3 variable.
const FIXED_SPACE_IDS = boardHelpers.spaceIdsForType("fixed");
const VARIABLE_SPACE_IDS = boardHelpers.spaceIdsForType("variable");

// Workshop mat starting hand per rule.md §Setup: 2 coin + 1 wood per player.
const STARTING_RESOURCES = { coin: 2, wood: 1, stone: 0 } as const;

// Setup phase. Auto-runs on game start: draws 3-of-6 variable spaces
// deterministically against the session seed, deals 1 Order + 1 Apprentice
// card to each player from the (already-shuffled-by-bootstrap) decks, seeds
// each player's resources, then transitions to `wakeup`. Worker pieces stay
// detached — `apprenticeRosterSize` already starts at 2 in `game.ts`, and
// the implicit master is always 1, so no piece transactions are needed at setup.
export const setup = definePhase<GameContract>()({
  kind: "auto",
  state: setupPhaseStateSchema,
  initialState: () => ({ step: "draw-spaces" as const }),
  enter({ state, accept, fx, playerOrder, random }) {
    const drawnVariables = random.subset({
      from: VARIABLE_SPACE_IDS,
      count: 3,
    });
    // Re-validate as space ids so the public-state writer accepts the
    // narrowed `ids.spaceId` zod-branded type.
    const drawnVariableSpaceIds = drawnVariables.map((id) =>
      ids.spaceId.parse(id),
    );
    const enabledActionSpaces = [
      ...FIXED_SPACE_IDS.map((id) => ids.spaceId.parse(id)),
      ...drawnVariableSpaceIds,
    ];

    const tx = edit(state);
    tx.patchPublicState({
      setupVariablePoolDraw: drawnVariableSpaceIds,
      enabledActionSpaces,
    });
    for (const playerId of playerOrder) {
      tx.dealCardsToPlayerZone({
        fromZoneId: "order-deck",
        playerId,
        toZoneId: "order-hand",
        count: 1,
      });
      tx.dealCardsToPlayerZone({
        fromZoneId: "apprentice-deck",
        playerId,
        toZoneId: "apprentice-hand",
        count: 1,
      });
      tx.addResources({ playerId, amounts: STARTING_RESOURCES });
    }

    return accept(tx.state, { instructions: [fx.transition("wakeup")] });
  },
});
