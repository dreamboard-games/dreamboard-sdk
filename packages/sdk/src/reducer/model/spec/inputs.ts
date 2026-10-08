import type { BoardSpaceTarget } from "../../../shared/board-target.js";
import type { TileSpaceId } from "../../../shared/domain/tile-space.js";
import type {
  SeatSpaceRef,
  SeatTileRef,
} from "../../../shared/domain/seat-reference.js";
import type {
  InputDomain,
  InputSelection,
  InteractionInputDescriptor,
} from "../../../shared/interaction-schema";
import type { z } from "zod";
import type { RuntimeTableRecord, SchemaLike } from "../table";
import type { ValidationIssue } from "./runtime-args";

// --- Interaction / Zone primitives ---
//
// The new authoring surface. A `PhaseDefinition` can declare:
//   - `interactions`: the set of authoring-level interactions routed by id.
//     Each `InteractionSpec` has typed input collectors and a `reduce` that
//     receives `params: ParamsOf<Collectors>`.

export type InputCollectorKind = InteractionInputDescriptor["kind"];
export type TargetKind = Extract<
  InputDomain,
  { type: "cardTarget" | "boardTarget" | "tileTarget" }
>["targetKind"];
export type BoardInputCollectorKind = Exclude<
  InputCollectorKind,
  "form" | "card" | "tile" | "position" | "rng"
>;

export type CardInputCollectorMeta = {
  readonly zoneId: string;
  readonly zoneIds?: readonly string[];
  readonly targetKind: "card";
};

export type TileInputCollectorMeta = {
  readonly targetKind: "tile";
  readonly zoneIds: readonly string[];
  readonly boardIds: readonly string[];
};

export type BoardInputCollectorMeta = {
  readonly targetKind: Exclude<TargetKind, "card" | "tile">;
} & (
  | { readonly boardId: string; readonly valueKind?: "board-id" }
  | { readonly boardBaseId: string; readonly valueKind: "board-space" }
);

export type PositionInputCollectorMeta = {
  readonly zoneIds: readonly string[];
};

export type RngInputCollectorMeta =
  { readonly rng: "d6"; readonly count: number } | { readonly rng: "coin" };

export type InputCollectorMetaForKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardInputCollectorMeta
    : Kind extends "tile"
      ? TileInputCollectorMeta
      : Kind extends BoardInputCollectorKind
        ? BoardInputCollectorMeta
        : Kind extends "position"
          ? PositionInputCollectorMeta
          : Kind extends "rng"
            ? RngInputCollectorMeta
            : never;

export type InputSelectionDescriptor = InputSelection;
/** Trusted domains retain authoritative tile IDs until seat projection. */
export type TileTargetDomainDescriptor = Omit<
  Extract<InputDomain, { type: "tileTarget" }>,
  "eligibleTargets"
> & {
  readonly eligibleTargets: readonly string[];
};
export type InputDomainDescriptor =
  Exclude<InputDomain, { type: "tileTarget" }> | TileTargetDomainDescriptor;
export type CardTargetDomainDescriptor = Extract<
  InputDomain,
  { type: "cardTarget" }
>;
export type ResolvedCardTargetDomainDescriptor = CardTargetDomainDescriptor;
export type BoardTargetDomainDescriptor = Extract<
  InputDomain,
  { type: "boardTarget" }
>;
export type ResolvedBoardTargetDomainDescriptor = BoardTargetDomainDescriptor;
export type ResourceMapDomainDescriptor = Extract<
  InputDomain,
  { type: "resourceMap" }
>;
export type BoundedNumberDomainDescriptor = Extract<
  InputDomain,
  { type: "boundedNumber" }
>;
export type ZonePositionDomainDescriptor = Extract<
  InputDomain,
  { type: "zonePosition" }
>;
export type ChoiceDomainDescriptor = Extract<InputDomain, { type: "choice" }>;
export type ChoiceListDomainDescriptor = Extract<
  InputDomain,
  { type: "choiceList" }
>;

type DomainProjector<Domain extends InputDomainDescriptor> = (
  state: CollectorState,
  playerId: string,
  q: unknown,
) => Domain;

type InputDomainForCollectorKind<Kind extends InputCollectorKind> =
  Kind extends "card"
    ? CardTargetDomainDescriptor
    : Kind extends "tile"
      ? TileTargetDomainDescriptor
      : Kind extends BoardInputCollectorKind
        ? BoardTargetDomainDescriptor
        : Kind extends "position"
          ? ZonePositionDomainDescriptor
          : Exclude<
              InputDomainDescriptor,
              | CardTargetDomainDescriptor
              | BoardTargetDomainDescriptor
              | TileTargetDomainDescriptor
              | ZonePositionDomainDescriptor
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
 *     schema owns wire syntax; the collected-value witness feeds `ParamsOf<Collectors>`, so downstream
 *     `reduce({ input: { params } })` sees branded ids from `cardInput` /
 *     `boardInput` without a second declaration.
 *   - an optional `eligibleTargets(state, playerId, q)` hook that the runtime
 *     calls to enumerate server-authoritative, submit-ready values accepted by
 *     the collector schema. The hook receives
 *     the same `q` table-queries helper that `validate` / `reduce` see, so
 *     board/card/form collectors can reuse whatever board-graph or zone
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

declare const collectedValue: unique symbol;

/** Type-only result of the complete schema and target-validation pipeline. */
export type CollectorValueWitness<Value> = {
  readonly [collectedValue]?: () => Value;
};

export type CollectorValueOf<Collector> =
  Collector extends CollectorValueWitness<infer Value>
    ? Value
    : Collector extends { readonly schema: SchemaLike<infer Value> }
      ? Value
      : never;

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- State is a public collector inference slot; runtime hooks use the assembly-bound context.
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
  Value = z.infer<Schema>,
> = CollectorValueWitness<Value> & {
  readonly kind: Kind;
  readonly schema: Schema;
  readonly defaultValue?: Value;
  readonly selection?: InputSelectionDescriptor;
  readonly eligibleTargets?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
  ) => ReadonlyArray<unknown>;
  readonly validateTarget?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    targetId: unknown,
  ) => ValidationIssue | null | undefined;
  readonly resolveDefaultValue?: (
    state: CollectorState,
    playerId: string,
    q: unknown,
    domain: InputDomainDescriptor,
  ) => Value | undefined;
} & (Kind extends "rng"
    ? { readonly domain?: never }
    : Kind extends "card" | "tile" | "position" | BoardInputCollectorKind
      ? { readonly domain: DomainProjector<InputDomainForCollectorKind<Kind>> }
      : {
          readonly domain?: DomainProjector<InputDomainForCollectorKind<Kind>>;
        }) &
  InputCollectorMetaSlot<Kind>;

export type InputCollector<
  Schema extends SchemaLike<unknown> = SchemaLike<unknown>,
  State extends CollectorState = CollectorState,
  Kind extends InputCollectorKind = InputCollectorKind,
  Value = z.infer<Schema>,
> = Kind extends InputCollectorKind
  ? InputCollectorBase<Schema, State, Kind, Value>
  : never;

// Infer the typed params bag from an input-collector map.
//
// Collector values describe the complete validation pipeline. A target collector
// can refine its syntax schema after membership validation.
export type ParamsOf<Collectors extends Record<string, InputCollector>> = {
  [K in keyof Collectors]: CollectorValueOf<Collectors[K]>;
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

type ClientCollectorKeys<Collectors extends Record<string, InputCollector>> =
  Exclude<keyof Collectors, EngineSampledCollectorKeys<Collectors>>;

type OptionalParamKeys<Values> = {
  [Key in keyof Values]: undefined extends Values[Key] ? Key : never;
}[keyof Values];

type ClientParamRecord<Values> = {
  [Key in Exclude<keyof Values, OptionalParamKeys<Values>>]: Values[Key];
} & {
  [Key in OptionalParamKeys<Values>]?: Exclude<Values[Key], undefined>;
};

type ClientBoardSpaceValue<Value> =
  Value extends BoardSpaceTarget<infer BoardId, infer SpaceId>
    ? BoardSpaceTarget<
        BoardId,
        SpaceId extends TileSpaceId ? SeatSpaceRef : SpaceId
      >
    : Value extends TileSpaceId
      ? SeatSpaceRef
      : Value;

export type ClientCollectorValueOf<Collector> = Collector extends {
  readonly kind: "tile";
}
  ? CollectorValueOf<Collector> extends readonly unknown[]
    ? SeatTileRef[]
    : SeatTileRef
  : Collector extends { readonly kind: "board-space" }
    ? CollectorValueOf<Collector> extends readonly (infer Space)[]
      ? ClientBoardSpaceValue<Space>[]
      : ClientBoardSpaceValue<CollectorValueOf<Collector>>
    : CollectorValueOf<Collector>;

export type ClientParamsOf<Collectors extends Record<string, InputCollector>> =
  ClientParamRecord<{
    [Key in ClientCollectorKeys<Collectors>]: ClientCollectorValueOf<
      Collectors[Key]
    >;
  }>;

/** Decoded submitted values available to authoritative rules before RNG sampling. */
export type SubmittedParamsOf<
  Collectors extends Record<string, InputCollector>,
> = ClientParamRecord<{
  [Key in ClientCollectorKeys<Collectors>]: CollectorValueOf<Collectors[Key]>;
}>;

/** Parsed parameter syntax after seat-reference decoding, before target membership is checked. */
export type ClientSyntaxParamsOf<
  Collectors extends Record<string, InputCollector>,
> = ClientParamRecord<{
  [Key in ClientCollectorKeys<Collectors>]: z.infer<Collectors[Key]["schema"]>;
}>;
