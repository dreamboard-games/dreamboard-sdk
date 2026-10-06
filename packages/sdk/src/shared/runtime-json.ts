import * as z from "zod";
import { en } from "zod/locales";

// Preserve English errors without retaining Zod's complete locale namespace.
z.config(en());

/** JSON values shared by protocol and game-owned runtime state. */
export const RuntimeJsonSchema = z.json();
export type RuntimeJson = z.infer<typeof RuntimeJsonSchema>;

/** Recursive JSON presentation values without expanding the schema's recursive inference. */
export type ReadonlyRuntimeJson =
  | string
  | number
  | boolean
  | null
  | readonly ReadonlyRuntimeJson[]
  | { readonly [key: string]: ReadonlyRuntimeJson };
type ReadonlyMembers<T> = T extends string | number | boolean | null | undefined
  ? T
  : T extends readonly unknown[]
    ? { readonly [K in keyof T]: ReadonlyRuntimeData<T[K]> }
    : T extends object
      ? { readonly [K in keyof T]: ReadonlyRuntimeData<T[K]> }
      : T;
/** Preserve exact fields, tuple members and branded primitives while freezing data. */
export type ReadonlyRuntimeData<T> = RuntimeJson extends T
  ? [T] extends [RuntimeJson]
    ? ReadonlyRuntimeJson
    : ReadonlyMembers<T>
  : ReadonlyRuntimeJson extends T
    ? [T] extends [ReadonlyRuntimeJson]
      ? ReadonlyRuntimeJson
      : ReadonlyMembers<T>
    : ReadonlyMembers<T>;
