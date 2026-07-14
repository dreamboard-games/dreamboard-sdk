import type { AnySchema, RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { TableOfState } from "../extract";
import type { EffectContinuationCallable } from "./runtime-args";

// --- Effect definitions (the single authoring factory for engine cues) ---
//
// Effects are resumable engine-side cues (e.g. rolling a die, shuffling a
// shared zone). They are authored with `defineEffect({ type, id, context?,
// reduce? })` and dispatched at runtime via `fx.effect(effect, options)`.
// Addressed player requests are NOT effects — they are authored as
// prompt-kind interactions via `defineInteraction({ kind: "prompt", ... })`.

/**
 * `rollDie` effect. Resolves a `rollDie` wire effect. `reduce` / `context`
 * are both optional so authors can fire-and-forget a die roll without
 * observing the result.
 */
export type EffectRollDieDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "rollDie";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "rollDie"
  >;
};

/**
 * `shuffleSharedZone` effect. Resolves a `shuffleSharedZone` wire effect.
 * `reduce` / `context` are both optional.
 */
export type EffectShuffleDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "shuffleSharedZone";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "shuffleSharedZone"
  >;
};

/**
 * `shufflePlayerZone` effect. Resolves a `shufflePlayerZone` wire effect for
 * a single player's perPlayer zone (e.g. deck-builder reshuffle of discard
 * into deck). `reduce` / `context` are both optional.
 */
export type EffectShufflePlayerZoneDefinition<
  Id extends string,
  ContextSchema extends AnySchema,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = {
  readonly type: "shufflePlayerZone";
  readonly id: Id;
  readonly contextSchema?: ContextSchema;
  readonly __continuation?: EffectContinuationCallable<
    ContextSchema,
    State,
    Manifest,
    Id,
    "shufflePlayerZone"
  >;
};

/**
 * Discriminated union of every `defineEffect` output.
 */
export type EffectDefinition<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> =
  | EffectRollDieDefinition<string, AnySchema, State, Manifest>
  | EffectShuffleDefinition<string, AnySchema, State, Manifest>
  | EffectShufflePlayerZoneDefinition<string, AnySchema, State, Manifest>;

export type EffectMap<
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = Record<string, EffectDefinition<State, Manifest>>;

export type EffectRegistryOfPhase<Phase> = Phase extends {
  effects?: infer Effects extends Record<string, unknown>;
}
  ? Effects
  : Record<string, never>;
