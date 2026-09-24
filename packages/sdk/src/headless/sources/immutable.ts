/** Source-owned snapshots and commands cannot be changed by their caller. */
export function immutableCopy<T>(value: T): T {
  return freeze(structuredClone(value));
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
