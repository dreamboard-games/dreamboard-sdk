import { z } from "zod";
import { safeParseOrThrow } from "../parse-utils";
import type { RawRuntimeInput } from "./raw-types";
import { runtimePayloadSchema } from "./runtime-payload";

export function createRuntimeInputParser<PlayerId extends string>(
  playerIdSchema: z.ZodType<PlayerId>,
): (rawInput: unknown) => RawRuntimeInput {
  const rawRuntimeInputSchema = z.object({
    kind: z.literal("interaction"),
    playerId: playerIdSchema,
    interactionId: z.string(),
    params: runtimePayloadSchema.default({}),
  });

  return (rawInput: unknown) =>
    safeParseOrThrow(rawRuntimeInputSchema, rawInput, "input");
}
