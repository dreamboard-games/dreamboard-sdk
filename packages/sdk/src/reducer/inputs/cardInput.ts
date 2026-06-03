import { z } from "zod";
import type { CollectorState, InputCollector } from "../model/spec";
import type { CardIdOfState } from "../model/extract";
import type { CardTargetRule } from "./cardTarget";
import type { InputFieldRef } from "./defineInputs";

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
  dependsOn?: readonly InputFieldRef<string, unknown>[];
}): InputCollector<z.ZodType<Id>, State, "card"> & {
  readonly meta: {
    readonly zoneId: ZoneIds[number];
    readonly zoneIds: ZoneIds;
    readonly targetKind: "card";
  };
} {
  const target = options.target;
  const dependsOn = options.dependsOn?.map((dependency) => dependency.key);
  return {
    kind: "card",
    schema: z.string() as unknown as z.ZodType<Id>,
    eligibleTargets: ((state, playerId, q, values) =>
      target.eligible({
        state: state as State,
        playerId: playerId as never,
        q: q as never,
        values,
      })) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
          values?: Readonly<Record<string, unknown>>,
        ) => ReadonlyArray<unknown>)
      | undefined,
    validateTarget: ((state, playerId, q, targetId, values) =>
      target.validate(
        {
          state: state as State,
          playerId: playerId as never,
          q: q as never,
          values,
        },
        targetId as Id,
      )) as
      | ((
          state: CollectorState,
          playerId: string,
          q: unknown,
          targetId: unknown,
          values?: Readonly<Record<string, unknown>>,
        ) => ReturnType<CardTargetRule<CollectorState, string>["validate"]>)
      | undefined,
    ...(dependsOn ? { dependsOn } : {}),
    domain: (state, playerId, q, _derived, values) => ({
      type: "cardTarget" as const,
      projection: "resolved" as const,
      targetKind: target.targetKind,
      zoneIds: target.zoneIds,
      eligibleTargets: target
        .eligible({
          state: state as State,
          playerId: playerId as never,
          q: q as never,
          values,
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
