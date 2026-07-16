import { z } from "zod";
import type { CollectorState, InputCollector } from "../model/spec";

/**
 * `rngInput.*` helpers produce collectors whose value is *sampled by the
 * engine on submit* rather than supplied by the client. The schema pins
 * the exact output shape so `ParamsOf<Collectors>` sees precisely typed
 * results.
 *
 * Determinism:
 *   Sampling happens inside `submitInteraction` only, never inside
 *   reducer validation. This lets clients check a submission without
 *   burning RNG state.
 */

type DieRoll = z.ZodObject<{ values: z.ZodArray<z.ZodNumber> }>;
type CoinFlip = z.ZodObject<{
  value: z.ZodEnum<{ heads: "heads"; tails: "tails" }>;
}>;

// The literal `kind: "rng"` is intentionally preserved in the return type
// so `ClientParamsOf<Collectors>` can structurally detect engine-sampled
// collectors and omit them from client-facing submit params.
type RngCollector<
  Schema extends DieRoll | CoinFlip,
  State extends CollectorState,
> = InputCollector<Schema, State, "rng">;

/**
 * Roll `count` d6s. The submitted value is `{ values: number[] }` with
 * `values.length === count` and each face `1..6`.
 */
export function d6<State extends CollectorState = CollectorState>(
  count: number = 1,
): RngCollector<DieRoll, State> {
  return {
    kind: "rng",
    schema: z.object({
      values: z.array(z.number().int().min(1).max(6)).length(count),
    }),
    meta: { rng: "d6", count },
  };
}

/** Flip a coin. The submitted value is `{ value: "heads" | "tails" }`. */
export function coin<
  State extends CollectorState = CollectorState,
>(): RngCollector<CoinFlip, State> {
  return {
    kind: "rng",
    schema: z.object({
      value: z.enum(["heads", "tails"]),
    }),
    meta: { rng: "coin" },
  };
}

export const rngInput = { d6, coin };
