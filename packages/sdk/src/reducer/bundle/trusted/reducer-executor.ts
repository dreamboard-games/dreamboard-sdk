import { implicitResultOf } from "./trusted-runtime-args";
import type { DispatchTraceEntry } from "../../core/types";
import type { RuntimePayload } from "../../model";
import type {
  GameEvent,
  GameOutcome,
  InputCollector,
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerResult,
  RuntimeRngState,
  ViewMapOf,
} from "../../model";
import type { createInteractionResolver } from "./interaction-resolver";
import type { createLifecycleRunner } from "./lifecycle-runner";
import {
  createMutableRandomHelpers,
  sampleRngCollectorValue,
  type RngConsumption,
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

export function createReducerExecutor<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, Views>,
  interactions: InteractionResolverFor<Contract, Definitions, Views>,
  lifecycle: LifecycleRunnerFor<Contract, Definitions, Views>,
) {
  type DomainState = TrustedDomainState<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, Views>;
  type PlayerId = TrustedPlayerId<Contract>;
  type ReducerInput = TrustedInput<Contract>;

  type RuntimeRngResult = {
    runtimeRng?: RuntimeRngState;
    rngConsumptions?: readonly RngConsumption[];
  };

  function rngTrace(
    consumptions: readonly RngConsumption[],
  ): DispatchTraceEntry<State, PlayerId, ReducerInput>[] {
    return consumptions.map((consumption) => ({
      type: "rngConsumption" as const,
      version: 2 as const,
      operation: consumption.operation,
      drawIndex: consumption.drawIndex,
      traceEntry: consumption.traceEntry,
    }));
  }

  function reduceInternal(
    state: State,
    input: ReducerInput,
  ): ReducerResult<DomainState> & RuntimeRngResult {
    const ctx = scope.buildContext(state);

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
    const reduceArgs = scope.buildRuntimeArgs(
      state,
      {
        ...ctx,
        state: scope.toDomainState(state),
        input: {
          playerId: input.playerId,
          params: parsed.params,
        },
      },
      { random },
    );
    const result = normalizeResult(
      interaction.reduce(reduceArgs) as ReducerResult<DomainState>,
      () => implicitResultOf(reduceArgs),
    );
    return result.type === "accept"
      ? {
          ...result,
          runtimeRng: random.currentRng(),
          rngConsumptions: random.consumptions(),
        }
      : result;
  }

  function preSampleRngForAction(
    state: State,
    input: ReducerInput,
  ): {
    state: State;
    input: ReducerInput;
    consumptions: readonly {
      operation: string;
      drawIndex: number;
      traceEntry: string;
    }[];
  } {
    const phaseName = state.flow.currentPhase as PhaseName;
    const interaction = scope.findInteractionInPhase(
      phaseName,
      input.interactionId,
    );
    if (!interaction) return { state, input, consumptions: [] };
    const collectors = interaction.inputs as Record<string, InputCollector>;
    let nextRng = state.runtime.rng;
    const sampled: Record<string, unknown> = {};
    const consumptions: RngConsumption[] = [];
    let anySampled = false;
    for (const [key, collector] of Object.entries(collectors)) {
      if (collector.kind !== "rng") continue;
      const {
        value,
        nextRng: advanced,
        consumptions: collectorConsumptions,
      } = sampleRngCollectorValue(collector, nextRng);
      sampled[key] = value;
      nextRng = advanced;
      consumptions.push(...collectorConsumptions);
      anySampled = true;
    }
    if (!anySampled) return { state, input, consumptions: [] };
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
      consumptions,
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
  ):
    | (ReducerResult<State> & {
        trace?: DispatchTraceEntry<State, PlayerId, ReducerInput>[];
      })
    | null {
    if (input.interactionId !== SIMULTANEOUS_SUBMIT_INTERACTION_ID) {
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
    const resolveArgs = scope.buildRuntimeArgs(
      stateWithSubmission,
      {
        state: scope.toDomainState(stateWithSubmission),
        submissions: resolvedSubmissions,
        submittedPlayerIds: [...actors],
        waitingPlayerIds: [],
      },
      { random },
    );
    const resolved = normalizeResult(
      resolve(resolveArgs) as ReducerResult<DomainState>,
      () => implicitResultOf(resolveArgs),
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
      ...(resolved.transition ? { transition: resolved.transition } : {}),
      ...(resolved.terminal ? { terminal: resolved.terminal } : {}),
      events: resolved.events ?? [],
      trace: rngTrace(random.consumptions()),
    };
  }

  function reduceOnce(state: State, input: ReducerInput) {
    const sampled = preSampleRngForAction(state, input);
    const simultaneousResult = reduceSimultaneousSubmit(
      sampled.state,
      sampled.input,
    );
    if (simultaneousResult) {
      return simultaneousResult.type === "reject"
        ? simultaneousResult
        : {
            ...simultaneousResult,
            trace: [
              ...rngTrace(sampled.consumptions),
              ...(simultaneousResult.trace ?? []),
            ],
          };
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
      ...(result.transition ? { transition: result.transition } : {}),
      ...(result.terminal ? { terminal: result.terminal } : {}),
      events: result.events ?? [],
      trace: rngTrace([
        ...sampled.consumptions,
        ...(result.rngConsumptions ?? []),
      ]),
    };
  }

  const MAX_PHASE_ENTRIES = 1_000;

  type Accepted = {
    state: State;
    transition?: PhaseName;
    terminal?: GameOutcome<PlayerId>;
    events?: readonly GameEvent[];
    trace?: readonly DispatchTraceEntry<State, PlayerId, ReducerInput>[];
  };

  function complete(initial: Accepted, entries = 0) {
    let state = initial.state;
    let transition = initial.transition;
    let terminal = initial.terminal;
    const events = [...(initial.events ?? [])];
    const trace = [...(initial.trace ?? [])];
    while (transition !== undefined) {
      if (entries >= MAX_PHASE_ENTRIES) {
        throw new Error(
          `Reducer exceeded ${MAX_PHASE_ENTRIES} phase entries in one dispatch.`,
        );
      }
      entries += 1;
      const finalEntry = terminal !== undefined;
      const from = state.flow.currentPhase;
      const entered = lifecycle.initializePhaseResult(state, transition);
      trace.push({
        type: "phaseEntered",
        from,
        to: entered.state.flow.currentPhase,
      });
      trace.push(...rngTrace(entered.consumptions));
      state = entered.state;
      events.push(...entered.events);
      terminal ??= entered.terminal;
      if (finalEntry && entered.transition !== undefined) {
        throw new Error(
          "A terminal phase entry cannot request another transition.",
        );
      }
      transition = entered.transition as PhaseName | undefined;
    }
    return {
      type: "accept" as const,
      state,
      events,
      trace,
      ...(terminal ? { terminal } : {}),
    };
  }

  function dispatch(state: State, input: ReducerInput) {
    const result = reduceOnce(state, input);
    if (result.type === "reject") return result;
    return complete({
      ...result,
      transition: result.transition as PhaseName | undefined,
      trace: [{ type: "acceptedClientInput", input }, ...(result.trace ?? [])],
    });
  }

  return { dispatch, complete };
}
