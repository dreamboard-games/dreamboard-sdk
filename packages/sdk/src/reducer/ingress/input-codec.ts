import { z } from "zod";
import { Zod as ContractZod } from "@dreamboard-games/reducer-contract";
import { safeParseOrThrow } from "../parse-utils";
import type { RawRuntimeInput } from "./raw-types";

export function createRuntimeInputParser<PlayerId extends string>(
  playerIdSchema: z.ZodType<PlayerId>,
): (rawInput: unknown) => RawRuntimeInput {
  return (rawInput: unknown) => {
    const input = safeParseOrThrow(
      ContractZod.GameInputSchema,
      rawInput,
      "input",
    );
    const playerId = safeParseOrThrow(
      playerIdSchema,
      input.playerId,
      "input.playerId",
    );

    return {
      ...input,
      playerId,
    } as RawRuntimeInput;
  };
}
