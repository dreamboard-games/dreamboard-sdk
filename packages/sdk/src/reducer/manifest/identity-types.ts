/** Literal counts can be checked statically; dynamic numbers are checked at runtime. */
export type ValidCount<N> = N extends number
  ? number extends N
    ? N
    : `${N}` extends `${bigint}`
      ? `${N}` extends `-${string}` | "0"
        ? never
        : N
      : never
  : N;

type ValidateCounts<Entries> = Entries extends readonly unknown[]
  ? {
      [K in keyof Entries]: Entries[K] extends { count: infer N }
        ? Entries[K] & { count: ValidCount<N> }
        : Entries[K];
    }
  : Entries;

export type ManifestCountValidation<M> = {
  [K in keyof M]: K extends "pieceSeeds" | "dieSeeds" | "tileSeeds"
    ? ValidateCounts<M[K]>
    : K extends "cardSets"
      ? {
          [I in keyof M[K]]: M[K][I] extends { cards: infer Cards }
            ? M[K][I] & { cards: ValidateCounts<Cards> }
            : M[K][I];
        }
      : M[K];
};

type NumberRange<N extends number, A extends number[] = []> = number extends N
  ? number
  : A["length"] extends 64
    ? number
    : A["length"] extends N
      ? A[number] | N
      : NumberRange<N, [...A, A["length"]]>;

/** Validated counts use the base id for one copy; omitted seed counts default to one. */
export type RuntimeIdsFromCount<Base extends string, Count> = [Count] extends [
  never,
]
  ? Base
  : Count extends number
    ? number extends Count
      ? Base | `${Base}-${number}`
      : ValidCount<Count> extends never
        ? never
        : Count extends 1
          ? Base
          : `${Base}-${Exclude<NumberRange<Count>, 0>}`
    : Base;
