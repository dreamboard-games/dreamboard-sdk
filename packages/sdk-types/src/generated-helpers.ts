type RecordInitializer<Id extends string, Value> = Value | ((id: Id) => Value);

export function buildTypedRecord<Id extends string, Value>(
  ids: readonly Id[],
  initial: RecordInitializer<Id, Value>,
): Record<Id, Value> {
  const createValue =
    typeof initial === "function"
      ? (initial as (id: Id) => Value)
      : () => initial;

  return Object.fromEntries(ids.map((id) => [id, createValue(id)])) as Record<
    Id,
    Value
  >;
}

export function isTypedId<Id extends string>(
  ids: readonly Id[],
  value: string,
): value is Id {
  return (ids as readonly string[]).includes(value);
}

export function expectTypedId<Id extends string>(
  ids: readonly Id[],
  value: string,
  description: string,
): Id {
  if (isTypedId(ids, value)) {
    return value;
  }

  throw new Error(`Unknown ${description} '${value}'.`);
}
