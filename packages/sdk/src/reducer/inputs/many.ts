import type {
  CollectorValueOf,
  CollectorValueWitness,
} from "../model/spec/inputs";
import * as z from "zod";
import type {
  CollectorState,
  InputCollector,
  InputSelectionDescriptor,
} from "../model/spec";
import type { SchemaLike } from "../model/table";

export type ManyOptions = (
  { count: number } | { min?: number; max?: number }
) & {
  distinct?: boolean;
  /** Preserve submission order by default. */
  order?: "ordered" | "unordered";
};

type ManySelection = Extract<InputSelectionDescriptor, { mode: "many" }>;

type AuthoredSelection<Options extends ManyOptions> = ManySelection &
  Pick<Options, Extract<keyof Options, "distinct" | "order">> &
  (Options extends { count: infer Count extends number }
    ? { readonly min: Count; readonly max: Count }
    : Pick<Options, Extract<keyof Options, "min" | "max">>);

type NonRngCollector = InputCollector<SchemaLike<unknown>, CollectorState> & {
  readonly kind: Exclude<InputCollector["kind"], "rng">;
};

/** Lift the value schema while retaining the collector's exact domain and routing. */
export type ManyInputCollector<
  Collector extends NonRngCollector,
  Options extends ManyOptions = ManyOptions,
> = Omit<
  Collector,
  | "schema"
  | "selection"
  | "defaultValue"
  | "resolveDefaultValue"
  | keyof CollectorValueWitness<unknown>
> &
  CollectorValueWitness<CollectorValueOf<Collector>[]> & {
    readonly schema: z.ZodArray<Collector["schema"]>;
    readonly selection: AuthoredSelection<Options>;
  };

function normalizeManyOptions(options: ManyOptions): ManySelection {
  const preferences = {
    distinct: options.distinct,
    ...(options.order === undefined ? {} : { order: options.order }),
  };
  if ("count" in options) {
    assertNonNegativeInteger(options.count, "many(...).count");
    return {
      mode: "many",
      min: options.count,
      max: options.count,
      ...preferences,
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
    ...preferences,
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

export function many<
  Collector extends NonRngCollector,
  const Options extends ManyOptions,
>(
  collector: Collector,
  options: Options,
): ManyInputCollector<Collector, Options> {
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
    // The witness is type-only; the runtime object carries no witness value.
    ...(rest as Omit<
      Collector,
      | "schema"
      | "selection"
      | "defaultValue"
      | "resolveDefaultValue"
      | keyof CollectorValueWitness<unknown>
    >),
    schema: z.array<Collector["schema"]>(schema),
    selection: normalizeManyOptions(options) as AuthoredSelection<Options>,
  };
}
