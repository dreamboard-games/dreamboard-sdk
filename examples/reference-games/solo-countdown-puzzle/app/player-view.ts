import {
  definePlayerView,
  defineSharedView,
} from "@dreamboard-games/sdk/reducer";
import {
  beaconIds,
  type BeaconId,
  type GameContract,
  type GameState,
  type OutcomeCode,
  type PlayerId,
  type RevealedWeather,
  type SystemEvent,
} from "./game-contract";
import { repairableBeaconIds, weatherCards } from "./rules";

export type BeaconView = {
  readonly id: BeaconId;
  readonly name: string;
  readonly level: number;
  readonly lit: boolean;
};

export type SharedView = {
  readonly currentPhase: string;
  readonly turnsRemaining: number;
  readonly energy: number;
  readonly storm: number;
  readonly reinforcement: boolean;
  readonly beacons: readonly BeaconView[];
  readonly repairableBeaconIds: readonly BeaconId[];
  readonly weatherHistory: readonly RevealedWeather[];
  readonly weatherRemaining: number;
  readonly events: readonly SystemEvent[];
  readonly completed: boolean;
  readonly outcomeCode: OutcomeCode | null;
  readonly outcome: GameState["publicState"]["outcome"];
  readonly activePlayerId: PlayerId | null;
};

export type PlayerView = SharedView & {
  readonly playerId: PlayerId;
  readonly isActivePlayer: boolean;
};

const beaconNames: Record<BeaconId, string> = {
  "beacon-north": "North Beacon",
  "beacon-harbor": "Harbor Beacon",
  "beacon-south": "South Beacon",
};

function projectSharedState(
  state: Pick<GameState, "flow" | "publicState">,
): SharedView {
  const activePlayerId = (state.flow.activePlayers[0] ??
    null) as PlayerId | null;
  return {
    currentPhase: state.flow.currentPhase,
    turnsRemaining: state.publicState.turnsRemaining,
    energy: state.publicState.energy,
    storm: state.publicState.storm,
    reinforcement: state.publicState.reinforcement,
    beacons: beaconIds.map((beaconId) => {
      const level = state.publicState.beacons[beaconId];
      return {
        id: beaconId,
        name: beaconNames[beaconId],
        level,
        lit: level >= 2,
      };
    }),
    repairableBeaconIds: repairableBeaconIds(state.publicState),
    weatherHistory: state.publicState.weatherHistory,
    weatherRemaining:
      weatherCards.length - state.publicState.weatherHistory.length,
    events: state.publicState.events,
    completed: state.publicState.completed,
    outcomeCode:
      (state.publicState.outcome?.reason.code as OutcomeCode | undefined) ??
      null,
    outcome: state.publicState.outcome,
    activePlayerId,
  };
}

export const sharedView = defineSharedView<GameContract>()({
  project({ state }) {
    return projectSharedState(state);
  },
});

export const playerView = definePlayerView<GameContract>()({
  project({ state, playerId }): PlayerView {
    const shared = projectSharedState(state);
    return {
      ...shared,
      playerId,
      isActivePlayer: shared.activePlayerId === playerId,
    };
  },
});
