import { z } from "zod";
import type {
  AnySchema,
  EffectRollDieDefinition,
  EffectShuffleDefinition,
  EffectShufflePlayerZoneDefinition,
} from "../model";
import type {
  ContinuationCallable,
  ResumableEffectKind,
} from "../model/spec/runtime-args";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

function createContinuationCallable<
  DataSchema extends AnySchema,
  ResponseSchema extends AnySchema,
  State extends {
    table: import("../model").RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends import("../model").ManifestContract<
    import("../model").TableOfState<State>
  >,
  EffectType extends ResumableEffectKind = ResumableEffectKind,
>(definition: {
  id: string;
  data: DataSchema;
  response: ResponseSchema;
  effectKind?: EffectType;
  reduce: ContinuationCallable<
    DataSchema,
    State,
    Manifest,
    string,
    EffectType
  >["reduce"];
}): ContinuationCallable<DataSchema, State, Manifest, string, EffectType> {
  const continuation = ((data: z.infer<DataSchema>) => {
    return {
      id: continuation.id,
      data,
    };
  }) as ContinuationCallable<DataSchema, State, Manifest, string, EffectType>;
  continuation.id = definition.id;
  continuation.source = "effect";
  continuation.dataSchema = definition.data;
  continuation.responseSchema = definition.response;
  continuation.reduce = definition.reduce;
  if (definition.effectKind !== undefined) {
    continuation.effectKind = definition.effectKind;
  }
  return continuation;
}

// --- `defineEffect` ---
//
// Authoring factory for engine-side resumable effects (cues). An effect
// is the registered bundle of continuation callable + optional reduce,
// discriminated by `type` which aligns directly with `ResumableEffectKind`:
//
//   defineEffect<GameContract>()({ type: "rollDie",            id, context?, reduce? })
//   defineEffect<GameContract>()({ type: "shuffleSharedZone",  id, context?, reduce? })
//
// Authored effects are registered under `phase.effects` and invoked from
// a reducer via `fx.effect(effect, options)`. The wire protocol already
// isolates the continuation payload into the ingress bundle's
// `continuations` map keyed by `effectId`, so `fx.effect` never attaches
// `resume: undefined` to the wire effect.
//
// Addressed player requests are *not* effects. Author them as
// prompt-kind interactions via `defineInteraction({ kind: "prompt",
// to, options, ... })`.

type EffectRollDieInput<
  Contract extends AnyReducerGameContract,
  Id extends string,
  ContextSchema extends AnySchema,
> = {
  type: "rollDie";
  id: Id;
  context?: ContextSchema;
  reduce?: ContinuationCallable<
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>,
    Id,
    "rollDie"
  >["reduce"];
};

type EffectShuffleInput<
  Contract extends AnyReducerGameContract,
  Id extends string,
  ContextSchema extends AnySchema,
> = {
  type: "shuffleSharedZone";
  id: Id;
  context?: ContextSchema;
  reduce?: ContinuationCallable<
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>,
    Id,
    "shuffleSharedZone"
  >["reduce"];
};

type EffectShufflePlayerZoneInput<
  Contract extends AnyReducerGameContract,
  Id extends string,
  ContextSchema extends AnySchema,
> = {
  type: "shufflePlayerZone";
  id: Id;
  context?: ContextSchema;
  reduce?: ContinuationCallable<
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>,
    Id,
    "shufflePlayerZone"
  >["reduce"];
};

export function defineEffect<Contract extends AnyReducerGameContract>() {
  type EffectInput =
    | EffectRollDieInput<Contract, string, AnySchema>
    | EffectShuffleInput<Contract, string, AnySchema>
    | EffectShufflePlayerZoneInput<Contract, string, AnySchema>;
  type EffectOutput =
    | EffectRollDieDefinition<
        string,
        AnySchema,
        ContractState<Contract>,
        ContractManifest<Contract>
      >
    | EffectShuffleDefinition<
        string,
        AnySchema,
        ContractState<Contract>,
        ContractManifest<Contract>
      >
    | EffectShufflePlayerZoneDefinition<
        string,
        AnySchema,
        ContractState<Contract>,
        ContractManifest<Contract>
      >;
  function effect<
    Id extends string,
    ContextSchema extends AnySchema = z.ZodObject<Record<string, never>>,
  >(
    definition: EffectRollDieInput<Contract, Id, ContextSchema>,
  ): EffectRollDieDefinition<
    Id,
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>
  >;
  function effect<
    Id extends string,
    ContextSchema extends AnySchema = z.ZodObject<Record<string, never>>,
  >(
    definition: EffectShuffleInput<Contract, Id, ContextSchema>,
  ): EffectShuffleDefinition<
    Id,
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>
  >;
  function effect<
    Id extends string,
    ContextSchema extends AnySchema = z.ZodObject<Record<string, never>>,
  >(
    definition: EffectShufflePlayerZoneInput<Contract, Id, ContextSchema>,
  ): EffectShufflePlayerZoneDefinition<
    Id,
    ContextSchema,
    ContractState<Contract>,
    ContractManifest<Contract>
  >;
  function effect(definition: EffectInput): EffectOutput {
    if (
      definition.type === "rollDie" ||
      definition.type === "shuffleSharedZone" ||
      definition.type === "shufflePlayerZone"
    ) {
      const effectKind: ResumableEffectKind = definition.type;
      if (!definition.reduce) {
        return {
          type: definition.type,
          id: definition.id,
          contextSchema: definition.context,
        } as EffectOutput;
      }
      const contextSchema = (definition.context ?? z.object({})) as AnySchema;
      const continuation = createContinuationCallable<
        AnySchema,
        AnySchema,
        ContractState<Contract>,
        ContractManifest<Contract>,
        ResumableEffectKind
      >({
        id: definition.id,
        data: contextSchema,
        response: z.unknown() as AnySchema,
        effectKind,
        reduce: definition.reduce,
      });
      return {
        type: definition.type,
        id: definition.id,
        contextSchema,
        __continuation: continuation,
      } as EffectOutput;
    }
    throw new Error(
      `defineEffect: unknown effect definition. Expected type 'rollDie' | 'shuffleSharedZone' | 'shufflePlayerZone'. Addressed prompts are authored as prompt-kind interactions via defineInteraction({ kind: "prompt" }).`,
    );
  }
  return effect;
}
