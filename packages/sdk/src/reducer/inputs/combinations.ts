export function* enumerateCombinations<Value>(
  values: readonly Value[],
  count: number,
): Iterable<Value[]> {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("Combination count must be a nonnegative integer.");
  }
  yield* combinationsFrom(values, count, 0, []);
}

function* combinationsFrom<Value>(
  values: readonly Value[],
  remaining: number,
  start: number,
  current: readonly Value[],
): Iterable<Value[]> {
  if (remaining === 0) {
    yield [...current];
    return;
  }
  for (let index = start; index <= values.length - remaining; index += 1) {
    yield* combinationsFrom(values, remaining - 1, index + 1, [
      ...current,
      values[index],
    ]);
  }
}
