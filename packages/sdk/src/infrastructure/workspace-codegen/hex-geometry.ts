import type { HexSpaceSpec, HexVertexRef } from "../../types/index.js";

const HEX_CORNERS = ["ne-e", "e-se", "se-sw", "sw-w", "w-nw", "nw-ne"] as const;
type HexCorner = (typeof HEX_CORNERS)[number];

const HEX_CORNER_OFFSETS: Record<HexCorner, readonly [number, number, number]> =
  {
    "ne-e": [2, -1, -1],
    "e-se": [1, -2, 1],
    "se-sw": [-1, -1, 2],
    "sw-w": [-2, 1, 1],
    "w-nw": [-1, 2, -1],
    "nw-ne": [1, 1, -2],
  };

function cubeFromAxial(
  space: Pick<HexSpaceSpec, "q" | "r">,
): readonly [number, number, number] {
  const x = space.q;
  const z = space.r;
  return [x, -x - z, z] as const;
}

function cornerGeometryKey(
  space: Pick<HexSpaceSpec, "q" | "r">,
  corner: HexCorner,
): string {
  const [x, y, z] = cubeFromAxial(space);
  const [dx, dy, dz] = HEX_CORNER_OFFSETS[corner];
  return `${3 * x + dx},${3 * y + dy},${3 * z + dz}`;
}

export function resolveHexVertexGeometryKey(
  ref: HexVertexRef,
  spacesById: ReadonlyMap<string, HexSpaceSpec>,
): string {
  const resolvedSpaces = [...ref.spaces]
    .sort((left, right) => left.localeCompare(right))
    .map((spaceId) => {
      const space = spacesById.get(spaceId);
      if (!space) {
        throw new Error(
          `Hex vertex ref references unknown space '${spaceId}'.`,
        );
      }
      return space;
    });
  const keyCounts = new Map<string, number>();
  for (const space of resolvedSpaces) {
    for (const corner of HEX_CORNERS) {
      const key = cornerGeometryKey(space, corner);
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const candidates = [...keyCounts.entries()]
    .filter(([, count]) => count === resolvedSpaces.length)
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
  if (candidates.length !== 1) {
    throw new Error(
      `Hex vertex ref spaces '${ref.spaces.join(", ")}' do not resolve to exactly one shared vertex.`,
    );
  }
  const vertexKey = candidates[0];
  if (vertexKey === undefined) {
    throw new Error("internal: expected exactly one hex vertex geometry key");
  }
  return vertexKey;
}
