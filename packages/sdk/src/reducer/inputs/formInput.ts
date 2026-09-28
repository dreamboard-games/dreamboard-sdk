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

type DomainContext<State extends CollectorState> = {
  state: State;
  playerId: PlayerIdOfState<State>;
  q: TableQueriesOfState<State>;
};

type ManifestFormInputSchema =
  | ManifestIdSchema<unknown>
  | z.ZodOptional<ManifestIdSchema<unknown>>
  | z.ZodNullable<ManifestIdSchema<unknown>>;

type DomainNumber<State extends CollectorState> =
  number | ((context: DomainContext<State>) => number);

type ResourceMapInputOptions<State extends CollectorState> = {
  resources: ReadonlyArray<{
    resourceId: string;
    label?: string;
    icon?: string;
    min?: DomainNumber<State>;
    max: DomainNumber<State>;
  }>;
};

type ChoiceValue = string | null;

type FormCollector<
  Schema extends SchemaLike<unknown>,
  State extends CollectorState,
  Domain extends
    | ResourceMapDomainDescriptor
    | BoundedNumberDomainDescriptor
    | ChoiceDomainDescriptor
    | ChoiceListDomainDescriptor,
> = Omit<InputCollector<Schema, State, "form">, "domain"> & {
  readonly domain: (
    state: CollectorState,
    playerId: string,
    q: unknown,
  ) => Domain;
};

type DomainChoice<Value extends ChoiceValue> = {
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
  | ReadonlyArray<DomainChoice<Value>>
  | ResourceMapChoiceSource<State>
  | ((context: DomainContext<State>) => ReadonlyArray<DomainChoice<Value>>);

type ChoiceListDefaultValue<
  Value extends string,
  State extends CollectorState,
> =
  | Value[]
  | "all"
  | ((
      context: DomainContext<State> & {
        choices: ReadonlyArray<DomainChoice<Value>>;
      },
    ) => Value[]);

type ChoiceDefaultValue<
  Value extends ChoiceValue,
  State extends CollectorState,
> =
  | Value
  | ((
      context: DomainContext<State> & {
        choices: ReadonlyArray<DomainChoice<Value>>;
      },
    ) => Value);

type ChoiceDefaultResolver<
  Value extends ChoiceValue,
  State extends CollectorState,
> = (
  context: DomainContext<State> & {
    choices: ReadonlyArray<DomainChoice<Value>>;
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

function choiceSchema<Value extends ChoiceValue>(
  choices: ReadonlyArray<DomainChoice<Value>>,
): SchemaLike<Value> {
  if (choices.length === 0) return z.never();
  return z.literal(choices.map((choice) => choice.value));
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
  const firstPlayerId = context.state.table.playerOrder[0];
  const firstResourceMap =
    firstPlayerId === undefined
      ? undefined
      : context.state.table.resources[firstPlayerId];
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

function resourceMapInput<State extends CollectorState = CollectorState>(
  options: ResourceMapInputOptions<State>,
): FormCollector<
  z.ZodRecord<z.ZodString, z.ZodNumber>,
  State,
  ResourceMapDomainDescriptor
>;
function resourceMapInput<State extends CollectorState = CollectorState>(
  options: ResourceMapInputOptions<State> & {
    defaultValue: Record<string, number>;
  },
): FormCollector<
  z.ZodRecord<z.ZodString, z.ZodNumber>,
  State,
  ResourceMapDomainDescriptor
> & {
  readonly defaultValue: Record<string, number>;
};
function resourceMapInput<State extends CollectorState = CollectorState>(
  options: ResourceMapInputOptions<State> & {
    defaultValue?: Record<string, number>;
  },
): FormCollector<
  z.ZodRecord<z.ZodString, z.ZodNumber>,
  State,
  ResourceMapDomainDescriptor
> {
  return {
    kind: "form",
    schema: z.record(z.string(), z.number().int().nonnegative()),
    ...("defaultValue" in options
      ? { defaultValue: options.defaultValue }
      : {}),
    domain: (state, playerId, q): ResourceMapDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
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
}): FormCollector<z.ZodNumber, State, BoundedNumberDomainDescriptor>;
function numberInput<State extends CollectorState = CollectorState>(options: {
  min: DomainNumber<State>;
  max: DomainNumber<State>;
  step?: DomainNumber<State>;
  defaultValue: number;
}): FormCollector<z.ZodNumber, State, BoundedNumberDomainDescriptor> & {
  readonly defaultValue: number;
};
function numberInput<State extends CollectorState = CollectorState>(options: {
  min: DomainNumber<State>;
  max: DomainNumber<State>;
  step?: DomainNumber<State>;
  defaultValue?: number;
}): FormCollector<z.ZodNumber, State, BoundedNumberDomainDescriptor> {
  return {
    kind: "form",
    schema: z.number(),
    ...("defaultValue" in options
      ? { defaultValue: options.defaultValue }
      : {}),
    domain: (state, playerId, q): BoundedNumberDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
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
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  defaultValue: Value;
}): FormCollector<SchemaLike<Value>, State, ChoiceDomainDescriptor> & {
  readonly defaultValue: Value;
};
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  defaultValue: ChoiceDefaultResolver<Value, State>;
}): FormCollector<SchemaLike<Value>, State, ChoiceDomainDescriptor>;
function choiceInput<
  Value extends ChoiceValue,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  defaultValue: ChoiceDefaultValue<Value, State>;
}): FormCollector<SchemaLike<Value>, State, ChoiceDomainDescriptor> {
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
    domain: (state, playerId, q): ChoiceDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
      };
      const choices = resolveDomainChoices(options.choices, context);
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
          resolveDefaultValue: (state, playerId, q, domain) => {
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

type ChoiceListCollector<
  Value extends string,
  State extends CollectorState,
> = InputCollector<SchemaLike<Value[]>, State, "form"> & {
  readonly domain: (
    state: CollectorState,
    playerId: string,
    q: unknown,
  ) => ChoiceListDomainDescriptor;
};

function choiceListInput<
  Value extends string,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  min?: DomainNumber<State>;
  max?: DomainNumber<State>;
  defaultValue: Value[];
}): ChoiceListCollector<Value, State> & {
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
}): ChoiceListCollector<Value, State>;
function choiceListInput<
  Value extends string,
  State extends CollectorState = CollectorState,
>(options: {
  choices: DomainChoices<Value, State>;
  min?: DomainNumber<State>;
  max?: DomainNumber<State>;
  defaultValue?: ChoiceListDefaultValue<Value, State>;
}): ChoiceListCollector<Value, State> {
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
    domain: (state, playerId, q): ChoiceListDomainDescriptor => {
      const context = {
        state: state as State,
        playerId: playerId as PlayerIdOfState<State>,
        q: q as TableQueriesOfState<State>,
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
          resolveDefaultValue: (state, playerId, q, domain) => {
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
    options: ResourceMapInputOptions<State>,
  ): FormCollector<
    z.ZodRecord<z.ZodString, z.ZodNumber>,
    State,
    ResourceMapDomainDescriptor
  >;
  resourceMap(
    options: ResourceMapInputOptions<State> & {
      defaultValue: Record<string, number>;
    },
  ): FormCollector<
    z.ZodRecord<z.ZodString, z.ZodNumber>,
    State,
    ResourceMapDomainDescriptor
  > & {
    readonly defaultValue: Record<string, number>;
  };
  resourceChoices(options?: {
    decorate?: ResourceMapChoiceDecorator<State>;
  }): ResourceMapChoiceSource<State>;
  number: typeof numberInput<State>;
  choice<Value extends ChoiceValue>(options: {
    choices: DomainChoices<Value, State>;
    defaultValue: Value;
  }): FormCollector<SchemaLike<Value>, State, ChoiceDomainDescriptor> & {
    readonly defaultValue: Value;
  };
  choice<Value extends ChoiceValue>(options: {
    choices: DomainChoices<Value, State>;
    defaultValue: ChoiceDefaultResolver<Value, State>;
  }): FormCollector<SchemaLike<Value>, State, ChoiceDomainDescriptor>;
  choiceList<Value extends string>(options: {
    choices: DomainChoices<Value, State>;
    min?: DomainNumber<State>;
    max?: DomainNumber<State>;
    defaultValue: Value[];
  }): ChoiceListCollector<Value, State> & {
    readonly defaultValue: Value[];
  };
  choiceList<Value extends string>(options: {
    choices: DomainChoices<Value, State>;
    min?: DomainNumber<State>;
    max?: DomainNumber<State>;
    defaultValue?: ChoiceListDefaultValue<Value, State>;
  }): ChoiceListCollector<Value, State>;
};

function formInputForState<
  State extends CollectorState,
>(): FormInputForState<State> {
  return Object.assign(baseFormInput.bind(undefined), {
    resourceMap: resourceMapInput<State>,
    resourceChoices: (options?: {
      decorate?: ResourceMapChoiceDecorator<State>;
    }) => formInput.resourceChoices<State>(options),
    number: numberInput<State>,
    choice: choiceInput,
    choiceList: choiceListInput,
  });
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
