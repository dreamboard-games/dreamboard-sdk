import { z } from "zod";

/** JSON values shared by protocol and game-owned runtime state. */
export const RuntimeJsonSchema = z.json();
export type RuntimeJson = z.infer<typeof RuntimeJsonSchema>;
