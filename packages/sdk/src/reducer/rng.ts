import type { RuntimeRngState } from "./model";

/**
 * Deterministic pseudo-random integer generator for reducer-native games.
 *
 * The public contract is `(rng.seed, rng.cursor) -> value`, with the cursor
 * advanced by one per call. Same `(seed, cursor)` tuple always produces the
 * same output, which is what makes session replay deterministic without
 * having to persist anything beyond the seed and cursor.
 *
 * Internally we hash `(seed, cursor)` through a Murmur3-style 32-bit
 * finalizer rather than computing a linear combination of the cursor. The
 * older `(seed * A + C + cursor) & 0x7fffffff` form was linear in `cursor`,
 * so consecutive samples differed by a fixed step — for a d6 that meant
 * every roll produced a simple `+1` counter through the faces. Mixing
 * `(seed, cursor)` with an avalanche finalizer is still pure and still
 * cheap, but now nearby cursors yield well-distributed outputs.
 *
 * Distribution note: the `% bound` step is biased when `bound` is not a
 * power of two. For gameplay-level bounds (≤ 64) the bias is negligible
 * and we leave it in to keep replay fixtures stable against future bound
 * changes. If a caller ever needs strict uniformity we can add an
 * explicit `nextUniformInt` without touching the existing consumers.
 */
export function nextRandomInt(
  bound: number,
  rng: RuntimeRngState,
): [number, RuntimeRngState] {
  if (bound <= 0) {
    throw new Error("Random bound must be positive.");
  }
  const seed = rng.seed ?? 1;
  const raw = hashSeedCursor(seed, rng.cursor);
  const value = raw % bound;
  return [
    value,
    {
      ...rng,
      cursor: rng.cursor + 1,
      trace: [
        ...rng.trace,
        `cursor=${rng.cursor};bound=${bound};value=${value}`,
      ],
    },
  ];
}

/**
 * Mix `(seed, cursor)` into a uniformly-distributed uint32 using a
 * Murmur3-style finalizer. The seed is split into its low and high 32-bit
 * halves so large 53-bit JS-integer seeds (including the negative seeds
 * the backend derives from its own 64-bit generator) don't collapse onto
 * the same bucket after a `| 0` truncation.
 */
function hashSeedCursor(seed: number, cursor: number): number {
  const seedLo = seed | 0;
  // `Math.floor(seed / 2^32) | 0` keeps the upper bits of large seeds.
  // For small seeds this is 0 (or -1 for negatives), so the stir below is
  // still dominated by `seedLo` + `cursor` as you'd expect.
  const seedHi = Math.floor(seed / 0x1_0000_0000) | 0;
  let x = Math.imul(seedLo, 0x9e3779b1);
  x = (x + Math.imul(seedHi, 0x85ebca77)) | 0;
  x = (x + Math.imul(cursor | 0, 0xc2b2ae3d)) | 0;
  // Murmur3 32-bit finalizer.
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x = x ^ (x >>> 16);
  return x >>> 0;
}
