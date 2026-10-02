import * as z from "zod";
import { en } from "zod/locales";

// Preserve English errors without retaining Zod's complete locale namespace.
z.config(en());

/** JSON values shared by protocol and game-owned runtime state. */
export const RuntimeJsonSchema = z.json();
export type RuntimeJson = z.infer<typeof RuntimeJsonSchema>;
