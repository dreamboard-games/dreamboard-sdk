type NumberRange<N extends number, A extends number[] = []> = number extends N
  ? number
  : A["length"] extends 64
    ? number
    : A["length"] extends N
      ? A[number] | N
      : NumberRange<N, [...A, A["length"]]>;

/** Runtime ids use the base id when count is omitted or at most one. */
export type RuntimeIdsFromCount<Base extends string, Count> = [Count] extends [
  never,
]
  ? Base
  : Count extends number
    ? number extends Count
      ? Base | `${Base}-${number}`
      : Count extends 0 | 1
        ? Base
        : `${Base}-${Exclude<NumberRange<Count>, 0>}`
    : Base;
