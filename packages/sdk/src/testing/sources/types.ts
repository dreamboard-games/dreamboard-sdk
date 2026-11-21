import type {
  CommandSource,
  ApplySource,
  SubmitResult,
  SourceSnapshot,
} from "../../headless/sources/types.js";
import type {
  BotDecision,
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
  /** Ask the configured reducer bundle for one decision from the selected seat. */
  playBotTurn(strategyId: string): Promise<{
    readonly decision: NonNullable<BotDecision>;
    readonly result: SubmitResult;
  } | null>;
  checkpoint(): LocalCheckpoint;
  /** Parses untrusted checkpoint JSON before replacing state. */
  restore(checkpoint: unknown): void;
  inspect(): SourceSnapshot;
  explore(options: {
    maxEvaluations: number;
  }): Promise<readonly ScenarioCommandOf<Game>[]>;
}
