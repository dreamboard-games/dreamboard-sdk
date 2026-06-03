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

function cardIdsForZone<State extends CollectorState, Id extends string>(
  state: State,
  playerId: string,
  q: {
    zone: {
      sharedCards: (zoneId: never) => readonly unknown[];
      playerCards: (playerId: never, zoneId: never) => readonly unknown[];
    };
  },
  zoneId: string,
): readonly Id[] {
  const table = state.table as {
    decks?: Record<string, unknown>;
    hands?: Record<string, unknown>;
    zones?: {
      shared?: Record<string, unknown>;
      perPlayer?: Record<string, unknown>;
    };
  };
  if (
    zoneId in (table.hands ?? {}) ||
    zoneId in (table.zones?.perPlayer ?? {})
  ) {
    return q.zone.playerCards(
      playerId as never,
      zoneId as never,
    ) as readonly Id[];
  }
  if (zoneId in (table.decks ?? {}) || zoneId in (table.zones?.shared ?? {})) {
    return q.zone.sharedCards(zoneId as never) as readonly Id[];
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
        ({ state, playerId, q }) =>
          zoneIds.flatMap((zoneId) =>
            cardIdsForZone<State, Id>(state, playerId, q, zoneId),
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
      zoneId: zoneIds[0] as ZoneIds[number],
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
