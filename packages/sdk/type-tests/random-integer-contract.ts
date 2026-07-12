import type { RandomHelpers } from "../src/reducer/model/spec/runtime-args.js";

declare const random: RandomHelpers;

const dieResult: number = random.integer({
  minInclusive: 1,
  maxInclusive: 6,
});
const signedResult: number = random.integer({
  minInclusive: -2,
  maxInclusive: 2,
});

random.integer({
  // @ts-expect-error integer bounds are numeric.
  minInclusive: "1",
  maxInclusive: 6,
});
random.integer({
  minInclusive: 1,
  // @ts-expect-error integer bounds are numeric.
  maxInclusive: "6",
});

void dieResult;
void signedResult;
