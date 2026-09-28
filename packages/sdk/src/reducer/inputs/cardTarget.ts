import { getPlayerZoneCards, getSharedZoneCards } from "../table";
import type { RuntimeTableRecord } from "../model";
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

function cardIdsForZone(
  table: RuntimeTableRecord,
  playerId: string,
  zoneId: string,
): readonly string[] {
  if (zoneId in table.hands || zoneId in table.zones.perPlayer) {
    return getPlayerZoneCards(table, playerId, zoneId);
  }
  if (zoneId in table.decks || zoneId in table.zones.shared) {
    return getSharedZoneCards(table, zoneId);
  }
  return [];
}

function createCardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[],
>(zoneIds: ZoneIds): CardTargetBuilder<State, Id, ZoneIds> {
  return createTargetRuleBuilder<State, Id, CardTargetRule<State, Id, ZoneIds>>(
    (predicates) => ({
      ...createTargetRule(
        ({ state, playerId }) =>
          zoneIds.flatMap(
            (zoneId) =>
              cardIdsForZone(state.table, playerId, zoneId) as readonly Id[],
          ),
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
