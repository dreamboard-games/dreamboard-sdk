import type { ActorRef, FlowDiagnostic } from "./types.js";

export type SchedulerFlowProjection = {
  readonly phase: string;
  readonly step: string | null;
  readonly activePlayerIds: readonly string[];
  readonly pendingPlayerIds: readonly string[];
  /**
   * Causal continuation ownership supplied by trusted scheduler authority.
   * An empty list means the scheduler has proved no edge or cannot prove one;
   * callers must never infer an edge from inactive turns or descriptor prose.
   */
  readonly continuationDependencies?: readonly {
    readonly waiterPlayerId: string;
    readonly blockerPlayerIds: readonly string[];
  }[];
};

export function createFlowDiagnostic(options: {
  readonly scheduler: SchedulerFlowProjection;
  readonly playerIds: readonly string[];
}): FlowDiagnostic {
  const actor = (playerId: string): ActorRef | null => {
    const seat = options.playerIds.indexOf(playerId);
    return seat < 0 ? null : { seat, playerId };
  };
  const actors = (playerIds: readonly string[]): ActorRef[] =>
    [...new Set(playerIds)]
      .flatMap((playerId) => {
        const resolved = actor(playerId);
        return resolved ? [resolved] : [];
      })
      .sort((left, right) => left.seat - right.seat);

  const blockedBy = (options.scheduler.continuationDependencies ?? [])
    .flatMap((dependency) => {
      const waiter = actor(dependency.waiterPlayerId);
      const blockers = actors(dependency.blockerPlayerIds);
      return waiter && blockers.length > 0
        ? [
            {
              actor: waiter,
              blockers,
              source: "scheduler" as const,
            },
          ]
        : [];
    })
    .sort((left, right) => left.actor.seat - right.actor.seat);

  return {
    phase: options.scheduler.phase,
    step: options.scheduler.step,
    activeActors: actors(options.scheduler.activePlayerIds),
    pendingActors: actors(options.scheduler.pendingPlayerIds),
    continuationWaiters: actors(
      blockedBy.map((dependency) => dependency.actor.playerId),
    ),
    blockedBy,
  };
}
