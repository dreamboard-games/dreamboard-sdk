import * as z from "zod";

/** Authored identities exclude this prefix; canonical generated instances own it. */
export const GENERATED_ID_PREFIX = "@db/";

const instanceTuple = z.tuple([
  z.enum(["board", "card", "piece", "die"]),
  z.string().min(1),
  z.string().min(1),
]);
export type PerPlayerInstanceFamily = z.infer<typeof instanceTuple>[0];

declare const instanceIdentity: unique symbol;
export type PerPlayerInstanceId<
  Family extends PerPlayerInstanceFamily = PerPlayerInstanceFamily,
  BaseId extends string = string,
> = string & {
  readonly [instanceIdentity]: {
    readonly family: Family;
    readonly baseId: BaseId;
  };
};

/** The base already includes seed expansion; roster membership is a separate check. */
export function perPlayerInstanceId<
  Family extends PerPlayerInstanceFamily,
  BaseId extends string,
>(
  family: Family,
  baseId: BaseId,
  playerId: string,
): PerPlayerInstanceId<Family, BaseId> {
  instanceTuple.parse([family, baseId, playerId]);
  // Only this validated encoder constructs the identity's phantom witness.
  return `${GENERATED_ID_PREFIX}${JSON.stringify([family, baseId, playerId])}` as PerPlayerInstanceId<
    Family,
    BaseId
  >;
}

export interface ParsedPerPlayerInstance {
  readonly id: PerPlayerInstanceId;
  readonly family: PerPlayerInstanceFamily;
  readonly baseId: string;
  readonly playerId: string;
}

/** Decode canonical syntax only. A decoded identity may still be absent from a table. */
export function parsePerPlayerInstanceId(
  value: unknown,
): ParsedPerPlayerInstance | null {
  if (typeof value !== "string" || !value.startsWith(GENERATED_ID_PREFIX))
    return null;
  let candidate: unknown;
  try {
    candidate = JSON.parse(value.slice(GENERATED_ID_PREFIX.length));
  } catch {
    return null;
  }
  const parsed = instanceTuple.safeParse(candidate);
  if (!parsed.success) return null;
  const [family, baseId, playerId] = parsed.data;
  const id = perPlayerInstanceId(family, baseId, playerId);
  if (id !== value) return null;
  return { id, family, baseId, playerId };
}

/** Admit canonical instances only for one declared family and expanded base set. */
export function perPlayerInstanceSchema<
  Family extends PerPlayerInstanceFamily,
  BaseId extends string,
>(family: Family, bases: readonly BaseId[]) {
  const known = new Set<string>(bases);
  return z.custom<PerPlayerInstanceId<Family, BaseId>>(
    (value): value is PerPlayerInstanceId<Family, BaseId> => {
      const parsed = parsePerPlayerInstanceId(value);
      return parsed?.family === family && known.has(parsed.baseId);
    },
    { error: "Expected a canonical instance of a declared family and base." },
  );
}
