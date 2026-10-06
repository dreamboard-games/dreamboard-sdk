import type { CollectorState } from "../model/spec";
import type { CardIdOfState } from "../model/extract";
import {
  createTargetRule,
  createTargetRuleBuilder,
  type TargetPredicate,
  type TargetRule,
  type TargetRuleBuilder,
} from "./targetRule";

export type CardTargetPredicate<
  State extends CollectorState,
  Id extends string,
> = TargetPredicate<State, Id>;

export type CardTargetRule<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[] = readonly string[],
> = TargetRule<State, Id> & {
  readonly zoneIds: ZoneIds;
  readonly zoneId: ZoneIds[number];
  readonly targetKind: "card";
};

export type CardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[] = readonly string[],
> = TargetRuleBuilder<State, Id, CardTargetRule<State, Id, ZoneIds>>;

function createCardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[],
>(zoneIds: ZoneIds): CardTargetBuilder<State, Id, ZoneIds> {
  return createTargetRuleBuilder<State, Id, CardTargetRule<State, Id, ZoneIds>>(
    (predicates) => ({
      ...createTargetRule(
        ({ state, playerId, q }) => {
          // Authored zone selection is admitted through the compiled query owner;
          // the target builder's generic IDs refine that owner's runtime strings.
          const zones = q.zones as (
            zoneId: string,
          ) => Readonly<Record<string, readonly string[]>>;
          return zoneIds.flatMap((zoneId) => {
            const hosts = zones(zoneId);
            return (hosts[playerId] ?? hosts.table ?? []).filter((id) =>
              Object.hasOwn(state.table.cards, id),
            );
          }) as Id[];
        },
        predicates,
        {
          missingCandidateIssue: {
            errorCode: "CARD_TARGET_NOT_ELIGIBLE",
            message: "Card target is not eligible.",
          },
        },
      ),
      zoneIds,
      zoneId: zoneIds[0],
      targetKind: "card",
    }),
  );
}

export const cardTarget = {
  zones<
    State extends CollectorState,
    Id extends string = CardIdOfState<State>,
    const ZoneIds extends readonly string[] = readonly string[],
  >(zoneIds: ZoneIds): CardTargetBuilder<State, Id, ZoneIds> {
    return createCardTargetBuilder<State, Id, ZoneIds>(zoneIds);
  },
};
