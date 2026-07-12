import type { z } from "zod";
import type { RuntimeTableRecord, SchemaLike } from "../table";
import type { DerivedResolver } from "../../derived";
import type { ValidationIssue } from "./runtime-args";

// --- Interaction / Stage / Zone primitives ---
//
// The new authoring surface. A `PhaseDefinition` can declare:
//   - `interactions`: the set of authoring-level interactions routed by id.
//     Each `InteractionSpec` has typed input collectors and a `reduce` that
//     receives `params: ParamsOf<Collectors>`.
//   - `stages`: first-match-wins sub-phase selectors with `allow` gating.
//   - `zones`: manifest player card zones projected as behavior descriptors.

export type InputCollectorKind =
  | "form"
  | "board-vertex"
  | "board-edge"
  | "board-tile"
  | "board-space"
  | "card"
  | "prompt"
  | "rng";

export type TargetKind = "edge" | "vertex" | "space" | "tile" | "card";
export type BoardInputCollectorKind = Exclude<
  InputCollectorKind,
  "form" | "card" | "prompt" | "rng"
>;

export type CardInputCollectorMeta = {
  readonly zoneId: string;
  readonly zoneIds?: readonly string[];
  readonly targetKind: "card";
};

export type BoardInputCollectorMeta = {
  readonly targetKind: TargetKind;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
};

export type PromptInputCollectorMeta = {
  readonly options: (
    state: unknown,
    playerId: unknown,
    q: unknown,
  ) => ReadonlyArray<{ id: unknown; label?: string }>;
  readonly eligibleOptions: (
    state: unknown,
    playerId: unknown,
    q: unknown,
  ) => ReadonlyArray<{ id: unknown; label?: string }>;
};

export type RngInputCollectorMeta =
  | { readonly rng: "d6"; readonly count: number }
  | { readonly rng: "coin" };

export type InputCollectorMetaForKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardInputCollectorMeta
    : Kind extends BoardInputCollectorKind
      ? BoardInputCollectorMeta
      : Kind extends "prompt"
        ? PromptInputCollectorMeta | undefined
        : Kind extends "rng"
          ? RngInputCollectorMeta
          : never;

export type InputSelectionDescriptor =
  | { readonly mode: "single" }
  | {
      readonly mode: "many";
      readonly min: number;
      readonly max?: number;
      readonly distinct?: boolean;
    };

export type InputDomainResolverDescriptor = {
  readonly interactionKey?: string;
  readonly inputKey: string;
};

export type InputDomainDependencyCase<
  Domain extends InputDomainDescriptor = InputDomainDescriptor,
> = {
  when: Record<string, string>;
  domain: Domain;
};

export type EagerInputDomainDependencies<
  Domain extends InputDomainDescriptor = InputDomainDescriptor,
> = {
  readonly mode: "eager";
  readonly dependentCases: readonly InputDomainDependencyCase<Domain>[];
};

export type LazyInputDomainDependencies = {
  readonly mode: "lazy";
  readonly dependsOn: readonly string[];
  readonly resolver: InputDomainResolverDescriptor;
};

export type CardTargetDomainDescriptor =
  | ResolvedCardTargetDomainDescriptor
  | LazyCardTargetDomainDescriptor;

export type ResolvedCardTargetDomainDescriptor = {
  readonly type: "cardTarget";
  readonly projection: "resolved";
  readonly targetKind: "card";
  readonly zoneIds: readonly string[];
  readonly eligibleTargets: readonly string[];
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies?: EagerInputDomainDependencies<ResolvedCardTargetDomainDescriptor>;
};

export type LazyCardTargetDomainDescriptor = {
  readonly type: "cardTarget";
  readonly projection: "lazy";
  readonly targetKind: "card";
  readonly zoneIds: readonly string[];
  readonly eligibleTargets?: never;
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies: LazyInputDomainDependencies;
};

export type BoardTargetDomainDescriptor =
  | ResolvedBoardTargetDomainDescriptor
  | LazyBoardTargetDomainDescriptor;

export type ResolvedBoardTargetDomainDescriptor = {
  readonly type: "boardTarget";
  readonly projection: "resolved";
  readonly targetKind: Exclude<TargetKind, "card">;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
  readonly eligibleTargets: readonly string[];
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies?: EagerInputDomainDependencies<ResolvedBoardTargetDomainDescriptor>;
};

export type LazyBoardTargetDomainDescriptor = {
  readonly type: "boardTarget";
  readonly projection: "lazy";
  readonly targetKind: Exclude<TargetKind, "card">;
  readonly boardId: string;
  readonly valueKind?: "board-id" | "player-board-space";
  readonly eligibleTargets?: never;
  readonly selection?: InputSelectionDescriptor;
  readonly dependencies: LazyInputDomainDependencies;
};

export type ResourceMapDomainDescriptor = {
  type: "resourceMap";
  resources: Array<{
    resourceId: string;
    label?: string;
    icon?: string;
    min: number;
    max: number;
  }>;
  selection?: InputSelectionDescriptor;
};

export type BoundedNumberDomainDescriptor = {
  type: "boundedNumber";
  min: number;
  max: number;
  step?: number;
  selection?: InputSelectionDescriptor;
};

export type ChoiceDomainDescriptor = {
  type: "choice";
  choices: Array<{
    value: string | null;
    label: string;
    icon?: string;
    badge?: string;
    description?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  selection?: InputSelectionDescriptor;
  dependencies?: EagerInputDomainDependencies<ChoiceDomainDescriptor>;
};

export type ChoiceListDomainDescriptor = {
  type: "choiceList";
  choices: Array<{
    value: string;
    label: string;
    icon?: string;
    badge?: string;
    description?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  min?: number;
  max?: number;
  selection?: InputSelectionDescriptor;
  dependencies?: EagerInputDomainDependencies<ChoiceListDomainDescriptor>;
};

export type InputDomainDescriptor =
  | CardTargetDomainDescriptor
  | BoardTargetDomainDescriptor
  | ResourceMapDomainDescriptor
  | BoundedNumberDomainDescriptor
  | ChoiceDomainDescriptor
  | ChoiceListDomainDescriptor;

type DomainProjector<Domain extends InputDomainDescriptor> = (
  state: CollectorState,
  playerId: string,
  q: unknown,
  derived: DerivedResolver,
  values?: Readonly<Record<string, unknown>>,
) => Domain;

type InputDomainForCollectorKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardTargetDomainDescriptor
    : Kind extends BoardInputCollectorKind
      ? BoardTargetDomainDescriptor
      : Exclude<
          InputDomainDescriptor,
          CardTargetDomainDescriptor | BoardTargetDomainDescriptor
        >;

/**
 * Base state shape every collector is generic over. Collectors that need
 * narrowed ids (card / player) use `PlayerIdOfState<State>` etc. to thread
 * the manifest's branded types.
 */
export type CollectorState = {
  table: RuntimeTableRecord;
  flow: { currentPhase: string };
};

/**
 * An input collector declares:
 *   - a Zod schema for the parameter value the interaction expects. The
 *     schema's `z.infer` feeds `ParamsOf<Collectors>`, so downstream
 *     `reduce({ input: { params } })` sees branded ids from `cardInput` /
 *     `boardInput` without a second declaration.
 *   - an optional `eligibleTargets(state, playerId, q)` hook that the runtime
 *     calls to enumerate server-authoritative, submit-ready values accepted by
 *     the collector schema. The hook receives
 *     the same `q` table-queries helper that `validate` / `reduce` see, so
 *     board/card/prompt collectors can reuse whatever board-graph or zone
 *     lookups they already use for validation without rebuilding them from
 *     raw state. Each collector helper narrows the return type to its own
 *     branded id (`CardIdOfState<State>` for `cardInput`, the caller-supplied
 *     `Id extends string` for `boardInput.*`, etc.). At the generic interface
 *     level we keep inputs weak (`CollectorState`, `string`, `unknown`) and
 *     the return `ReadonlyArray<unknown>` so the runtime can treat all
 *     collectors uniformly; per-helper signatures provide the author-facing
 *     strong typing.
 *   - optional `meta` for collector-kind-specific routing (e.g. `cardInput`
 *     stores the `zoneId` the card must come from).
 *
 * Collectors without meaningful eligibility (`form`, `rng`) leave
 * `eligibleTargets` undefined.
 */
type InputCollectorMetaSlot<Kind extends InputCollectorKind> = [
  InputCollectorMetaForKind<Kind>,
] extends [never]
  ? { readonly meta?: never }
  : undefined extends InputCollectorMetaForKind<Kind>
    ? {
        readonly meta?: Exclude<InputCollectorMetaForKind<Kind>, undefined>;
      }
    : { readonly meta: InputCollectorMetaForKind<Kind> };

type InputCollectorBase<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  // `State` is retained as a generic slot so factory helpers (`cardInput`,
  // `boardInput`, etc.) can advertise branded ids in their return type, but
  // the interface intentionally does *not* thread `State` into
  // `eligibleTargets`'s function parameters. Doing so introduced
  // contravariance that blocked passing a game-specific collector (e.g.
  // `InputCollector<_, GameState>`) where the interaction spec expected
  // `InputCollector<_, CollectorState>`. Strong typing lives at the factory
  // boundary; the interface itself keeps the runtime-visible hook generic.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
> = {
  readonly kind: Kind;
  readonly schema: Schema;
  readonly defaultValue?: z.infer<Schema>;
  readonly selection?: InputSelectionDescriptor;
  readonly eligibleTargets?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    values?: Readonly<Record<string, unknown>>,
  ) => ReadonlyArray<unknown>;
  readonly validateTarget?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    targetId: unknown,
    values?: Readonly<Record<string, unknown>>,
  ) => ValidationIssue | null | undefined;
  readonly dependsOn?: readonly string[];
  readonly resolveDefaultValue?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    derived: DerivedResolver,
    domain: InputDomainDescriptor,
  ) => z.infer<Schema> | undefined;
} & (Kind extends "rng"
  ? { readonly domain?: never }
  : Kind extends "card" | BoardInputCollectorKind
    ? { readonly domain: DomainProjector<InputDomainForCollectorKind<Kind>> }
    : {
        readonly domain?: DomainProjector<InputDomainForCollectorKind<Kind>>;
      }) &
  InputCollectorMetaSlot<Kind>;

export type InputCollector<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
> = Kind extends InputCollectorKind
  ? InputCollectorBase<Schema, State, Kind>
  : never;

// Infer the typed params bag from an input-collector map.
//
// Each collector contributes `{ [key]: z.infer<schema> }`. The result is the
// typed shape handed to `reduce({ input: { params } })`.
export type ParamsOf<Collectors extends Record<string, InputCollector>> = {
  [K in keyof Collectors]: Collectors[K] extends InputCollector<infer S>
    ? S extends SchemaLike<infer V>
      ? V
      : never
    : never;
};

// Keys of `Collectors` whose values are engine-sampled (currently only
// `rngInput.*` — `kind: "rng"`). Clients never submit these fields; the
// trusted reducer bundle samples them during `submitInteraction`.
type EngineSampledCollectorKeys<
  Collectors extends Record<string, InputCollector>,
> = {
  [K in keyof Collectors]: Collectors[K] extends InputCollector & {
    kind: "rng";
  }
    ? K
    : never;
}[keyof Collectors];

// Infer the client-facing params bag: identical to `ParamsOf<Collectors>`
// except engine-sampled collectors (`rngInput.*`) are omitted. This is the
// shape clients pass to `submitInteraction` / `handle.submit` — the bundle
// fills the engine-sampled fields before handing the merged record to
// `reduce`.
type ClientCollectorValue<Collector> =
  Collector extends InputCollector<infer S>
    ? S extends SchemaLike<infer V>
      ? V
      : never
    : never;

type ClientCollectorKeys<Collectors extends Record<string, InputCollector>> =
  Exclude<keyof Collectors, EngineSampledCollectorKeys<Collectors>>;

type OptionalClientCollectorKeys<
  Collectors extends Record<string, InputCollector>,
> = {
  [K in ClientCollectorKeys<Collectors>]: undefined extends ClientCollectorValue<
    Collectors[K]
  >
    ? K
    : never;
}[ClientCollectorKeys<Collectors>];

export type ClientParamsOf<Collectors extends Record<string, InputCollector>> =
  {
    [K in Exclude<
      ClientCollectorKeys<Collectors>,
      OptionalClientCollectorKeys<Collectors>
    >]: ClientCollectorValue<Collectors[K]>;
  } & {
    [K in OptionalClientCollectorKeys<Collectors>]?: Exclude<
      ClientCollectorValue<Collectors[K]>,
      undefined
    >;
  };
