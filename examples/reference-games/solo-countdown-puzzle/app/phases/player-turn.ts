import type { BeaconId, GameContract, GameState } from "../game-contract";
import { beaconIds, playerTurnPhaseStateSchema } from "../game-contract";
import {
  allBeaconsLit,
  beaconScore,
  makeOutcome,
  MAX_BEACON_LEVEL,
  validateRepair,
} from "../rules";
import {
  boardInput,
  boardTarget,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";

const beaconSpaceTarget = boardTarget
  .space<GameState, BeaconId>("beacon-grid")
  .where({
    id: "known-beacon-space",
    errorCode: "UNKNOWN_BEACON",
    message: "Choose a known beacon space.",
    test: ({ target }) => beaconIds.includes(target),
  })
  .build();

export const repairBeacon = defineInteraction<
  GameContract,
  typeof playerTurnPhaseStateSchema
>()({
  presentation: {
    label: "Repair beacon",
    help: "Spend one energy and raise the selected beacon by one level.",
  },
  errorCodes: [
    "PLAYER_NOT_AUTHORIZED",
    "UNKNOWN_BEACON",
    "NOT_ENOUGH_ENERGY",
    "GAME_ALREADY_COMPLETE",
  ],
  inputs: {
    beaconId: boardInput.space<GameState, BeaconId>({
      target: beaconSpaceTarget,
    }),
  },
  rules: [
    {
      id: "repair-beacon-rules",
      errorCode: "UNKNOWN_BEACON",
      validate({ state, input }) {
        const result = validateRepair(state, {
          playerId: input.playerId,
          beaconId: input.params.beaconId,
        });
        return result.ok ? null : result;
      },
    },
  ],
  reduce({ state, input, accept, endGame, fx, reject }) {
    const beaconId = input.params.beaconId;
    const validation = validateRepair(state, {
      playerId: input.playerId,
      beaconId,
    });
    if (!validation.ok) {
      return reject(validation.errorCode, validation.message);
    }

    const nextBeacons = {
      ...state.publicState.beacons,
      [beaconId]: Math.min(
        MAX_BEACON_LEVEL,
        state.publicState.beacons[beaconId] + 1,
      ),
    };
    const nextReinforcement =
      beaconId === "beacon-harbor" &&
      state.publicState.beacons["beacon-harbor"] === 0
        ? state.publicState.reinforcement + 1
        : state.publicState.reinforcement;

    const nextState = {
      ...state,
      publicState: {
        ...state.publicState,
        energy: state.publicState.energy - 1,
        reinforcement: nextReinforcement,
        beacons: nextBeacons,
      },
    };

    if (allBeaconsLit(nextBeacons)) {
      const outcome = makeOutcome("all-beacons-lit", beaconScore(nextBeacons));
      return endGame(
        {
          ...nextState,
          publicState: {
            ...nextState.publicState,
            completed: true,
            outcome,
          },
        },
        outcome,
        { instructions: [fx.transition("gameOver")] },
      );
    }

    return accept(nextState, {
      instructions: [fx.transition("resolveWeather")],
    });
  },
});

export const playerTurn = definePhase<GameContract>()({
  kind: "player",
  state: playerTurnPhaseStateSchema,
  initialState: () => ({}),
  actor: ({ q }) => q.player.order()[0] ?? null,
  enter({ state, accept, edit, q }) {
    const [playerId] = q.player.order();
    if (!playerId || state.flow.activePlayers.includes(playerId)) {
      return accept(state);
    }
    const tx = edit(state);
    tx.setActivePlayers([playerId]);
    return accept(tx.state);
  },
  interactions: {
    repairBeacon,
  },
});
