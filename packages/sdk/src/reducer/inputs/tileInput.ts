import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { z } from "zod";
import type { CollectorState, InputCollector } from "../model/spec";
import type { TableQueriesOfState } from "../model/queries";
import type { PlayerIdOfState, TileIdOfState } from "../model/extract";
import type { TileTargetRule } from "./tileTarget";

/** Trusted syntax uses the compiled inventory schema; client syntax uses seat references. */
export function tileInput<
  State extends CollectorState = CollectorState,
  Id extends string = TileIdOfState<State>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(options: {
  target: TileTargetRule<State, Id, Definitions>;
  schema: z.ZodType<Id>;
}): InputCollector<z.ZodType<Id>, State, "tile", Id> {
  const target = options.target;
  const eligible = (
    state: State,
    playerId: PlayerIdOfState<State>,
    q: TableQueriesOfState<State, Definitions>,
  ) => target.eligible({ state, playerId, q });
  // eslint-disable-next-line no-restricted-syntax -- Assembly binds hooks to State; compiled syntax and canonical membership establish the inventory Id.
  return {
    kind: "tile",
    schema: options.schema,
    eligibleTargets: eligible,
    validateTarget: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State, Definitions>,
      targetId: unknown,
    ) => target.validate({ state, playerId, q }, targetId),
    domain: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State, Definitions>,
    ) => ({
      type: "tileTarget",
      projection: "resolved",
      targetKind: "tile",
      zoneIds: target.zoneIds,
      boardIds: target.boardIds,
      eligibleTargets: eligible(state, playerId, q),
    }),
    meta: {
      targetKind: "tile",
      zoneIds: target.zoneIds,
      boardIds: target.boardIds,
    },
  } as unknown as InputCollector<z.ZodType<Id>, State, "tile", Id>;
}
