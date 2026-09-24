/** Cache a pure calculation by immutable object identity. Do not pass a mutable draft. */
export function memoize<A extends object, R>(fn: (a: A) => R): (a: A) => R {
  const cache = new WeakMap<A, R>();
  return (a) => {
    if (cache.has(a)) return cache.get(a)!;
    const value = fn(a);
    cache.set(a, value);
    return value;
  };
}
