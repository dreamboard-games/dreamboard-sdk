import type * as Wire from "../runtime-types.js";

export type GameEventDetail = Readonly<Wire.GameEventDetail>;
export type SystemActionEvent = Readonly<
  Omit<Wire.SystemActionEvent, "details">
> & {
  readonly details?: readonly GameEventDetail[];
};
export type ProjectedGameEventDetail = Readonly<Wire.ProjectedGameEventDetail>;
export type ProjectedGameEvent = Readonly<Wire.ProjectedGameEvent>;
/** Authored text is deliberate publication to the explicitly declared audience. */
export type GameEvent = SystemActionEvent;
export type OutcomeResult = Wire.OutcomeResult;
export type OutcomeScoreComponent = Readonly<Wire.OutcomeScoreComponent>;
export type OutcomeTieBreak = Readonly<Wire.OutcomeTieBreak>;
export type OutcomeStanding<Player extends string = string> = Readonly<
  Omit<Wire.OutcomeStanding, "playerId" | "scoreBreakdown" | "tieBreaks">
> & {
  readonly playerId: Player;
  readonly scoreBreakdown?: readonly OutcomeScoreComponent[];
  readonly tieBreaks?: readonly OutcomeTieBreak[];
};
export type GameOutcome<Player extends string = string> = {
  readonly reason: Readonly<Wire.GameOutcome["reason"]>;
  readonly standings: readonly OutcomeStanding<Player>[];
};
