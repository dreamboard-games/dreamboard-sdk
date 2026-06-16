import { z } from "zod";
import type {
  CollectorState,
  InputCollector,
  InputSelectionDescriptor,
} from "../model/spec";
import type { SchemaLike } from "../model/table";

export type ManyOptions =
  | {
      count: number;
      distinct?: boolean;
    }
  | {
      min?: number;
      max?: number;
      distinct?: boolean;
    };

type NonRngCollector = InputCollector<SchemaLike<unknown>, CollectorState> & {
  readonly kind: Exclude<InputCollector["kind"], "rng">;
};

type CollectorSchema<Collector extends NonRngCollector> = [Collector] extends [
  InputCollector<infer Schema, CollectorState>,
]
  ? Schema
  : never;

type CollectorStateOf<Collector extends NonRngCollector> = [Collector] extends [
  InputCollector<SchemaLike<unknown>, infer State>,
]
  ? State
  : never;

type CollectorKindOf<Collector extends NonRngCollector> = [Collector] extends [
  {
    readonly kind: infer Kind extends Exclude<InputCollector["kind"], "rng">;
  },
]
  ? Kind
  : never;

export type ManyInputCollector<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
  Kind extends Exclude<InputCollector["kind"], "rng"> = Exclude<
    InputCollector["kind"],
    "rng"
  >,
> = InputCollector<z.ZodType<ReadonlyArray<z.infer<Schema>>>, State, Kind> & {
  readonly selection: Extract<InputSelectionDescriptor, { mode: "many" }>;
};

function normalizeManyOptions(
  options: ManyOptions,
): Extract<InputSelectionDescriptor, { mode: "many" }> {
  if ("count" in options) {
    assertNonNegativeInteger(options.count, "many(...).count");
    return {
      mode: "many",
      min: options.count,
      max: options.count,
      distinct: options.distinct,
    };
  }
  const min = options.min ?? 0;
  assertNonNegativeInteger(min, "many(...).min");
  if (options.max !== undefined) {
    assertNonNegativeInteger(options.max, "many(...).max");
    if (options.max < min) {
      throw new Error("many(...).max must be greater than or equal to min.");
    }
  }
  return {
    mode: "many",
    min,
    max: options.max,
    distinct: options.distinct,
  };
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
}

export function many<Collector extends NonRngCollector>(
  collector: Collector,
  options: ManyOptions,
): ManyInputCollector<
  CollectorSchema<Collector>,
  CollectorStateOf<Collector>,
  CollectorKindOf<Collector>
> &
  Pick<Collector, "meta"> {
  if ((collector as InputCollector).kind === "rng") {
    throw new Error("many(...) cannot wrap rngInput collectors.");
  }
  const selection = normalizeManyOptions(options);
  const rest = { ...collector } as Omit<
    Collector,
    "schema" | "selection" | "defaultValue"
  > & {
    schema?: unknown;
    selection?: unknown;
    defaultValue?: unknown;
  };
  delete rest.schema;
  delete rest.selection;
  delete rest.defaultValue;
  return {
    ...rest,
    schema: z.array(collector.schema as z.ZodTypeAny) as unknown as z.ZodType<
      ReadonlyArray<z.infer<CollectorSchema<Collector>>>
    >,
    selection,
  } as unknown as ManyInputCollector<
    CollectorSchema<Collector>,
    CollectorStateOf<Collector>,
    CollectorKindOf<Collector>
  > &
    Pick<Collector, "meta">;
}
