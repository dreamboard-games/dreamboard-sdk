import { z } from "zod";
import type { CollectorState, InputCollector } from "../model/spec";
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
}): InputCollector<z.ZodType<Id>, State, "card"> & {
  readonly meta: {
    readonly zoneId: ZoneIds[number];
    readonly zoneIds: ZoneIds;
    readonly targetKind: "card";
  };
} {
  const target = options.target;
  return {
    kind: "card",
    schema: z.string() as unknown as z.ZodType<Id>,
    eligibleTargets: ((state, playerId, q) =>
      target.eligible({
        state: state as State,
        playerId: playerId as never,
        q: q as never,
      })) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
        ) => ReadonlyArray<unknown>)
      | undefined,
    validateTarget: ((state, playerId, q, targetId) =>
      target.validate(
        {
          state: state as State,
          playerId: playerId as never,
          q: q as never,
        },
        targetId as Id,
      )) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
          targetId: unknown,
        ) => ReturnType<CardTargetRule<CollectorState, string>["validate"]>)
      | undefined,
    domain: (state, playerId, q) => ({
      type: "cardTarget" as const,
      projection: "resolved" as const,
      targetKind: target.targetKind,
      zoneIds: target.zoneIds,
      eligibleTargets: target
        .eligible({
          state: state as State,
          playerId: playerId as never,
          q: q as never,
        })
        .map(String),
    }),
    meta: {
      zoneId: target.zoneId,
      zoneIds: target.zoneIds,
      targetKind: target.targetKind,
    },
  };
}
