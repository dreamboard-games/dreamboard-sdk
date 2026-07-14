import type {
  PlayerId,
  RiverCargoCardId,
} from "../../shared/manifest-contract";
import type { GameContract, GameState, ProcedureEvent } from "../game-contract";
import { humanTurnPhaseStateSchema } from "../game-contract";
import { withRiverOrder } from "../rules/cards";
import { procedureGameEvent } from "../rules/events";
import {
  cardInput,
  cardTarget,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";

const RIVER_ZONES = ["river"] as const;
const riverCardTarget = cardTarget
  .zones<GameState, RiverCargoCardId, typeof RIVER_ZONES>(RIVER_ZONES)
  .build();

export const humanTurn = definePhase<GameContract>()({
  kind: "player",
  state: humanTurnPhaseStateSchema,
  initialState: () => ({}),
  actor: ({ state, q }) =>
    q.player.order()[state.publicState.activeHumanIndex] ?? null,
  interactions: {
    claimCargo: defineInteraction<
      GameContract,
      typeof humanTurnPhaseStateSchema
    >()({
      inputs: {
        cargoId: cardInput<GameState, RiverCargoCardId, typeof RIVER_ZONES>({
          target: riverCardTarget,
        }),
      },
      reduce({ state, input, accept, edit, fx, q }) {
        const cargoId = input.params.cargoId;
        const playerId = input.playerId as PlayerId;
        const riverBefore = q.zone.sharedCards("river");
        const position = riverBefore.indexOf(cargoId);
        if (position < 0) {
          throw new Error(`Cargo '${cargoId}' is not in the river.`);
        }

        const tx = edit(state);
        tx.moveCardFromSharedZoneToPlayerZone({
          playerId,
          fromZoneId: "river",
          toZoneId: "human-cargo",
          cardId: cargoId,
        });
        const replacementId = tx.q.zone.sharedCards("cargo-deck")[0];
        if (!replacementId) {
          throw new Error("River Guild cargo deck exhausted before refill.");
        }
        tx.moveCardBetweenSharedZones({
          fromZoneId: "cargo-deck",
          toZoneId: "river",
          cardId: replacementId,
        });
        const nextRiver = [...riverBefore];
        nextRiver[position] = replacementId;
        const orderedState = withRiverOrder(tx.state, nextRiver);
        const refillEvent: ProcedureEvent = {
          kind: "river-refilled",
          round: state.publicState.round,
          cargoId: replacementId,
          position,
          source: "human",
          playerId,
        };
        const nextTx = edit(orderedState);
        const playerIds = q.player.order();
        const nextHumanIndex = state.publicState.activeHumanIndex + 1;
        nextTx.patchPublicState({
          activeHumanIndex:
            nextHumanIndex < playerIds.length ? nextHumanIndex : 0,
          procedureEvents: [...state.publicState.procedureEvents, refillEvent],
        });

        return accept(nextTx.state, {
          events: [procedureGameEvent(refillEvent)],
          ...(nextHumanIndex >= playerIds.length
            ? { instructions: [fx.transition("resolveRival")] }
            : {}),
        });
      },
    }),
  },
});
