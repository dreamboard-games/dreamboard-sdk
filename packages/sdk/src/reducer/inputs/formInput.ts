import { z } from "zod";
import type { SchemaLike } from "../model/table";
import type { ManifestIdSchema } from "../model/manifest";
import type {
  BoundedNumberDomainDescriptor,
  ChoiceDomainDescriptor,
  ChoiceListDomainDescriptor,
  CollectorState,
  InputCollector,
  ResourceMapDomainDescriptor,
} from "../model/spec";
import type { PlayerIdOfState } from "../model/extract";
import type { TableQueriesOfState } from "../model/queries";
import type { DerivedResolver } from "../derived";
import { isPerPlayer } from "../per-player";
import type { DependencyValues, InputFieldRef } from "./defineInputs";

type DomainContext<
  State extends CollectorState,
  Values extends Readonly<Record<string, unknown>> = Record<string, never>,
> = {
  state: State;
  playerId: PlayerIdOfState<State>;
  q: TableQueriesOfState<State>;
  derived: DerivedResolver;
  values: Values;
};

type ManifestFormInputSchema =
  | ManifestIdSchema<unknown>
  | z.ZodOptional<ManifestIdSchema<unknown>>
  | z.ZodNullable<ManifestIdSchema<unknown>>;

type DomainNumber<State extends CollectorState> =
  | number
  | ((context: DomainContext<State>) => number);

type ChoiceValue = string | null;

type FormInputDomainDescriptor =
  | ResourceMapDomainDescriptor
  | BoundedNumberDomainDescriptor
  | ChoiceDomainDescriptor
  | ChoiceListDomainDescriptor;

type DomainChoice<Value extends ChoiceValue, State extends CollectorState> = {
  value: Value;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type DomainChoicePresentation = {
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type ResourceMapChoiceDecorator<State extends CollectorState> = (
  context: DomainContext<State> & {
    resourceId: string;
    label: string;
    icon?: string;
  },
) => DomainChoicePresentation | null | undefined;

type ResourceMapChoiceSource<State extends CollectorState> =
  | "resourceMap"
  | {
      source: "resourceMap";
      decorate?: ResourceMapChoiceDecorator<State>;
    };

type DomainChoices<Value extends ChoiceValue, State extends CollectorState> =
  | ReadonlyArray<DomainChoice<Value, State>>
  | ResourceMapChoiceSource<State>
  | ((
      context: DomainContext<State>,
    ) => ReadonlyArray<DomainChoice<Value, State>>);

type DependentDomainChoices<
  Value extends ChoiceValue,
  State extends CollectorState,
  Dependencies extends readonly InputFieldRef<string, unknown>[],
> =
  | ReadonlyArray<DomainChoice<Value, State>>
  | ((
      context: DomainContext<State, DependencyValues<Dependencies>>,
    ) => ReadonlyArray<DomainChoice<Value, State>>);

type ChoiceListDefaultValue<
  Value extends string,
  State extends CollectorState,
> =
  | Value[]
  | "all"
  | ((
      context: DomainContext<State> & {
        choices: ReadonlyArray<DomainChoice<Value, State>>;
      },
    ) => Value[]);

type ChoiceDefaultValue<
  Value extends ChoiceValue,
  State extends CollectorState,
  Values extends Readonly<Record<string, unknown>> = Record<string, never>,
> =
  | Value
  | ((
      context: DomainContext<State, Values> & {
        choices: ReadonlyArray<DomainChoice<Value, State>>;
      },
    ) => Value);

type ChoiceDefaultResolver<
  Value extends ChoiceValue,
  State extends CollectorState,
  Values extends Readonly<Record<string, unknown>> = Record<string, never>,
> = (
  context: DomainContext<State, Values> & {
    choices: ReadonlyArray<DomainChoice<Value, State>>;
  },
) => Value | undefined;

function isResourceMapChoiceSource<State extends CollectorState>(
  choices: DomainChoices<ChoiceValue, State>,
): choices is ResourceMapChoiceSource<State> {
  return (
    choices === "resourceMap" ||
    (typeof choices === "object" &&
      choices !== null &&
      !Array.isArray(choices) &&
      "source" in choices &&
      choices.source === "resourceMap")
  );
}

function resolveDomainNumber<State extends CollectorState>(
  value: DomainNumber<State> | undefined,
  context: DomainContext<State>,
  fallback: number,
): number {
  if (typeof value === "function") return value(context);
  return value ?? fallback;
}

function resolveDomainChoices<
  Value extends ChoiceValue,
  State extends CollectorState,
>(
  choices: DomainChoices<Value, State>,
  context: DomainContext<State>,
): Array<{
  value: ChoiceValue;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}> {
  if (isResourceMapChoiceSource(choices)) {
    return resolveResourceMapChoices(choices, context);
  }
  const resolved = typeof choices === "function" ? choices(context) : choices;
  return resolved.map((choice) => ({
    value: choice.value,
    label: choice.label,
    icon: choice.icon,
    badge: choice.badge,
    description: choice.description,
    disabled: choice.disabled,
    disabledReason: choice.disabledReason,
  }));
}

function resolveDependentDomainChoices<
  Value extends ChoiceValue,
  State extends CollectorState,
  Dependencies extends readonly InputFieldRef<string, unknown>[],
>(
  choices: DependentDomainChoices<Value, State, Dependencies>,
  context: DomainContext<State, DependencyValues<Dependencies>>,
): Array<{
  value: ChoiceValue;
  label: string;
  icon?: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}> {
  const resolved = typeof choices === "function" ? choices(context) : choices;
  return resolved.map((choice) => ({
    value: choice.value,
    label: choice.label,
    icon: choice.icon,
    badge: choice.badge,
    description: choice.description,
    disabled: choice.disabled,
    disabledReason: choice.disabledReason,
  }));
}

function choiceValuesInclude(
  choices: ReadonlyArray<{ value: ChoiceValue }>,
  value: ChoiceValue,
): boolean {
  return choices.some((choice) => Object.is(choice.value, value));
}

function assertChoiceDefaultInChoices(
  inputName: string,
  choices: ReadonlyArray<{ value: ChoiceValue }>,
  defaultValue: ChoiceValue,
): void {
  if (choiceValuesInclude(choices, defaultValue)) return;
  const printable = defaultValue === null ? "null" : `'${defaultValue}'`;
  throw new Error(
    `${inputName} defaultValue ${printable} must be one of its choices. ` +
      "If null is a valid value, add an explicit { value: null, label: ... } choice.",
  );
}

function choiceSchema<Value extends ChoiceValue, State extends CollectorState>(
  choices: ReadonlyArray<DomainChoice<Value, State>>,
): SchemaLike<Value> {
  const values = choices.map((choice) => choice.value);
  const stringValues = values.filter(
    (value): value is Exclude<Value, null> => value !== null,
  );
  const hasNull = values.some((value) => value === null);

  if (stringValues.length === 0) {
    return z.null() as unknown as SchemaLike<Value>;
  }

  const stringSchema = z.enum(
    stringValues as [Exclude<Value, null>, ...Array<Exclude<Value, null>>],
  );

  if (hasNull) {
    return z.union([stringSchema, z.null()]) as unknown as SchemaLike<Value>;
  }

  return stringSchema as unknown as SchemaLike<Value>;
}

function resolveResourceMapChoices<State extends CollectorState>(
  choices: ResourceMapChoiceSource<State>,
  context: DomainContext<State>,
): Array<{
  value: string;
  label: string;
  badge?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}> {
  const resources = context.state.table.resources as unknown;
  const firstResourceMap =
    isPerPlayer(resources) && resources.entries.length > 0
      ? resources.entries[0]?.[1]
      : resources;
  if (
    typeof firstResourceMap !== "object" ||
    firstResourceMap === null ||
    Array.isArray(firstResourceMap)
  ) {
    return [];
  }
  const decorate = choices === "resourceMap" ? undefined : choices.decorate;
  return Object.keys(firstResourceMap)
    .sort()
    .map((resourceId) => {
      const label = resourceId;
      const presentation = decorate?.({ ...context, resourceId, label });
      return {
        value: resourceId,
        label,
        badge: presentation?.badge,
        description: presentation?.description,
        disabled: presentation?.disabled,
        disabledReason: presentation?.disabledReason,
      };
    });
}

function createFormInput<
  Schema extends SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
>(
  schema: Schema,
  options?: { defaultValue?: z.infer<Schema> },
): InputCollector<Schema, State, "form"> {
  return {
    kind: "form",
    schema,
    ...(options && "defaultValue" in options
      ? { defaultValue: options.defaultValue }
      : {}),
  };
}

function baseFormInput<
  Schema extends ManifestFormInputSchema & SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
>(schema: Schema): InputCollector<Schema, State, "form">;
function baseFormInput<
  Schema extends ManifestFormInputSchema & SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
>(
  schema: Schema,
  options: { defaultValue: z.infer<Schema> },
): InputCollector<Schema, State, "form"> & {
  readonly defaultValue: z.infer<Schema>;
};
function baseFormInput<
  Schema extends ManifestFormInputSchema & SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
>(
  schema: Schema,
  options?: { defaultValue?: z.infer<Schema> },
): InputCollector<Schema, State, "form"> {
  return createFormInput(schema, options);
}

function resourceMapInput<
  State extends CollectorState = CollectorState,
>(options: {
  resources: ReadonlyArray<{
    resourceId: string;
    label?: string;
    icon?: string;
    min?: DomainNumber<State>;
    max: DomainNumber<State>;
  }>;
}): InputCollector<z.ZodRecord<z.ZodString, z.ZodNumber>, State, "form">;
function resourceMapInput<
  State extends CollectorState = CollectorState,
>(options: {
  resources: ReadonlyArray<{
    resourceId: string;
    label?: string;
    icon?: string;
    min?: DomainNumber<State>;
    max: DomainNumber<State>;
  }>;
  defaultValue: Record<string, number>;
}): InputCollector<z.ZodRecord<z.ZodString, z.ZodNumber>, State, "form"> & {
  readonly defaultValue: Record<string, number>;
};
function resourceMapInput<
  State extends CollectorState = CollectorState,
>(options: {
  resources: ReadonlyArray<{
    resourceId: string;
    label?: string;
    icon?: string;
    min?: DomainNumber<State>;
    max: DomainNumber<State>;
  }>;
  defaultValue?: Record<string, number>;
}): InputCollector<z.ZodRecord<z.ZodString, z.ZodNumber>, State, "form"> {
  return {
    kind: "form",
    schema: z.record(z.string(), z.number().int().nonnegative()),
    ...("defaultValue" in options
      ? { defaultValue: options.defaultValue }
      : {}),
    domain: (state, playerId, q, derived): FormInputDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
        derived,
        values: {},
      };
      return {
        type: "resourceMap",
        resources: options.resources.map((resource) => ({
          resourceId: resource.resourceId,
          label: resource.label,
          icon: resource.icon,
          min: resolveDomainNumber(resource.min, context, 0),
          max: resolveDomainNumber(resource.max, context, 0),
        })),
      };
    },
  };
}

function numberInput<State extends CollectorState = CollectorState>(options: {
  min: DomainNumber<State>;
  max: DomainNumber<State>;
  step?: DomainNumber<State>;
}): InputCollector<z.ZodNumber, State, "form">;
function numberInput<State extends CollectorState = CollectorState>(options: {
  min: DomainNumber<State>;
  max: DomainNumber<State>;
  step?: DomainNumber<State>;
  defaultValue: number;
}): InputCollector<z.ZodNumber, State, "form"> & {
  readonly defaultValue: number;
};
function numberInput<State extends CollectorState = CollectorState>(options: {
  min: DomainNumber<State>;
  max: DomainNumber<State>;
  step?: DomainNumber<State>;
  defaultValue?: number;
}): InputCollector<z.ZodNumber, State, "form"> {
  return {
    kind: "form",
    schema: z.number(),
    ...("defaultValue" in options
      ? { defaultValue: options.defaultValue }
      : {}),
    domain: (state, playerId, q, derived): FormInputDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
        derived,
        values: {},
      };
      return {
        type: "boundedNumber",
        min: resolveDomainNumber(options.min, context, 0),
        max: resolveDomainNumber(options.max, context, 0),
        step:
          options.step === undefined
            ? undefined
            : resolveDomainNumber(options.step, context, 1),
      };
    },
  };
}

function choiceInput<
  const Dependencies extends readonly InputFieldRef<string, unknown>[],
  Value extends ChoiceValue = string,
  State extends CollectorState = CollectorState,
>(options: {
  dependsOn: Dependencies;
  choices: DependentDomainChoices<Value, State, Dependencies>;
  defaultValue: Value;
}): InputCollector<SchemaLike<Value>, State, "form"> & {
  readonly defaultValue: Value;
};
function choiceInput<
  const Dependencies extends readonly InputFieldRef<string, unknown>[],
  Value extends ChoiceValue = string,
  State extends CollectorState = CollectorState,
>(options: {
  dependsOn: Dependencies;
  choices: DependentDomainChoices<Value, State, Dependencies>;
  defaultValue: ChoiceDefaultResolver<
    Value,
    State,
    DependencyValues<Dependencies>
  >;
}): InputCollector<SchemaLike<Value>, State, "form">;
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  defaultValue: Value;
}): InputCollector<SchemaLike<Value>, State, "form"> & {
  readonly defaultValue: Value;
};
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  defaultValue: ChoiceDefaultResolver<Value, State>;
}): InputCollector<SchemaLike<Value>, State, "form">;
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
  const Dependencies extends readonly InputFieldRef<string, unknown>[] =
    readonly InputFieldRef<string, unknown>[],
>(options: {
  dependsOn: Dependencies;
  choices: DependentDomainChoices<Value, State, Dependencies>;
  defaultValue: Value;
}): InputCollector<SchemaLike<Value>, State, "form"> & {
  readonly defaultValue: Value;
};
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
  const Dependencies extends readonly InputFieldRef<string, unknown>[] =
    readonly InputFieldRef<string, unknown>[],
>(options: {
  dependsOn: Dependencies;
  choices: DependentDomainChoices<Value, State, Dependencies>;
  defaultValue: ChoiceDefaultResolver<
    Value,
    State,
    DependencyValues<Dependencies>
  >;
}): InputCollector<SchemaLike<Value>, State, "form">;
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices:
    | DomainChoices<Value, State>
    | DependentDomainChoices<
        Value,
        State,
        readonly InputFieldRef<string, unknown>[]
      >;
  dependsOn?: readonly InputFieldRef<string, unknown>[];
  defaultValue: ChoiceDefaultValue<
    Value,
    State,
    Readonly<Record<string, unknown>>
  >;
}): InputCollector<SchemaLike<Value>, State, "form"> {
  const dependsOn = options.dependsOn?.map((dependency) => dependency.key);
  if (Array.isArray(options.choices) && options.choices.length === 0) {
    throw new Error("formInput.choice requires at least one choice.");
  }
  const staticChoices = Array.isArray(options.choices) ? options.choices : null;
  const hasStaticDefault = typeof options.defaultValue !== "function";
  const staticDefault = options.defaultValue as ChoiceValue;
  if (staticChoices && hasStaticDefault) {
    assertChoiceDefaultInChoices(
      "formInput.choice",
      staticChoices,
      staticDefault,
    );
  }
  const schema = staticChoices
    ? (choiceSchema(staticChoices) as SchemaLike<Value>)
    : (z.string().nullable() as unknown as SchemaLike<Value>);
  const dynamicDefault =
    typeof options.defaultValue === "function"
      ? options.defaultValue
      : undefined;
  return {
    kind: "form",
    schema,
    ...(hasStaticDefault ? { defaultValue: staticDefault as Value } : {}),
    ...(dependsOn ? { dependsOn } : {}),
    domain: (
      state,
      playerId,
      q,
      derived,
      values,
    ): FormInputDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
        derived,
      };
      const choices = dependsOn
        ? resolveDependentDomainChoices(
            options.choices as DependentDomainChoices<
              Value,
              State,
              readonly InputFieldRef<string, unknown>[]
            >,
            {
              ...context,
              values: (values ?? {}) as DependencyValues<
                readonly InputFieldRef<string, unknown>[]
              >,
            },
          )
        : resolveDomainChoices(options.choices as DomainChoices<Value, State>, {
            ...context,
            values: {},
          });
      if (hasStaticDefault) {
        assertChoiceDefaultInChoices(
          "formInput.choice",
          choices,
          staticDefault,
        );
      }
      return {
        type: "choice",
        choices,
      };
    },
    ...(dynamicDefault
      ? {
          resolveDefaultValue: (state, playerId, q, derived, domain) => {
            const choices =
              domain.type === "choice"
                ? domain.choices.map((choice) => ({
                    value: choice.value as Value,
                    label: choice.label,
                    icon: choice.icon,
                    badge: choice.badge,
                    description: choice.description,
                    disabled: choice.disabled,
                    disabledReason: choice.disabledReason,
                  }))
                : [];
            const resolved = dynamicDefault({
              state: state as State,
              playerId: playerId as PlayerIdOfState<State>,
              q: q as TableQueriesOfState<State>,
              derived,
              values: {},
              choices,
            });
            if (resolved === undefined) return undefined;
            assertChoiceDefaultInChoices("formInput.choice", choices, resolved);
            return resolved;
          },
        }
      : {}),
  };
}

function choiceListInput<
  Value extends string,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  min?: DomainNumber<State>;
  max?: DomainNumber<State>;
  defaultValue: Value[];
}): InputCollector<SchemaLike<Value[]>, State, "form"> & {
  readonly defaultValue: Value[];
};
function choiceListInput<
  Value extends string,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  min?: DomainNumber<State>;
  max?: DomainNumber<State>;
  defaultValue?: ChoiceListDefaultValue<Value, State>;
}): InputCollector<SchemaLike<Value[]>, State, "form">;
function choiceListInput<
  Value extends string,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  min?: DomainNumber<State>;
  max?: DomainNumber<State>;
  defaultValue?: ChoiceListDefaultValue<Value, State>;
}): InputCollector<SchemaLike<Value[]>, State, "form"> {
  if (Array.isArray(options.choices) && options.choices.length === 0) {
    throw new Error("formInput.choiceList requires at least one choice.");
  }
  const staticDefaultValue = Array.isArray(options.defaultValue)
    ? options.defaultValue
    : undefined;
  const dynamicDefaultValue =
    options.defaultValue === "all" || typeof options.defaultValue === "function"
      ? options.defaultValue
      : undefined;
  return {
    kind: "form",
    schema: z.array(z.string()) as unknown as SchemaLike<Value[]>,
    ...(staticDefaultValue !== undefined
      ? { defaultValue: staticDefaultValue }
      : {}),
    domain: (state, playerId, q, derived): FormInputDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
        derived,
        values: {},
      };
      const choices = resolveDomainChoices(options.choices, context).map(
        (choice) => ({
          ...choice,
          value: choice.value as string,
        }),
      );
      return {
        type: "choiceList",
        choices,
        min: resolveDomainNumber(options.min, context, 0),
        max: resolveDomainNumber(options.max, context, choices.length),
      };
    },
    ...(dynamicDefaultValue
      ? {
          resolveDefaultValue: (state, playerId, q, derived, domain) => {
            const choices =
              domain.type === "choiceList"
                ? domain.choices.map((choice) => ({
                    value: choice.value as Value,
                    label: choice.label,
                    icon: choice.icon,
                    badge: choice.badge,
                    description: choice.description,
                    disabled: choice.disabled,
                    disabledReason: choice.disabledReason,
                  }))
                : [];
            if (dynamicDefaultValue === "all") {
              return choices.map((choice) => choice.value);
            }
            return dynamicDefaultValue({
              state: state as State,
              playerId: playerId as PlayerIdOfState<State>,
              q: q as TableQueriesOfState<State>,
              derived,
              values: {},
              choices,
            });
          },
        }
      : {}),
  };
}

type FormInputForState<State extends CollectorState> = {
  <Schema extends ManifestFormInputSchema & SchemaLike<unknown>>(
    schema: Schema,
  ): InputCollector<Schema, State, "form">;
  <Schema extends ManifestFormInputSchema & SchemaLike<unknown>>(
    schema: Schema,
    options: { defaultValue: z.infer<Schema> },
  ): InputCollector<Schema, State, "form"> & {
    readonly defaultValue: z.infer<Schema>;
  };
  resourceMap(
    options: Parameters<typeof resourceMapInput<State>>[0],
  ): ReturnType<typeof resourceMapInput<State>>;
  resourceChoices(options?: {
    decorate?: ResourceMapChoiceDecorator<State>;
  }): ResourceMapChoiceSource<State>;
  number(
    options: Parameters<typeof numberInput<State>>[0],
  ): ReturnType<typeof numberInput<State>>;
  choice<Value extends ChoiceValue>(options: {
    choices: DomainChoices<Value, State>;
    defaultValue: Value;
  }): InputCollector<SchemaLike<Value>, State, "form"> & {
    readonly defaultValue: Value;
  };
  choice<Value extends ChoiceValue>(options: {
    choices: DomainChoices<Value, State>;
    defaultValue: ChoiceDefaultResolver<Value, State>;
  }): InputCollector<SchemaLike<Value>, State, "form">;
  choiceList<Value extends string>(options: {
    choices: DomainChoices<Value, State>;
    min?: DomainNumber<State>;
    max?: DomainNumber<State>;
    defaultValue: Value[];
  }): InputCollector<SchemaLike<Value[]>, State, "form"> & {
    readonly defaultValue: Value[];
  };
  choiceList<Value extends string>(options: {
    choices: DomainChoices<Value, State>;
    min?: DomainNumber<State>;
    max?: DomainNumber<State>;
    defaultValue?: ChoiceListDefaultValue<Value, State>;
  }): InputCollector<SchemaLike<Value[]>, State, "form">;
};

function formInputForState<
  State extends CollectorState,
>(): FormInputForState<State> {
  return Object.assign(
    ((schema: ManifestFormInputSchema & SchemaLike<unknown>, options?: {}) =>
      baseFormInput(schema, options as never)) as FormInputForState<State>,
    {
      resourceMap: (options: Parameters<typeof resourceMapInput<State>>[0]) =>
        resourceMapInput<State>(options),
      resourceChoices: (options?: {
        decorate?: ResourceMapChoiceDecorator<State>;
      }) => formInput.resourceChoices<State>(options),
      number: (options: Parameters<typeof numberInput<State>>[0]) =>
        numberInput<State>(options),
      choice: (options: never) => choiceInput(options),
      choiceList: (options: never) => choiceListInput(options),
    },
  );
}

/**
 * Manifest-backed id input. Free-form Zod schemas are intentionally explicit:
 * if the runtime cannot disclose valid values or numeric bounds through a
 * manifest id or domain helper, use a custom interaction surface with an
 * explicit `paramsSchema` instead of the default form renderer.
 */
export const formInput = Object.assign(baseFormInput, {
  resourceMap: resourceMapInput,
  resourceChoices: <State extends CollectorState = CollectorState>(options?: {
    decorate?: ResourceMapChoiceDecorator<State>;
  }): ResourceMapChoiceSource<State> => ({
    source: "resourceMap",
    ...options,
  }),
  number: numberInput,
  choice: choiceInput,
  choiceList: choiceListInput,
  forState: formInputForState,
});
