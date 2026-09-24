import { z } from "zod";
import { assertJsonWithinLimits } from "../../runtime-json";
import { RuntimeJsonSchema } from "../../shared/runtime-json.js";
import type { RuntimePayload } from "../model";

export { RuntimeJsonSchema } from "../../shared/runtime-json.js";
export { parseTransportJson } from "../../runtime-json";

export const runtimePayloadSchema = z.preprocess((value) => {
  if (value === undefined) return value;
  assertJsonWithinLimits(
    value,
    {
      maxDepth: 64,
      maxNodes: 100_000,
      maxStringBytes: 1_048_576,
      maxCollectionEntries: 50_000,
    },
    "Runtime payload",
  );
  return value;
}, RuntimeJsonSchema) as z.ZodType<RuntimePayload>;
