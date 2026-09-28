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

/** Lift the value schema while retaining the collector's exact domain and routing. */
export type ManyInputCollector<Collector extends NonRngCollector> = Omit<
  Collector,
  "schema" | "selection" | "defaultValue" | "resolveDefaultValue"
> & {
  readonly schema: z.ZodArray<Collector["schema"]>;
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

// JavaScript callers can bypass the public NonRngCollector constraint.
function assertManyKind(kind: InputCollector["kind"]): void {
  if (kind === "rng") {
    throw new Error("many(...) cannot wrap rngInput collectors.");
  }
}

export function many<Collector extends NonRngCollector>(
  collector: Collector,
  options: ManyOptions,
): ManyInputCollector<Collector> {
  assertManyKind(collector.kind);
  const {
    schema,
    selection: _selection,
    defaultValue: _defaultValue,
    resolveDefaultValue: _resolveDefaultValue,
    ...rest
  } = collector;
  void [_selection, _defaultValue, _resolveDefaultValue];
  return {
    ...rest,
    schema: z.array<Collector["schema"]>(schema),
    selection: normalizeManyOptions(options),
  };
}
