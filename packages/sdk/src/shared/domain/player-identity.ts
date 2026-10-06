import * as z from "zod";

/** Live player keys must survive ordinary record parsers without being dropped. */
export function isPlayerIdValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value !== "__proto__";
}
export const PlayerIdSchema = z
  .string()
  .min(1)
  .refine((value) => isPlayerIdValue(value), {
    error:
      "Player id '__proto__' is reserved for record/parser interoperability.",
  });
export const PlayerRosterSchema = z
  .array(PlayerIdSchema)
  .refine((ids) => new Set(ids).size === ids.length, {
    error: "Duplicate player id",
  });
