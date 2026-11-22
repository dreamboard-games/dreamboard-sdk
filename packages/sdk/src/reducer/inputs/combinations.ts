export function* enumerateCombinations<Value>(
  values: readonly Value[],
  count: number,
  start = 0,
  current: readonly Value[] = [],
): Iterable<Value[]> {
  const remaining = count - current.length;
  if (remaining === 0) {
    yield [...current];
    return;
  }
  for (let index = start; index <= values.length - remaining; index += 1) {
    yield* enumerateCombinations(values, count, index + 1, [
      ...current,
      values[index],
    ]);
  }
}
