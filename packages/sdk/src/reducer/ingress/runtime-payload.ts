import { z } from "zod";
import { RuntimeJsonSchema, assertJsonWithinLimits } from "../../runtime-json";
import type { RuntimePayload } from "../model";

export { RuntimeJsonSchema, parseTransportJson } from "../../runtime-json";

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
