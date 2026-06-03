import type {
  DeckIdOfState,
  PhaseNameOfState,
  PlayerIdOfState,
  PlayerZoneIdOfState,
} from "../model/extract";
import type { AnyContinuationToken } from "../model/runtime";

export type FlowInstruction<PhaseName extends string> = {
  kind: "flow.transition";
  to: PhaseName;
};

export type EngineRollDieInstruction = {
  kind: "engine.rollDie";
  dieId: string;
  continuation?: AnyContinuationToken;
};

export type EngineShuffleSharedZoneInstruction<DeckId extends string> = {
  kind: "engine.shuffleSharedZone";
  zoneId: DeckId;
  continuation?: AnyContinuationToken;
};

export type EngineShufflePlayerZoneInstruction<
  PlayerZoneId extends string,
  PlayerId extends string,
> = {
  kind: "engine.shufflePlayerZone";
  zoneId: PlayerZoneId;
  playerId: PlayerId;
  continuation?: AnyContinuationToken;
};

export type EngineInstruction<
  DeckId extends string,
  PlayerZoneId extends string = string,
  PlayerId extends string = string,
> =
  | EngineRollDieInstruction
  | EngineShuffleSharedZoneInstruction<DeckId>
  | EngineShufflePlayerZoneInstruction<PlayerZoneId, PlayerId>;

export type RuntimeInstruction<
  PhaseName extends string,
  DeckId extends string,
  PlayerZoneId extends string = string,
  PlayerId extends string = string,
> =
  | FlowInstruction<PhaseName>
  | EngineInstruction<DeckId, PlayerZoneId, PlayerId>;

export type RuntimeInstructionForState<State> = RuntimeInstruction<
  PhaseNameOfState<State>,
  DeckIdOfState<State>,
  PlayerZoneIdOfState<State>,
  PlayerIdOfState<State>
>;
