import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
import type { CollectorState } from "../model/spec";
import type { TileIdOfState } from "../model/extract";
import {
  createTargetRule,
  createTargetRuleBuilder,
  type TargetPredicate,
  type TargetRule,
  type TargetRuleBuilder,
} from "./targetRule";

export type TileTargetPredicate<
  State extends CollectorState,
  Id extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetPredicate<State, Id, Definitions>;

export type TileTargetRule<
  State extends CollectorState,
  Id extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRule<State, Id, Definitions> & {
  readonly targetKind: "tile";
  readonly zoneIds: readonly string[];
  readonly boardIds: readonly string[];
};
export type TileTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = TargetRuleBuilder<
  State,
  Id,
  TileTargetRule<State, Id, Definitions>,
  Definitions
>;

function createTileTargetBuilder<
  State extends CollectorState,
  Id extends string,
  Definitions extends TopologyDefinitions,
>(
  zoneIds: readonly string[],
  boardIds: readonly string[],
): TileTargetBuilder<State, Id, Definitions> {
  return createTargetRuleBuilder<
    State,
    Id,
    TileTargetRule<State, Id, Definitions>,
    Definitions
  >((predicates) => ({
    ...createTargetRule(
      ({ state, q }) => {
        const candidates = new Set<string>();
        const zones = q.zones as (
          zoneId: string,
        ) => Readonly<Record<string, readonly string[]>>;
        for (const zoneId of zoneIds)
          for (const ids of Object.values(zones(zoneId)))
            for (const id of ids)
              if (Object.hasOwn(state.table.tiles, id)) candidates.add(id);
        for (const [id, location] of Object.entries(
          state.table.componentLocations,
        ))
          if (
            Object.hasOwn(state.table.tiles, id) &&
            location.type === "OnBoard" &&
            boardIds.includes(location.boardId)
          )
            candidates.add(id);
        // Canonical inventory membership establishes the authored Id witness.
        return [...candidates] as Id[];
      },
      predicates,
      {
        missingCandidateIssue: {
          errorCode: "TILE_TARGET_NOT_ELIGIBLE",
          message: "Tile target is not eligible.",
        },
      },
    ),
    targetKind: "tile",
    zoneIds: Object.freeze([...zoneIds]),
    boardIds: Object.freeze([...boardIds]),
  }));
}

/** Inventory targets name tile instances, independently of their cell spaces. */
export const tileTarget = {
  zones<
    State extends CollectorState,
    Id extends string = TileIdOfState<State>,
    Definitions extends TopologyDefinitions = TopologyDefinitions,
  >(zoneIds: readonly string[]): TileTargetBuilder<State, Id, Definitions> {
    return createTileTargetBuilder<State, Id, Definitions>(zoneIds, []);
  },
  boards<
    State extends CollectorState,
    Id extends string = TileIdOfState<State>,
    Definitions extends TopologyDefinitions = TopologyDefinitions,
  >(boardIds: readonly string[]): TileTargetBuilder<State, Id, Definitions> {
    return createTileTargetBuilder<State, Id, Definitions>([], boardIds);
  },
};
