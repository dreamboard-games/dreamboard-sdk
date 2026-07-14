import type { z } from "zod";
import type { RuntimeTableRecord, SchemaLike } from "./table";
import type {
  InitContext,
  ReducerManifestContract,
  SetupProfileDefinition,
  StateDefinition,
} from "./manifest";
import type {
  ExactManifestContractOf,
  HiddenSchemaOfContract,
  ManifestContractOf,
  ManifestOf,
  PhaseNameOfContract,
  PhaseStateMapOfContract,
  PlayerIdOfTable,
  PrivateSchemaOfContract,
  PublicSchemaOfContract,
  RuntimeSetupSelection,
  TableOfManifest,
} from "./extract";
import type {
  ReducerGameState,
  ReducerSessionState,
  RuntimePhaseState,
} from "./runtime";
import type {
  EffectMap,
  CardActionMap,
  InputCollector,
  InteractionMap,
  PhaseDefinition,
  PhaseZoneList,
  PlayerViewDefinition,
  SharedViewDefinition,
  StageMap,
  StaticViewDefinition,
} from "./spec";

export type ReducerGameContract<
  Table extends RuntimeTableRecord,
  Manifest extends ReducerManifestContract<
    Table,
    string,
    string,
    string,
    string,
    string
  >,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  Phases extends Record<string, SchemaLike<object>>,
  Errors extends Record<string, string> | undefined = undefined,
> = {
  manifest: Manifest;
  state: StateDefinition<PublicSchema, PrivateSchema, HiddenSchema>;
  phases: Phases;
  errors?: Errors;
  /** Derived from `phases`; retained as an internal runtime convenience. */
  phaseNames: readonly string[];
};

export type ReducerStateForConfig<
  Table extends RuntimeTableRecord,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  PhaseName extends string,
> = ReducerGameState<
  Table,
  z.infer<PublicSchema>,
  z.infer<PrivateSchema>,
  z.infer<HiddenSchema>,
  RuntimePhaseState,
  PhaseName,
  Record<PhaseName, RuntimePhaseState>
>;

export type ReducerSessionForConfig<
  Table extends RuntimeTableRecord,
  PublicSchema extends SchemaLike<object>,
  PrivateSchema extends SchemaLike<object>,
  HiddenSchema extends SchemaLike<object>,
  PhaseName extends string,
  Setup extends RuntimeSetupSelection = RuntimeSetupSelection,
> = ReducerSessionState<
  ReducerStateForConfig<
    Table,
    PublicSchema,
    PrivateSchema,
    HiddenSchema,
    PhaseName
  >,
  Setup
>;

export type BaseGameStateOfContract<Contract> = ReducerGameState<
  TableOfManifest<ManifestContractOf<Contract>>,
  z.infer<PublicSchemaOfContract<Contract>>,
  z.infer<PrivateSchemaOfContract<Contract>>,
  z.infer<HiddenSchemaOfContract<Contract>>,
  PhaseStateMapOfContract<Contract>[PhaseNameOfContract<Contract>],
  PhaseNameOfContract<Contract>,
  PhaseStateMapOfContract<Contract>
>;

export type BaseGameSessionOfContract<Contract> = ReducerSessionState<
  BaseGameStateOfContract<Contract>,
  RuntimeSetupSelection<ManifestContractOf<Contract>>
>;

/**
 * Heterogeneous phase map for a contract. Each phase carries its own local
 * `PhaseStateSchema` plus authoring-time Actions/Flows/Interactions/
 * Stages/Zones maps. The registries are bound to the contract's base state +
 * manifest so the runtime can iterate them through a single index type
 * without reaching for `any`.
 */
export type PhaseMapOf<Contract> = {
  [Name in PhaseNameOfContract<Contract>]: PhaseDefinition<
    SchemaLike<object>,
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>,
    Record<string, InputCollector>,
    EffectMap<BaseGameStateOfContract<Contract>, ManifestContractOf<Contract>>,
    InteractionMap<
      BaseGameStateOfContract<Contract>,
      ManifestContractOf<Contract>
    >,
    StageMap<BaseGameStateOfContract<Contract>, ManifestContractOf<Contract>>,
    PhaseZoneList<ManifestContractOf<Contract>>,
    CardActionMap<
      BaseGameStateOfContract<Contract>,
      ManifestContractOf<Contract>
    >
  >;
};

export type AnyPhaseDefinitionForContract<Contract> =
  PhaseMapOf<Contract>[PhaseNameOfContract<Contract>];

/**
 * Helpers below accept heterogeneous phase maps (each phase binds its own
 * `PhaseStateSchema` + per-phase registries). TypeScript requires the
 * constraint to use a shape compatible with contract-bound state types in a
 * contravariant `initialState` position, so we erase the registry-bound
 * state/manifest generics with `any`. The only purpose of the constraint is
 * to guarantee `Definitions[Name]` is a `PhaseDefinition` so the `extends`
 * check below can infer `PhaseStateSchema`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PhaseStateMapOfDefinitions<
  Definitions extends Record<
    string,
    PhaseDefinition<
      SchemaLike<object>,
      any,
      any,
      Record<string, InputCollector>,
      EffectMap<any, any>,
      InteractionMap<any, any>,
      StageMap<any, any>,
      PhaseZoneList<any>,
      CardActionMap<any, any>
    >
  >,
> = Partial<{
  [Name in keyof Definitions & string]: Definitions[Name] extends {
    state: infer PhaseStateSchema extends SchemaLike<object>;
  }
    ? z.infer<PhaseStateSchema>
    : never;
}>;

export type PhaseStateOfDefinitions<
  Definitions extends Record<
    string,
    PhaseDefinition<
      SchemaLike<object>,
      any,
      any,
      Record<string, InputCollector>,
      EffectMap<any, any>,
      InteractionMap<any, any>,
      StageMap<any, any>,
      PhaseZoneList<any>,
      CardActionMap<any, any>
    >
  >,
> = {
  [Name in keyof Definitions & string]: Definitions[Name] extends {
    state: infer PhaseStateSchema extends SchemaLike<object>;
  }
    ? z.infer<PhaseStateSchema>
    : never;
}[keyof Definitions & string];
/* eslint-enable @typescript-eslint/no-explicit-any */

export type ResolvedGameStateOf<
  Contract,
  Definitions extends PhaseMapOf<Contract>,
> = {
  [Name in keyof Definitions & string]: ReducerGameState<
    TableOfManifest<ManifestContractOf<Contract>>,
    z.infer<PublicSchemaOfContract<Contract>>,
    z.infer<PrivateSchemaOfContract<Contract>>,
    z.infer<HiddenSchemaOfContract<Contract>>,
    Definitions[Name] extends {
      state: infer PhaseStateSchema extends SchemaLike<object>;
    }
      ? z.infer<PhaseStateSchema>
      : never,
    PhaseNameOfContract<Contract>
  > & {
    flow: ReducerGameState<
      TableOfManifest<ManifestContractOf<Contract>>,
      z.infer<PublicSchemaOfContract<Contract>>,
      z.infer<PrivateSchemaOfContract<Contract>>,
      z.infer<HiddenSchemaOfContract<Contract>>,
      PhaseStateOfDefinitions<Definitions>,
      PhaseNameOfContract<Contract>
    >["flow"] & {
      currentPhase: Name;
    };
  };
}[keyof Definitions & string];

export type ResolvedGameSessionOf<
  Contract,
  Definitions extends PhaseMapOf<Contract>,
> = ReducerSessionState<
  ResolvedGameStateOf<Contract, Definitions>,
  RuntimeSetupSelection<ManifestContractOf<Contract>>
>;

export type ViewMapOf<
  Contract,
  SharedProjection = unknown,
  PlayerProjection = unknown,
> = {
  shared: SharedViewDefinition<
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>,
    SharedProjection
  >;
  player: PlayerViewDefinition<
    BaseGameStateOfContract<Contract>,
    ManifestContractOf<Contract>,
    SharedProjection,
    PlayerProjection
  >;
};

type PhasesOfDefinition<Definition> = Definition extends {
  phases: infer Definitions extends Record<string, unknown>;
}
  ? Definitions
  : never;

export type ViewsOfDefinition<Definition> = Definition extends {
  views: infer Views;
}
  ? Views
  : never;

type NonNeverKeys<Registry> = {
  [Key in keyof Registry]-?: [Registry[Key]] extends [never] ? never : Key;
}[keyof Registry];

export type ViewNamesOfDefinition<Definition> = NonNeverKeys<
  ViewsOfDefinition<Definition>
> &
  string;

export type ViewDefinitionByName<
  Definition,
  ViewName extends ViewNamesOfDefinition<Definition>,
> = ViewsOfDefinition<Definition>[ViewName];

export type ViewOfDefinition<
  Definition,
  ViewName extends ViewNamesOfDefinition<Definition>,
> =
  ViewDefinitionByName<Definition, ViewName> extends {
    project: (...args: never[]) => infer Projection;
  }
    ? Projection
    : never;

export type PhaseNamesOfDefinition<Definition> =
  keyof PhasesOfDefinition<Definition> & string;

export type PhaseDefinitionByName<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> = PhaseName extends keyof PhasesOfDefinition<Definition> & string
  ? PhasesOfDefinition<Definition>[PhaseName]
  : never;

type EffectsOfDefinition<Definition> =
  PhasesOfDefinition<Definition>[keyof PhasesOfDefinition<Definition> &
    string] extends {
    effects?: infer Effects;
  }
    ? Effects extends Record<string, unknown>
      ? Effects[keyof Effects & string]
      : never
    : never;

export type EffectIdsOfDefinition<Definition> =
  EffectsOfDefinition<Definition> extends infer Effect
    ? Effect extends { id: infer Id }
      ? Extract<Id, string>
      : never
    : never;

/* eslint-disable @typescript-eslint/no-explicit-any */
export type GameStateOf<Source> = Source extends {
  contract: infer Contract extends ReducerGameContractLike;
  phases: infer Definitions;
}
  ? Definitions extends PhaseMapOf<Contract>
    ? ResolvedGameStateOf<Contract, Definitions>
    : never
  : Source extends ReducerGameContract<any, any, any, any, any, any, any>
    ? BaseGameStateOfContract<Source>
    : never;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Public structural upper bound for a reducer game contract.
 *
 * The `manifest` slot is intentionally erased with `any` because concrete
 * manifests bind per-contract branded literals (e.g. `PlayerId` unions with
 * specific string literals). Using a ground `ManifestContract<...>` type
 * here would prevent assignability from contract-bound manifests in a
 * contravariant position.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReducerGameContractLike = {
  manifest: any;
  state: StateDefinition<
    SchemaLike<object>,
    SchemaLike<object>,
    SchemaLike<object>
  >;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

type InitialStateContextOf<Contract extends ReducerGameContractLike> =
  InitContext<
    TableOfManifest<ManifestOf<Contract>>,
    ExactManifestContractOf<Contract>
  >;

export type InitialStateCallbacks<Contract extends ReducerGameContractLike> = {
  public?: (
    ctx: InitialStateContextOf<Contract>,
  ) => z.infer<PublicSchemaOfContract<Contract>>;
  private?: (
    ctx: InitialStateContextOf<Contract> & {
      playerId: PlayerIdOfTable<TableOfManifest<ManifestOf<Contract>>>;
    },
  ) => z.infer<PrivateSchemaOfContract<Contract>>;
  hidden?: (
    ctx: InitialStateContextOf<Contract>,
  ) => z.infer<HiddenSchemaOfContract<Contract>>;
};

export type ReducerGameDefinition<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = {
  contract: Contract;
  initial?: InitialStateCallbacks<NoInfer<Contract>>;
  initialPhase?: keyof Definitions & string;
  setupProfiles?: Record<
    string,
    SetupProfileDefinition<
      keyof Definitions & string,
      ExactManifestContractOf<Contract>
    >
  >;
  phases: Definitions;
  views: Views;
  /**
   * Optional session-scoped static projection. Authored via
   * {@link StaticViewDefinition}; computed once per reducer session from the
   * manifest + setup profile and cached by the host. The client merges the
   * cached payload into every seat view, so the per-tick `projectSeatsDynamic`
   * call no longer needs to re-serialize static board topology.
   */
  staticView?: StaticViewDefinition<
    ExactManifestContractOf<NoInfer<Contract>>,
    unknown
  >;
};

export type AnyReducerGameDefinition = ReducerGameDefinition<
  ReducerGameContractLike,
  PhaseMapOf<ReducerGameContractLike>,
  ViewMapOf<ReducerGameContractLike>
>;

// --- Interaction / Stage / Zone extractors -------------------------------

type InteractionRegistriesOfDefinition<Definition> =
  PhasesOfDefinition<Definition>[keyof PhasesOfDefinition<Definition> &
    string] extends {
    interactions?: infer Interactions;
  }
    ? NonNullable<Interactions>
    : never;

type SimultaneousSubmitRegistriesOfDefinition<Definition> =
  PhasesOfDefinition<Definition>[keyof PhasesOfDefinition<Definition> &
    string] extends {
    submit?: infer Submit;
  }
    ? { submit: NonNullable<Submit> }
    : never;

type CardActionRegistriesOfDefinition<Definition> =
  PhasesOfDefinition<Definition>[keyof PhasesOfDefinition<Definition> &
    string] extends {
    cardActions?: infer CardActions;
  }
    ? NonNullable<CardActions>
    : never;

export type InteractionIdOfDefinition<Definition> =
  InteractionRegistriesOfDefinition<Definition> extends infer Interactions
    ? SimultaneousSubmitRegistriesOfDefinition<Definition> extends infer Submit
      ? CardActionRegistriesOfDefinition<Definition> extends infer CardActions
        ? Interactions extends Record<string, unknown>
          ? CardActions extends Record<string, unknown>
            ? Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<CardActions> & string)
                  | (NonNeverKeys<Submit> & string)
              :
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<CardActions> & string)
            : Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<Submit> & string)
              : NonNeverKeys<Interactions> & string
          : CardActions extends Record<string, unknown>
            ? Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<CardActions> & string)
                  | (NonNeverKeys<Submit> & string)
              : NonNeverKeys<CardActions> & string
            : Submit extends Record<string, unknown>
              ? NonNeverKeys<Submit> & string
              : never
        : never
      : never
    : never;

type InteractionRegistryOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  PhaseDefinitionByName<Definition, PhaseName> extends {
    interactions?: infer Interactions;
  }
    ? NonNullable<Interactions>
    : Record<string, never>;

type SimultaneousSubmitRegistryOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  PhaseDefinitionByName<Definition, PhaseName> extends {
    submit?: infer Submit;
  }
    ? { submit: NonNullable<Submit> }
    : Record<string, never>;

type CardActionRegistryOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  PhaseDefinitionByName<Definition, PhaseName> extends {
    cardActions?: infer CardActions;
  }
    ? NonNullable<CardActions>
    : Record<string, never>;

type NonNeverRegistryValue<Registry, Key extends string> =
  Registry extends Record<string, unknown>
    ? Key extends keyof Registry
      ? [Registry[Key]] extends [never]
        ? never
        : Registry[Key]
      : never
    : never;

export type InteractionIdOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  InteractionRegistryOfDefinitionPhase<
    Definition,
    PhaseName
  > extends infer Interactions
    ? SimultaneousSubmitRegistryOfDefinitionPhase<
        Definition,
        PhaseName
      > extends infer Submit
      ? CardActionRegistryOfDefinitionPhase<
          Definition,
          PhaseName
        > extends infer CardActions
        ? Interactions extends Record<string, unknown>
          ? CardActions extends Record<string, unknown>
            ? Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<CardActions> & string)
                  | (NonNeverKeys<Submit> & string)
              :
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<CardActions> & string)
            : Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<Interactions> & string)
                  | (NonNeverKeys<Submit> & string)
              : NonNeverKeys<Interactions> & string
          : CardActions extends Record<string, unknown>
            ? Submit extends Record<string, unknown>
              ?
                  | (NonNeverKeys<CardActions> & string)
                  | (NonNeverKeys<Submit> & string)
              : NonNeverKeys<CardActions> & string
            : Submit extends Record<string, unknown>
              ? NonNeverKeys<Submit> & string
              : never
        : never
      : never
    : never;

export type InteractionSpecByNameOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
> =
  InteractionRegistryOfDefinitionPhase<
    Definition,
    PhaseName
  > extends infer Interactions
    ? Interactions extends Record<string, unknown>
      ? NonNeverRegistryValue<
          Interactions,
          InteractionId
        > extends infer InteractionSpec
        ? [InteractionSpec] extends [never]
          ? CardActionRegistryOfDefinitionPhase<
              Definition,
              PhaseName
            > extends infer CardActions
            ? NonNeverRegistryValue<
                CardActions,
                InteractionId
              > extends infer CardActionSpec
              ? [CardActionSpec] extends [never]
                ? SimultaneousSubmitRegistryOfDefinitionPhase<
                    Definition,
                    PhaseName
                  > extends infer Submit
                  ? NonNeverRegistryValue<Submit, InteractionId>
                  : never
                : CardActionSpec
              : never
            : never
          : InteractionSpec
        : never
      : never
    : never;

type CollectorKindsOf<Collectors> =
  Collectors extends Record<string, InputCollector>
    ? Collectors[keyof Collectors] extends infer Collector
      ? Collector extends { kind: infer Kind extends string }
        ? Kind
        : never
      : never
    : never;

type CollectorKeysWithKind<Collectors, Kind extends string> =
  Collectors extends Record<string, InputCollector>
    ? {
        [K in keyof Collectors]: Collectors[K] extends {
          kind: infer CollectorKind;
        }
          ? Extract<CollectorKind, Kind> extends never
            ? never
            : K
          : never;
      }[keyof Collectors]
    : never;

type CardCollectorZoneIds<Collector> = Collector extends {
  kind: "card";
  meta: infer Meta;
}
  ? Meta extends { readonly zoneIds: infer ZoneIds extends readonly string[] }
    ? ZoneIds[number]
    : Meta extends { readonly zoneId: infer ZoneId extends string }
      ? ZoneId
      : never
  : never;

type CollectorCardZoneIds<Collectors, Input extends string> =
  Collectors extends Record<string, InputCollector>
    ? Input extends keyof Collectors
      ? CardCollectorZoneIds<Collectors[Input]>
      : never
    : never;

type CollectorsOfInteractionDefinition<Spec> = Spec extends {
  readonly inputs?: infer Collectors;
}
  ? NonNullable<Collectors> extends Record<string, InputCollector>
    ? NonNullable<Collectors>
    : Record<string, never>
  : Record<string, never>;

type CollectorKindsOfInteractionDefinition<Spec> =
  | (Spec extends { readonly cardType: unknown; readonly playFrom: unknown }
      ? "card"
      : never)
  | CollectorKindsOf<CollectorsOfInteractionDefinition<Spec>>;

type InputKeysWithCollectorKindOfInteractionDefinition<
  Spec,
  Kind extends string,
> =
  | (Spec extends { readonly cardType: unknown; readonly playFrom: unknown }
      ? Extract<"card", Kind> extends never
        ? never
        : "cardId"
      : never)
  | (CollectorKeysWithKind<CollectorsOfInteractionDefinition<Spec>, Kind> &
      string);

type CardInputZoneIdsOfInteractionDefinition<
  Spec,
  Input extends string,
> = Input extends "cardId"
  ? Spec extends { readonly playFrom: infer PlayFrom extends string }
    ? PlayFrom
    : CollectorCardZoneIds<CollectorsOfInteractionDefinition<Spec>, Input>
  : CollectorCardZoneIds<CollectorsOfInteractionDefinition<Spec>, Input>;

type ParamsOfCollectors<Collectors> =
  Collectors extends Record<string, InputCollector>
    ? {
        [K in keyof Collectors]: Collectors[K] extends InputCollector<infer S>
          ? S extends SchemaLike<infer V>
            ? V
            : never
          : never;
      }
    : never;

type ClientParamsOfCollectors<Collectors> =
  Collectors extends Record<string, InputCollector>
    ? {
        [K in keyof Collectors as Collectors[K] extends {
          readonly kind: "rng";
        }
          ? never
          : K]: Collectors[K] extends InputCollector<infer S>
          ? S extends SchemaLike<infer V>
            ? V
            : never
          : never;
      }
    : never;

type InteractionIdsWithCollectorKindOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  Kind extends string,
> = {
  [InteractionId in InteractionIdOfDefinitionPhase<
    Definition,
    PhaseName
  >]: InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? Extract<CollectorKindsOfInteractionDefinition<Spec>, Kind> extends never
      ? never
      : InteractionId
    : never;
}[InteractionIdOfDefinitionPhase<Definition, PhaseName>];

type QualifiedInteractionIdsWithCollectorKindOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  Kind extends string,
> =
  InteractionIdsWithCollectorKindOfDefinitionPhase<
    Definition,
    PhaseName,
    Kind
  > extends infer InteractionId extends string
    ? `${PhaseName}.${InteractionId}`
    : never;

export type PromptInteractionKeyOfDefinition<Definition> = {
  [PhaseName in PhaseNamesOfDefinition<Definition>]: QualifiedInteractionIdsWithCollectorKindOfDefinitionPhase<
    Definition,
    PhaseName,
    "prompt"
  >;
}[PhaseNamesOfDefinition<Definition>];

export type BoardInteractionKeyOfDefinition<Definition> = {
  [PhaseName in PhaseNamesOfDefinition<Definition>]: QualifiedInteractionIdsWithCollectorKindOfDefinitionPhase<
    Definition,
    PhaseName,
    "board-edge" | "board-space" | "board-tile" | "board-vertex"
  >;
}[PhaseNamesOfDefinition<Definition>];

export type CardInteractionKeyOfDefinition<Definition> = {
  [PhaseName in PhaseNamesOfDefinition<Definition>]: QualifiedInteractionIdsWithCollectorKindOfDefinitionPhase<
    Definition,
    PhaseName,
    "card"
  >;
}[PhaseNamesOfDefinition<Definition>];

export type InputKeysWithCollectorKindOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
  Kind extends string,
> =
  InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? InputKeysWithCollectorKindOfInteractionDefinition<Spec, Kind>
    : never;

export type CardInputZoneIdsOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
  Input extends string,
> =
  InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? CardInputZoneIdsOfInteractionDefinition<Spec, Input>
    : never;

export type ParamsOfInteractionOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
> =
  InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? Spec extends { readonly cardType: unknown; readonly playFrom: unknown }
      ? { cardId: string } & ParamsOfCollectors<
          CollectorsOfInteractionDefinition<Spec>
        >
      : ParamsOfCollectors<CollectorsOfInteractionDefinition<Spec>>
    : never;

/**
 * Client-facing params shape for an interaction. Omits engine-sampled
 * collectors (`rngInput.*`) — clients never supply those fields; the
 * trusted reducer bundle fills them during `submitInteraction`.
 *
 * This is the type that drives `submit(playerId, id, params)`,
 * `handle.submit(params)`, and the generated `InteractionParams` surface
 * in `shared/generated/ui-contract.ts`. The `reduce`-input counterpart is
 * {@link ParamsOfInteractionOfDefinition}, which includes every field
 * because the engine has already filled the sampled ones by then.
 */
export type ClientParamsOfInteractionOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
> =
  InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? Spec extends { readonly cardType: unknown; readonly playFrom: unknown }
      ? { cardId: string } & ClientParamsOfCollectors<
          CollectorsOfInteractionDefinition<Spec>
        >
      : ClientParamsOfCollectors<CollectorsOfInteractionDefinition<Spec>>
    : never;

type DefaultedClientCollectorKeys<
  Collectors extends Record<string, InputCollector>,
> = {
  [K in keyof Collectors]: Collectors[K] extends {
    readonly kind: "rng";
  }
    ? never
    : Collectors[K] extends { readonly defaultValue: unknown }
      ? K
      : never;
}[keyof Collectors];

export type DefaultedClientParamKeysOfInteractionOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  InteractionId extends InteractionIdOfDefinitionPhase<Definition, PhaseName>,
> =
  InteractionSpecByNameOfDefinitionPhase<
    Definition,
    PhaseName,
    InteractionId
  > extends infer Spec
    ? DefaultedClientCollectorKeys<CollectorsOfInteractionDefinition<Spec>> &
        string
    : never;

type StageRegistryOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  PhaseDefinitionByName<Definition, PhaseName> extends {
    stages?: infer Stages;
  }
    ? NonNullable<Stages>
    : Record<string, never>;

export type StageNamesOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  StageRegistryOfDefinitionPhase<Definition, PhaseName> extends infer Stages
    ? Stages extends Record<string, unknown>
      ? NonNeverKeys<Stages> & string
      : never
    : never;

type ZoneRegistriesOfDefinition<Definition> =
  PhasesOfDefinition<Definition>[keyof PhasesOfDefinition<Definition> &
    string] extends {
    zones?: infer Zones;
  }
    ? NonNullable<Zones>
    : never;

export type ZoneIdsOfDefinition<Definition> =
  ZoneRegistriesOfDefinition<Definition> extends infer Zones
    ? Zones extends readonly (infer ZoneId)[]
      ? Extract<ZoneId, string>
      : never
    : never;

type ZoneListOfDefinitionPhase<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
> =
  PhaseDefinitionByName<Definition, PhaseName> extends {
    zones?: infer Zones;
  }
    ? NonNullable<Zones>
    : readonly [];

export type PlayableInteractionsOfZoneOfDefinition<
  Definition,
  PhaseName extends PhaseNamesOfDefinition<Definition>,
  ZoneId extends string,
> =
  ZoneListOfDefinitionPhase<
    Definition,
    PhaseName
  > extends readonly (infer From)[]
    ? Extract<From, ZoneId> extends never
      ? never
      : CardActionRegistryOfDefinitionPhase<
            Definition,
            PhaseName
          > extends infer CardActions
        ? CardActions extends Record<string, unknown>
          ? {
              [ActionId in keyof CardActions &
                string]: CardActions[ActionId] extends {
                playFrom: infer PlayFrom extends string;
              }
                ? Extract<PlayFrom, ZoneId> extends never
                  ? never
                  : ActionId
                : never;
            }[keyof CardActions & string]
          : never
        : never
    : never;
