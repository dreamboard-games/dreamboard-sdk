import {
  boardInput,
  boardTarget,
  defineInteraction,
  definePhase,
} from "@dreamboard-games/sdk/reducer";
import type { SpaceId } from "../../shared/manifest-contract";
import {
  beaconIds,
  playerTurnPhaseStateSchema,
  type BeaconId,
  type GameContract,
  type GameState,
} from "../game-contract";
import {
  allBeaconsLit,
  makeOutcome,
  MAX_BEACON_LEVEL,
  MAX_ENERGY,
} from "../rules";

const beaconSpaceTarget = boardTarget
  .space<GameState, SpaceId>("beacon-grid")
  .where({
    id: "known-beacon",
    errorCode: "UNKNOWN_BEACON",
    message: "Choose north, harbor, or south beacon.",
    test: ({ target }) => beaconIds.includes(target as BeaconId),
  })
  .where({
    id: "beacon-below-maximum",
    errorCode: "BEACON_ALREADY_LIT",
    message: "Choose a beacon below level two.",
    test: ({ state, target }) =>
      state.publicState.beacons[target as BeaconId] < MAX_BEACON_LEVEL,
  })
  .build();

const charge = defineInteraction<
  GameContract,
  typeof playerTurnPhaseStateSchema
>()({
  presentation: {
    label: "Charge",
    help: "Gain two energy, capped at seven.",
  },
  inputs: {},
  rules: [
    {
      id: "energy-below-cap",
      errorCode: "ENERGY_AT_CAP",
      message: "Energy is already at its maximum of seven.",
      available: ({ state }) => state.publicState.energy < MAX_ENERGY,
      validate: ({ state }) =>
        state.publicState.energy < MAX_ENERGY
          ? null
          : {
              errorCode: "ENERGY_AT_CAP",
              message: "Energy is already at its maximum of seven.",
            },
    },
  ],
  reduce({ state, accept, edit, fx }) {
    const tx = edit(state);
    tx.patchPublicState({
      energy: Math.min(MAX_ENERGY, state.publicState.energy + 2),
    });
    tx.setActivePlayers([]);
    return accept(tx.state, {
      instructions: [fx.transition("resolveWeather")],
    });
  },
});

const repairBeacon = defineInteraction<
  GameContract,
  typeof playerTurnPhaseStateSchema
>()({
  presentation: {
    label: "Repair beacon",
    help: "Spend one energy and raise a non-full beacon by one level.",
  },
  inputs: {
    beaconId: boardInput.space<GameState, SpaceId>({
      target: beaconSpaceTarget,
    }),
  },
  rules: [
    {
      id: "repair-energy-cost",
      errorCode: "NOT_ENOUGH_ENERGY",
      message: "Repairing a beacon requires one energy.",
      available: ({ state }) => state.publicState.energy >= 1,
      validate: ({ state }) =>
        state.publicState.energy >= 1
          ? null
          : {
              errorCode: "NOT_ENOUGH_ENERGY",
              message: "Repairing a beacon requires one energy.",
            },
    },
  ],
  reduce({ state, input, accept, edit, endGame, fx, reject }) {
    if (state.publicState.completed) {
      return reject("GAME_ALREADY_COMPLETE", "The lighthouse result is final.");
    }
    if (state.publicState.energy < 1) {
      return reject(
        "NOT_ENOUGH_ENERGY",
        "Repairing a beacon requires one energy.",
      );
    }
    const beaconId = input.params.beaconId as BeaconId;
    if (!beaconIds.includes(beaconId)) {
      return reject("UNKNOWN_BEACON", "Choose north, harbor, or south beacon.");
    }
    if (state.publicState.beacons[beaconId] >= MAX_BEACON_LEVEL) {
      return reject("BEACON_ALREADY_LIT", "Choose a beacon below level two.");
    }

    const beacons = {
      ...state.publicState.beacons,
      [beaconId]: state.publicState.beacons[beaconId] + 1,
    };
    const tx = edit(state);
    tx.patchPublicState({
      beacons,
      energy: state.publicState.energy - 1,
    });
    tx.setActivePlayers([]);

    if (allBeaconsLit(beacons)) {
      const playerId = input.playerId;
      const outcome = makeOutcome("ALL_BEACONS_LIT", playerId);
      tx.patchPublicState({ completed: true, outcome });
      return endGame(tx.state, outcome, {
        instructions: [fx.transition("gameOver")],
      });
    }

    return accept(tx.state, {
      instructions: [fx.transition("resolveWeather")],
    });
  },
});

const reinforce = defineInteraction<
  GameContract,
  typeof playerTurnPhaseStateSchema
>()({
  presentation: {
    label: "Reinforce",
    help: "Spend two energy to prevent the next Gale or Squall.",
  },
  inputs: {},
  rules: [
    {
      id: "reinforcement-not-stored",
      errorCode: "REINFORCEMENT_ALREADY_STORED",
      message: "The sea wall already has a stored reinforcement.",
      available: ({ state }) => !state.publicState.reinforcement,
      validate: ({ state }) =>
        !state.publicState.reinforcement
          ? null
          : {
              errorCode: "REINFORCEMENT_ALREADY_STORED",
              message: "The sea wall already has a stored reinforcement.",
            },
    },
    {
      id: "reinforcement-energy-cost",
      errorCode: "NOT_ENOUGH_ENERGY",
      message: "Reinforcing the sea wall requires two energy.",
      available: ({ state }) => state.publicState.energy >= 2,
      validate: ({ state }) =>
        state.publicState.energy >= 2
          ? null
          : {
              errorCode: "NOT_ENOUGH_ENERGY",
              message: "Reinforcing the sea wall requires two energy.",
            },
    },
  ],
  reduce({ state, accept, edit, fx, reject }) {
    if (state.publicState.reinforcement) {
      return reject(
        "REINFORCEMENT_ALREADY_STORED",
        "The sea wall already has a stored reinforcement.",
      );
    }
    if (state.publicState.energy < 2) {
      return reject(
        "NOT_ENOUGH_ENERGY",
        "Reinforcing the sea wall requires two energy.",
      );
    }
    const tx = edit(state);
    tx.patchPublicState({
      energy: state.publicState.energy - 2,
      reinforcement: true,
    });
    tx.setActivePlayers([]);
    return accept(tx.state, {
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
    const playerIds = q.player.order();
    if (playerIds.length !== 1) {
      throw new Error("Last Light requires exactly one human player.");
    }
    const tx = edit(state);
    tx.setActivePlayers([playerIds[0]]);
    return accept(tx.state);
  },
  interactions: {
    charge,
    repairBeacon,
    reinforce,
  },
});
