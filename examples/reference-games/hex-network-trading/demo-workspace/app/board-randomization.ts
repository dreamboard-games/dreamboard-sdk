import {
  boardHelpers,
  records,
  type EdgeId,
} from "../shared/manifest-contract";
import { type PortType, type Terrain } from "./game-contract";

type RandomSubset = {
  subset<const Values extends readonly unknown[]>(options: {
    from: Values;
    count: number;
  }): readonly Values[number][];
};

const FRONTIER_TRAILS_TERRAINS = [
  "timberGrove",
  "timberGrove",
  "timberGrove",
  "timberGrove",
  "clayPit",
  "clayPit",
  "clayPit",
  "grainField",
  "grainField",
  "grainField",
  "grainField",
  "flaxMeadow",
  "flaxMeadow",
  "flaxMeadow",
  "flaxMeadow",
  "ironHills",
  "ironHills",
  "ironHills",
  "badlands",
] as const satisfies readonly Exclude<Terrain, "borderland">[];

const FRONTIER_TRAILS_TOKENS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
] as const;

const FRONTIER_TRAILS_PORT_TYPES = [
  "clay",
  "cloth",
  "iron",
  "grain",
  "timber",
  "3:1",
  "3:1",
  "3:1",
  "3:1",
] as const satisfies readonly PortType[];

const SECTOR = "frontier" as const;
const SPACE_KINDS = boardHelpers.spaceKinds(SECTOR);

const HARBOR_EDGE_IDS: readonly EdgeId[] = boardHelpers
  .authoredHexEdges(SECTOR)
  .filter((edge) => edge.typeId === "relay")
  .sort((left, right) => {
    const leftIndex = left.fields.relayIndex ?? 0;
    const rightIndex = right.fields.relayIndex ?? 0;
    return leftIndex - rightIndex;
  })
  .map((edge) => boardHelpers.resolveHexEdgeId(SECTOR, edge.ref));

if (HARBOR_EDGE_IDS.length !== FRONTIER_TRAILS_PORT_TYPES.length) {
  throw new Error(
    `Expected ${FRONTIER_TRAILS_PORT_TYPES.length} relay slots, found ${HARBOR_EDGE_IDS.length}.`,
  );
}

export type RandomizedBoardSetup = {
  terrainBySpaceId: Record<string, Terrain>;
  numberTokenBySpaceId: Record<string, number | null>;
  portsByEdgeId: Record<string, PortType>;
};

export function canonicalBoardSetup(): RandomizedBoardSetup {
  return buildBoardSetup(
    FRONTIER_TRAILS_TERRAINS,
    FRONTIER_TRAILS_TOKENS,
    FRONTIER_TRAILS_PORT_TYPES,
  );
}

export function randomBoardSetup(random: RandomSubset): RandomizedBoardSetup {
  return buildBoardSetup(
    random.subset({
      from: FRONTIER_TRAILS_TERRAINS,
      count: FRONTIER_TRAILS_TERRAINS.length,
    }),
    random.subset({
      from: FRONTIER_TRAILS_TOKENS,
      count: FRONTIER_TRAILS_TOKENS.length,
    }),
    random.subset({
      from: FRONTIER_TRAILS_PORT_TYPES,
      count: FRONTIER_TRAILS_PORT_TYPES.length,
    }),
  );
}

function buildBoardSetup(
  terrains: readonly Exclude<Terrain, "borderland">[],
  tokens: readonly number[],
  ports: readonly PortType[],
): RandomizedBoardSetup {
  const numberTokenBySpaceId = records.spaceIds<number | null>(null);

  let terrainIdx = 0;
  let tokenIdx = 0;
  const terrainBySpaceId = records.spaceIds<Terrain>((spaceId) => {
    if (SPACE_KINDS[spaceId] === "borderland") {
      return "borderland";
    }
    const terrain = terrains[terrainIdx];
    if (terrain === undefined) {
      throw new Error(
        `Missing terrain for land space '${spaceId}'. Expected ${FRONTIER_TRAILS_TERRAINS.length} terrain assignments.`,
      );
    }
    terrainIdx++;
    if (terrain === "badlands") {
      numberTokenBySpaceId[spaceId] = null;
    } else {
      const numberToken = tokens[tokenIdx];
      if (numberToken === undefined) {
        throw new Error(
          `Missing number token for ${terrain} land space '${spaceId}'. Expected ${FRONTIER_TRAILS_TOKENS.length} number tokens.`,
        );
      }
      tokenIdx++;
      numberTokenBySpaceId[spaceId] = numberToken;
    }
    return terrain;
  });
  if (terrainIdx !== terrains.length) {
    throw new Error(
      `Expected to assign all ${terrains.length} terrains, assigned ${terrainIdx}.`,
    );
  }
  if (tokenIdx !== tokens.length) {
    throw new Error(
      `Expected to assign all ${tokens.length} number tokens, assigned ${tokenIdx}.`,
    );
  }
  const portsByEdgeId: Record<string, PortType> = {};
  for (let i = 0; i < HARBOR_EDGE_IDS.length; i++) {
    const edgeId = HARBOR_EDGE_IDS[i]!;
    const portType = ports[i];
    if (!portType) {
      throw new Error(`Missing port type for relay edge '${edgeId}'.`);
    }
    portsByEdgeId[edgeId] = portType;
  }

  return {
    terrainBySpaceId,
    numberTokenBySpaceId,
    portsByEdgeId,
  };
}
