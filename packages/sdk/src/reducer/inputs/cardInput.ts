import { z } from "zod";
import type { CollectorState, InputCollector } from "../model/spec";
import type { TableQueriesOfState } from "../model/queries";
import type { PlayerIdOfState } from "../model/extract";
import type { CardIdOfState } from "../model/extract";
import type { CardTargetRule } from "./cardTarget";

/**
 * `cardInput` produces a collector backed by one built `cardTarget` rule.
 * The submitted value is a manifest-branded card id.
 *
 * The target rule feeds server-authoritative eligible-card projection, submit
 * validation, and tests through its `bind({ state, playerId, q })` helper.
 */
export function cardInput<
  State extends CollectorState = CollectorState,
  Id extends string = CardIdOfState<State>,
  const ZoneIds extends readonly string[] = readonly string[],
>(options: {
  target: CardTargetRule<State, Id, ZoneIds>;
}): InputCollector<z.ZodString, State, "card", Id> & {
  readonly meta: {
    readonly zoneId: ZoneIds[number];
    readonly zoneIds: ZoneIds;
    readonly targetKind: "card";
  };
} {
  const target = options.target;
  const eligible = (
    state: State,
    playerId: PlayerIdOfState<State>,
    q: TableQueriesOfState<State>,
  ) => target.eligible({ state, playerId, q });
  // Assembly binds state, player, and queries to one validated game contract.
  // The string schema checks wire shape only. The runtime must also call
  // validateTarget before exposing a manifest Id to authored reducers; matching
  // a canonical candidate supplies that refinement. This assertion binds both
  // invariants when hooks enter the heterogeneous collector registry.
  return {
    kind: "card",
    schema: z.string(),
    eligibleTargets: eligible,
    validateTarget: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State>,
      targetId: unknown,
    ) => target.validate({ state, playerId, q }, targetId),
    domain: (
      state: State,
      playerId: PlayerIdOfState<State>,
      q: TableQueriesOfState<State>,
    ) => ({
      type: "cardTarget" as const,
      projection: "resolved" as const,
      targetKind: target.targetKind,
      zoneIds: target.zoneIds,
      eligibleTargets: eligible(state, playerId, q),
    }),
    meta: {
      zoneId: target.zoneId,
      zoneIds: target.zoneIds,
      targetKind: target.targetKind,
    },
  } as unknown as InputCollector<z.ZodString, State, "card", Id> & {
    readonly meta: {
      readonly zoneId: ZoneIds[number];
      readonly zoneIds: ZoneIds;
      readonly targetKind: "card";
    };
  };
}
