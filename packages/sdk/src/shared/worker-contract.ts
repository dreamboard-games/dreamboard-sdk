import type { PluginGameplayFrame } from "./protocol/frame.js";
import { BotStrategyCatalogSchema } from "./runtime-schema.js";
import * as z from "zod";
import type * as Wire from "./runtime-types.js";

/** Exact worker ABI version; hosts must reject mismatched bundles. */
export const REDUCER_CONTRACT_VERSION = "0.11.0" as const;
export type MaybePromise<T> = T | Promise<T>;

export interface ReducerBundleContract {
  readonly reducerContractVersion: Wire.ReducerContractVersion;
  /** Optional capability on the existing ABI. Legacy bundles omit both fields. */
  readonly botStrategies?: readonly Wire.BotStrategyMetadata[];
  decideBot?(input: {
    strategyId: string;
    frame: PluginGameplayFrame;
  }): Wire.BotDecision;
  initialize(
    input: Wire.InitializeRequest,
  ): MaybePromise<Wire.InitializeResult>;
  dispatch(input: Wire.DispatchRequest): MaybePromise<Wire.DispatchResult>;
  project(input: Wire.ProjectRequest): Wire.SeatProjectionBundle;
}

const callable = z.custom<(...args: never[]) => unknown>(
  (value) => typeof value === "function",
);
// Admission checks identity and callables without wrapping/replacing methods.
const bundleSchema = z
  .object({
    reducerContractVersion: z.literal(REDUCER_CONTRACT_VERSION),
    initialize: callable,
    dispatch: callable,
    project: callable,
    botStrategies: BotStrategyCatalogSchema.optional(),
    decideBot: callable.optional(),
  })
  .refine(
    (bundle) =>
      (bundle.botStrategies === undefined) === (bundle.decideBot === undefined),
    "Bot strategies and decideBot must be provided together.",
  );

export function assertReducerBundleContract(
  value: unknown,
  source: string,
): asserts value is ReducerBundleContract {
  const result = bundleSchema.safeParse(value);
  if (result.success) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Reducer bundle ${source} did not export an object.`);
  }
  const bundle = value as Record<string, unknown>;
  if (bundle.reducerContractVersion !== REDUCER_CONTRACT_VERSION) {
    throw new Error(
      `Reducer bundle ${source} requires exact contract ${REDUCER_CONTRACT_VERSION}; received ${String(bundle.reducerContractVersion ?? "missing")}.`,
    );
  }
  const method = result.error.issues[0]?.path[0];
  if (!method || method === "botStrategies" || method === "decideBot") {
    throw new Error(
      `Reducer bundle ${source} has an invalid bot strategy contract: ${result.error.message}`,
    );
  }
  throw new Error(`Reducer bundle ${source} is missing ${String(method)}().`);
}
