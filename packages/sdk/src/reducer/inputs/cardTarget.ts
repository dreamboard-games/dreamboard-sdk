import { resolveZoneAccess } from "../table/zones";
import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { CollectorState } from "../model/spec";
import type { ZoneDefinitions } from "../model/table";
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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetPredicate<State, Id, Definitions>;

export type CardTargetRule<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[] = readonly string[],
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRule<State, Id, Definitions> & {
  readonly zoneIds: ZoneIds;
  readonly zoneId: ZoneIds[number];
  readonly targetKind: "card";
};

export type CardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[] = readonly string[],
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRuleBuilder<
  State,
  Id,
  CardTargetRule<State, Id, ZoneIds, Definitions>,
  Definitions
>;

function createCardTargetBuilder<
  State extends CollectorState,
  Id extends string,
  ZoneIds extends readonly string[],
  Definitions extends TopologyDefinitions = TopologyDefinitions,
>(
  zoneIds: ZoneIds,
  definitions: ZoneDefinitions,
): CardTargetBuilder<State, Id, ZoneIds, Definitions> {
  return createTargetRuleBuilder<
    State,
    Id,
    CardTargetRule<State, Id, ZoneIds, Definitions>,
    Definitions
  >((predicates) => ({
    ...createTargetRule(
      ({ state, playerId, q }) => {
        // Authored zone selection is admitted through the compiled query owner;
        // the target builder's generic IDs refine that owner's runtime strings.
        const zones = q.zones as (
          zoneId: string,
        ) => Readonly<Record<string, readonly string[]>>;
        return zoneIds.flatMap((zoneId) => {
          const definition = definitions.zoneDefinitions[zoneId];
          return Object.entries(zones(zoneId)).flatMap(([hostId, cards]) =>
            resolveZoneAccess(
              state.table,
              definitions,
              definition,
              hostId,
              playerId,
            )
              ? cards.filter((id) => Object.hasOwn(state.table.cards, id))
              : [],
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
  }));
}

export const cardTarget = {
  zones<
    State extends CollectorState,
    Id extends string = CardIdOfState<State>,
    const ZoneIds extends readonly string[] = readonly string[],
    Definitions extends TopologyDefinitions = TopologyDefinitions,
  >(
    zoneIds: ZoneIds,
    definitions: ZoneDefinitions,
  ): CardTargetBuilder<State, Id, ZoneIds, Definitions> {
    return createCardTargetBuilder<State, Id, ZoneIds, Definitions>(
      zoneIds,
      definitions,
    );
  },
};
