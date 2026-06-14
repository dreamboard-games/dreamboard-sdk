import type { DispatchTraceEntry, TrustedRuntimeInput } from "../../core/types";
import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ViewMapOf,
} from "../../model";
import {
  cloneRuntimeTable,
  ensureArray,
  shufflePlayerZoneCards,
} from "../../table";
import {
  sampleDieValue,
  shuffleWithRng,
  type RngConsumption,
} from "./rng-sampler";
import type {
  TrustedInput,
  TrustedPlayerId,
  TrustedState,
} from "./runtime-scope";

type EngineInstructionResult<
  State,
  PlayerId extends string,
  ReducerInput extends TrustedRuntimeInput<PlayerId>,
> = {
  state: State;
  queuedInputs: ReducerInput[];
  queuedInstructions: RuntimeInstructionForState<State>[];
  trace: DispatchTraceEntry<State, PlayerId, ReducerInput>[];
};

function toRngTrace<
  State,
  PlayerId extends string,
  ReducerInput extends TrustedRuntimeInput<PlayerId>,
>(
  consumptions: readonly RngConsumption[],
): DispatchTraceEntry<State, PlayerId, ReducerInput>[] {
  return consumptions.map((consumption) => ({
    type: "rngConsumption" as const,
    operation: consumption.operation,
    traceEntry: consumption.traceEntry,
  }));
}

export function createEngineInstructionResolver<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>() {
  type State = TrustedState<Contract>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  function resolveRollDieDraft(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.rollDie" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const die = state.table.dice[instruction.dieId];
    if (!die) {
      throw new Error(`Cannot roll unknown die '${instruction.dieId}'.`);
    }
    if (!Number.isInteger(die.sides) || die.sides <= 0) {
      throw new Error(
        `Cannot roll die '${instruction.dieId}' with invalid sides '${die.sides}'.`,
      );
    }
    const sampled = sampleDieValue(die.sides, state.runtime.rng);
    state.table.dice[instruction.dieId] = {
      ...die,
      value: sampled.value,
    };
    const queuedInputs: ReducerInput[] = instruction.continuation
      ? [
          {
            kind: "continuation",
            continuationId: instruction.continuation.id,
            resumeData: instruction.continuation.data,
            source: "effect",
            effectKind: "rollDie",
            response: {
              dieId: instruction.dieId,
              value: sampled.value,
            },
          } as unknown as ReducerInput,
        ]
      : [];
    return {
      state: {
        ...state,
        runtime: {
          ...state.runtime,
          rng: sampled.nextRng,
        },
      },
      queuedInputs,
      queuedInstructions: [],
      trace: toRngTrace<State, PlayerId, ReducerInput>([sampled.consumption]),
    };
  }

  function resolveRollDie(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.rollDie" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const nextTable = cloneRuntimeTable(state.table);
    return resolveRollDieDraft(
      {
        ...state,
        table: nextTable,
      },
      instruction,
    );
  }

  function resolveShuffleSharedZoneDraft(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.shuffleSharedZone" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const deckCards = [...ensureArray(state.table.decks[instruction.zoneId])];
    const shuffled = shuffleWithRng(deckCards, state.runtime.rng);
    const orderedCardIds = [...shuffled.orderedValues];
    state.table.decks[instruction.zoneId] = shuffled.orderedValues;
    state.table.zones.shared[instruction.zoneId] = [...shuffled.orderedValues];
    for (const [index, cardId] of shuffled.orderedValues.entries()) {
      const currentLocation = state.table.componentLocations[cardId];
      state.table.componentLocations[cardId] =
        currentLocation?.type === "InDeck" || currentLocation?.type === "InZone"
          ? {
              ...currentLocation,
              type: "InDeck",
              deckId: instruction.zoneId,
              playedBy: currentLocation.playedBy ?? null,
              position: index,
            }
          : {
              type: "InDeck",
              deckId: instruction.zoneId,
              playedBy: null,
              position: index,
            };
    }
    const queuedInputs: ReducerInput[] = instruction.continuation
      ? [
          {
            kind: "continuation",
            continuationId: instruction.continuation.id,
            resumeData: instruction.continuation.data,
            source: "effect",
            effectKind: "shuffleSharedZone",
            response: {
              zoneId: instruction.zoneId,
              orderedCardIds,
            },
          } as unknown as ReducerInput,
        ]
      : [];
    return {
      state: {
        ...state,
        runtime: {
          ...state.runtime,
          rng: shuffled.nextRng,
        },
      },
      queuedInputs,
      queuedInstructions: [],
      trace: toRngTrace<State, PlayerId, ReducerInput>(shuffled.consumptions),
    };
  }

  function resolveShuffleSharedZone(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.shuffleSharedZone" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const nextTable = cloneRuntimeTable(state.table);
    return resolveShuffleSharedZoneDraft(
      {
        ...state,
        table: nextTable,
      },
      instruction,
    );
  }

  function resolveShufflePlayerZoneDraft(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.shufflePlayerZone" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const zoneCards = shufflePlayerZoneCards(
      state.table,
      instruction.zoneId,
      instruction.playerId,
    );
    const shuffled = shuffleWithRng(
      zoneCards,
      state.runtime.rng,
      "shufflePlayerZone",
    );
    const orderedCardIds = [...shuffled.orderedValues];
    shufflePlayerZoneCards(
      state.table,
      instruction.zoneId,
      instruction.playerId,
      orderedCardIds,
    );
    for (const [index, cardId] of orderedCardIds.entries()) {
      const currentLocation = state.table.componentLocations[cardId];
      state.table.componentLocations[cardId] =
        currentLocation?.type === "InHand"
          ? {
              ...currentLocation,
              type: "InHand",
              handId: instruction.zoneId,
              playerId: instruction.playerId,
              position: index,
            }
          : {
              type: "InHand",
              handId: instruction.zoneId,
              playerId: instruction.playerId,
              position: index,
            };
    }
    const queuedInputs: ReducerInput[] = instruction.continuation
      ? [
          {
            kind: "continuation",
            continuationId: instruction.continuation.id,
            resumeData: instruction.continuation.data,
            source: "effect",
            effectKind: "shufflePlayerZone",
            response: {
              zoneId: instruction.zoneId,
              playerId: instruction.playerId,
              orderedCardIds,
            },
          } as unknown as ReducerInput,
        ]
      : [];
    return {
      state: {
        ...state,
        runtime: {
          ...state.runtime,
          rng: shuffled.nextRng,
        },
      },
      queuedInputs,
      queuedInstructions: [],
      trace: toRngTrace<State, PlayerId, ReducerInput>(shuffled.consumptions),
    };
  }

  function resolveShufflePlayerZone(
    state: State,
    instruction: Extract<
      RuntimeInstructionForState<State>,
      { kind: "engine.shufflePlayerZone" }
    >,
  ): EngineInstructionResult<State, PlayerId, ReducerInput> {
    const nextTable = cloneRuntimeTable(state.table);
    return resolveShufflePlayerZoneDraft(
      {
        ...state,
        table: nextTable,
      },
      instruction,
    );
  }

  return {
    resolveRollDie,
    resolveRollDieDraft,
    resolveShuffleSharedZone,
    resolveShuffleSharedZoneDraft,
    resolveShufflePlayerZone,
    resolveShufflePlayerZoneDraft,
  };
}
