import type {
  CommandSource,
  ApplySource,
  SubmitResult,
  SourceSnapshot,
} from "../../headless/sources/types.js";
import type {
  GameOutcome,
  ReducerSessionState,
} from "../../shared/runtime-types.js";
import type { ScenarioCommandOf } from "../definitions.js";

/** JSON round-trippable tooling checkpoint. Private state stays in testing. */
export interface LocalCheckpoint {
  readonly state: ReducerSessionState;
  readonly terminal: GameOutcome | null;
}
export interface LocalSource<Game>
  extends
    CommandSource,
    ApplySource<ScenarioCommandOf<Game>, Promise<SubmitResult>> {
  switchSeat(playerId: string): void;
  checkpoint(): LocalCheckpoint;
  restore(checkpoint: LocalCheckpoint): void;
  inspect(): SourceSnapshot;
  explore(options: {
    maxEvaluations: number;
  }): Promise<readonly ScenarioCommandOf<Game>[]>;
}
