import { z } from "zod";
import type { RuntimePayload } from "../model";

export const runtimePayloadSchema: z.ZodType<RuntimePayload> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.number(),
    z.string(),
    z.null(),
    z.array(runtimePayloadSchema),
    z.record(z.string(), z.union([runtimePayloadSchema, z.undefined()])),
  ]),
);
