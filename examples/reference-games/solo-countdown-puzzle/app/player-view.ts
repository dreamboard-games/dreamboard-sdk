import type { BeaconId, GameContract, OutcomeCode } from "./game-contract";
import { beaconIds } from "./game-contract";
import { definePlayerView } from "@dreamboard-games/sdk/reducer";

export type BeaconView = {
  readonly id: BeaconId;
  readonly name: string;
  readonly level: number;
  readonly lit: boolean;
};

export type PlayerView = {
  readonly currentPhase: string;
  readonly turnsRemaining: number;
  readonly energy: number;
  readonly storm: number;
  readonly reinforcement: number;
  readonly beacons: readonly BeaconView[];
  readonly events: readonly {
    readonly kind: "systemAction";
    readonly procedureId: "resolve-weather" | "advance-countdown";
    readonly title: string;
    readonly summary: string;
  }[];
  readonly completed: boolean;
  readonly outcomeCode: OutcomeCode | null;
  readonly activePlayers: readonly string[];
};

const beaconNames: Record<BeaconId, string> = {
  "beacon-north": "North Beacon",
  "beacon-harbor": "Harbor Beacon",
  "beacon-south": "South Beacon",
};

export const playerView = definePlayerView<GameContract>()({
  project({ state }): PlayerView {
    return {
      currentPhase: state.flow.currentPhase,
      turnsRemaining: state.publicState.turnsRemaining,
      energy: state.publicState.energy,
      storm: state.publicState.storm,
      reinforcement: state.publicState.reinforcement,
      beacons: beaconIds.map((beaconId) => {
        const level = state.publicState.beacons[beaconId] ?? 0;
        return {
          id: beaconId,
          name: beaconNames[beaconId],
          level,
          lit: level >= 2,
        };
      }),
      events: state.publicState.events,
      completed: state.publicState.completed,
      outcomeCode:
        (state.publicState.outcome?.reason.code as OutcomeCode | undefined) ??
        null,
      activePlayers: state.flow.activePlayers,
    };
  },
});
