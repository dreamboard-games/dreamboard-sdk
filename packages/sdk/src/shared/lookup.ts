/** Assert presence at a mutable table or projected-snapshot lookup boundary. */
export function requireLookup<T>(
  value: T | undefined,
  kind: string,
  id: string,
): T {
  if (value === undefined) throw new Error(`${kind} "${id}" is not present.`);
  return value;
}
