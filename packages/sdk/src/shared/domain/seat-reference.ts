import * as z from "zod";

/** Client references name one disclosure in one seat frame, never an inventory identity. */
export const SeatTileRefSchema = z
  .string()
  .regex(/^tile-ref:sha256:[0-9a-f]{64}$/)
  .brand<"SeatTileRef">();
export type SeatTileRef = z.output<typeof SeatTileRefSchema>;

export const SeatSpaceRefSchema = z
  .string()
  .regex(/^space-ref:sha256:[0-9a-f]{64}$/)
  .brand<"SeatSpaceRef">();
export type SeatSpaceRef = z.output<typeof SeatSpaceRefSchema>;
