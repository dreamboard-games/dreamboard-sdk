import type { DispatchTraceEntry } from "../../core/types";
import type { RuntimeInstructionForState } from "../../core/runtime-instruction";
import type { RuntimePayload } from "../../model";
import { createRuntimeInstructionEngine } from "../../engine/runtime-instruction-engine";
import type {
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerResult,
  RuntimeRngState,
  ViewMapOf,
} from "../../model";
import type { createInteractionResolver } from "./interaction-resolver";
import type { createLifecycleRunner } from "./lifecycle-runner";
import { createEngineInstructionResolver } from "./engine-instruction-resolver";
import { createFlowInstructionResolver } from "./flow-instruction-resolver";
import {
  createMutableRandomHelpers,
  sampleRngCollectorValue,
} from "./rng-sampler";
import {
  isSimultaneousPhase,
  resolveSimultaneousActors,
  simultaneousSubmitInteraction,
  SIMULTANEOUS_SUBMIT_INTERACTION_ID,
} from "./simultaneous-player";
import {
  normalizeResult,
  rejectResult,
  type TrustedDomainState,
  type TrustedInput,
  type TrustedManifest,
  type TrustedPhaseName,
  type TrustedPlayerId,
  type TrustedRuntimeScope,
  type TrustedState,
} from "./runtime-scope";

type InteractionResolverFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createInteractionResolver<Contract, Definitions, Views>>;

type LifecycleRunnerFor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
> = ReturnType<typeof createLifecycleRunner<Contract, Definitions, Views>>;

export function createTrustedInstructionRunner<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  interactions: InteractionResolverFor<Contract, Definitions, Views>,
  lifecycle: LifecycleRunnerFor<Contract, Definitions, Views>,
) {
  type DomainState = TrustedDomainState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  const flowInstructions = createFlowInstructionResolver(lifecycle);
  const engineInstructions = createEngineInstructionResolver<
    Contract,
    Definitions,
    Views
  >();

  type RuntimeRngResult = { runtimeRng?: RuntimeRngState };

  function reduceInternal(
    state: State,
    input: ReducerInput,
  ): ReducerResult<DomainState> & RuntimeRngResult {
    const ctx = scope.buildContext(state);

    if (input.kind === "interaction") {
      const phaseName = state.flow.currentPhase as PhaseName;
      const interaction = scope.findInteractionInPhase(
        phaseName,
        input.interactionId,
      );
      if (!interaction) {
        return rejectResult(
          "unsupported-action",
          `Interaction '${input.interactionId}' is not available in phase '${state.flow.currentPhase}'.`,
        );
      }
      const parsed = interactions.parseInteractionParams(
        interaction,
        input.params,
        { playerId: input.playerId },
      );
      if (!parsed.ok) {
        return rejectResult("invalid-action-params", parsed.message);
      }
      const random = createMutableRandomHelpers(state.runtime.rng);
      const result = normalizeResult(
        interaction.reduce(
          scope.buildRuntimeArgs(
            state,
            {
              ...ctx,
              state: scope.toDomainState(state),
              input: {
                playerId: input.playerId,
                params: parsed.params,
              },
            },
            { random: random.random },
          ),
        ) as ReducerResult<DomainState>,
        scope.toDomainState(state),
      );
      return result.type === "accept"
        ? { ...result, runtimeRng: random.currentRng() }
        : result;
    }

    if (input.kind === "continuation") {
      const continuation = scope.continuationById(input.continuationId);
      if (!continuation) {
        return rejectResult(
          "missing-continuation",
          `Continuation '${input.continuationId}' was not registered.`,
        );
      }
      const random = createMutableRandomHelpers(state.runtime.rng);
      const result = normalizeResult(
        continuation.reduce(
          scope.buildRuntimeArgs(
            state,
            {
              ...ctx,
              state: scope.toDomainState(state),
              input: {
                source: "effect" as const,
                effectKind: input.effectKind,
                data: input.resumeData,
                response: input.response,
              },
            },
            { random: random.random },
          ),
        ),
        scope.toDomainState(state),
      );
      return result.type === "accept"
        ? { ...result, runtimeRng: random.currentRng() }
        : result;
    }

    return scope.runtimeHelpers.accept(scope.toDomainState(state));
  }

  function preSampleRngForAction(
    state: State,
    input: ReducerInput,
  ): { state: State; input: ReducerInput } {
    if (input.kind !== "interaction") return { state, input };
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(
      phaseName,
      input.interactionId,
    );
    if (!interaction) return { state, input };
    const collectors = interaction.inputs as Record<string, InputCollector>;
    let nextRng = state.runtime.rng;
    const sampled: Record<string, unknown> = {};
    let anySampled = false;
    for (const [key, collector] of Object.entries(collectors)) {
      if (collector.kind !== "rng") continue;
      const { value, nextRng: advanced } = sampleRngCollectorValue(
        collector,
        nextRng,
      );
      sampled[key] = value;
      nextRng = advanced;
      anySampled = true;
    }
    if (!anySampled) return { state, input };
    const mergedParams: Record<string, unknown> = {
      ...((input.params ?? {}) as Record<string, unknown>),
      ...sampled,
    };
    return {
      state: {
        ...state,
        runtime: { ...state.runtime, rng: nextRng },
      } as State,
      input: { ...input, params: mergedParams } as ReducerInput,
    };
  }

  function clearSimultaneousCurrent(state: State): State {
    return {
      ...state,
      runtime: {
        ...state.runtime,
        simultaneous: { current: null },
      },
    } as State;
  }

  function reduceSimultaneousSubmit(
    state: State,
    input: ReducerInput,
  ): ReducerResult<State> | null {
    if (
      input.kind !== "interaction" ||
      input.interactionId !== SIMULTANEOUS_SUBMIT_INTERACTION_ID
    ) {
      return null;
    }

    const phaseName = state.flow.currentPhase as PhaseName;
    const phase = scope.phaseByName(phaseName);
    if (!isSimultaneousPhase(phase)) {
      return null;
    }

    const submit = simultaneousSubmitInteraction(scope.phaseByName(phaseName));
    if (!submit) {
      return rejectResult(
        "missing-submit-interaction",
        `Simultaneous phase '${phaseName}' does not declare submit.`,
      );
    }
    const resolve = (phase as { resolve?: unknown }).resolve;
    if (typeof resolve !== "function") {
      return rejectResult(
        "missing-simultaneous-resolve",
        `Simultaneous phase '${phaseName}' does not declare resolve.`,
      );
    }

    const actors = resolveSimultaneousActors(scope, state, phase);
    if (!actors.includes(input.playerId as PlayerId)) {
      return rejectResult(
        "NOT_YOUR_TURN",
        `It is not your turn (interaction '${input.interactionId}').`,
      );
    }

    const parsed = interactions.parseInteractionParams(submit, input.params);
    if (!parsed.ok) {
      return rejectResult("invalid-action-params", parsed.message);
    }

    const current =
      state.runtime.simultaneous?.current?.phaseName === phaseName
        ? state.runtime.simultaneous.current
        : {
            phaseName,
            actors,
            submissions: {},
          };
    const existing = current.submissions[input.playerId as PlayerId];
    const canResubmit =
      (phase as { canResubmit?: boolean }).canResubmit === true;
    if (existing && !canResubmit) {
      return rejectResult(
        "ALREADY_SUBMITTED",
        `Interaction '${input.interactionId}' has already been submitted by '${input.playerId}'.`,
      );
    }

    const submissions: Record<
      string,
      { interactionId: string; params: RuntimePayload }
    > = {
      ...current.submissions,
      [input.playerId]: {
        interactionId: input.interactionId,
        params: parsed.params as RuntimePayload,
      },
    };
    const stateWithSubmission = {
      ...state,
      runtime: {
        ...state.runtime,
        simultaneous: {
          current: {
            phaseName,
            actors,
            submissions,
          },
        },
      },
    } as State;
    const waitingPlayerIds = actors.filter((actor) => !submissions[actor]);
    if (waitingPlayerIds.length > 0) {
      return {
        type: "accept",
        state: stateWithSubmission,
        instructions: [],
      };
    }

    const resolvedSubmissions = Object.fromEntries(
      actors.map((actor) => [
        actor,
        {
          playerId: actor,
          params: submissions[actor]?.params ?? {},
        },
      ]),
    );
    const random = createMutableRandomHelpers(stateWithSubmission.runtime.rng);
    const resolved = normalizeResult(
      resolve(
        scope.buildRuntimeArgs(
          stateWithSubmission,
          {
            state: scope.toDomainState(stateWithSubmission),
            submissions: resolvedSubmissions,
            submittedPlayerIds: [...actors],
            waitingPlayerIds: [],
          },
          { random: random.random },
        ),
      ) as ReducerResult<DomainState>,
      scope.toDomainState(stateWithSubmission),
    );
    if (resolved.type === "reject") {
      return resolved;
    }
    return {
      type: "accept",
      state: clearSimultaneousCurrent({
        ...resolved.state,
        runtime: { ...stateWithSubmission.runtime, rng: random.currentRng() },
      } as State),
      instructions: resolved.instructions ?? [],
    };
  }

  function reduceOnce(state: State, input: ReducerInput): ReducerResult<State> {
    const sampled = preSampleRngForAction(state, input);
    const simultaneousResult = reduceSimultaneousSubmit(
      sampled.state,
      sampled.input,
    );
    if (simultaneousResult) {
      return simultaneousResult;
    }
    const result = reduceInternal(sampled.state, sampled.input);
    if (result.type === "reject") {
      return result;
    }
    return {
      type: "accept" as const,
      state: {
        ...result.state,
        runtime: {
          ...sampled.state.runtime,
          rng: result.runtimeRng ?? sampled.state.runtime.rng,
        },
      } as State,
      instructions: result.instructions ?? [],
    };
  }

  function resolveInstruction(
    state: State,
    instruction: RuntimeInstructionForState<State>,
  ): {
    state: State;
    queuedInputs: ReducerInput[];
    queuedInstructions: RuntimeInstructionForState<State>[];
    trace: DispatchTraceEntry<State, PlayerId, ReducerInput>[];
  } {
    switch (instruction.kind) {
      case "flow.transition":
        return flowInstructions.resolveTransition(state, instruction);
      case "engine.rollDie":
        return engineInstructions.resolveRollDie(state, instruction);
      case "engine.shuffleSharedZone":
        return engineInstructions.resolveShuffleSharedZone(state, instruction);
      case "engine.shufflePlayerZone":
        return engineInstructions.resolveShufflePlayerZone(state, instruction);
      default: {
        const _exhaustive: never = instruction;
        throw new Error(
          `Unknown runtime instruction kind: ${(_exhaustive as { kind: string }).kind}`,
        );
      }
    }
  }

  const instructionEngine = createRuntimeInstructionEngine<
    State,
    PlayerId,
    ReducerInput
  >({
    reduce(state, input) {
      return reduceOnce(state, input);
    },
    resolveInstruction,
  });

  return {
    resolveInstruction,
    dispatch: instructionEngine.dispatch,
    drainInstructions: instructionEngine.drainInstructions,
    reduceInternal,
    reduceOnce,
  };
}
