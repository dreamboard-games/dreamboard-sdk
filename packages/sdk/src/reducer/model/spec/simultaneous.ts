import type { RuntimeTableRecord } from "../table";
import type { ManifestContract } from "../manifest";
import type { PlayerIdOfState, TableOfState } from "../extract";
import type {
  ActionContext,
  MutationRuntimeHelpers,
  RuntimeHelpers,
} from "./runtime-args";
import type { InputCollector, ParamsOf } from "./inputs";
import type { InteractionSpec } from "./interactions";

// --- Phase & View Definitions ---

export type SimultaneousSubmission<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
> = {
  playerId: PlayerIdOfState<State>;
  params: ParamsOf<Collectors>;
};

export type SimultaneousResolveArgs<
  Collectors extends Record<string, InputCollector>,
  State extends { table: RuntimeTableRecord; flow: { currentPhase: string } },
  Manifest extends ManifestContract<TableOfState<State>>,
> = ActionContext<State, Manifest> &
  RuntimeHelpers<State> &
  MutationRuntimeHelpers & {
    state: State;
    submissions: Record<
      PlayerIdOfState<State>,
      SimultaneousSubmission<Collectors, State>
    >;
    submittedPlayerIds: PlayerIdOfState<State>[];
    waitingPlayerIds: PlayerIdOfState<State>[];
  };

export type SimultaneousSubmitSpec<
  Collectors extends Record<string, InputCollector> = Record<
    string,
    InputCollector
  >,
  State extends {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  } = {
    table: RuntimeTableRecord;
    flow: { currentPhase: string };
  },
  Manifest extends ManifestContract<TableOfState<State>> = ManifestContract<
    TableOfState<State>
  >,
> = Omit<InteractionSpec<Collectors, State, Manifest>, "reduce"> & {
  /**
   * Optional compatibility slot for callers that reuse `defineInteraction`.
   * The simultaneous phase barrier stores submissions and invokes the
   * phase-level `resolve`; this per-submission reducer is intentionally
   * ignored when present.
   */
  reduce?: InteractionSpec<Collectors, State, Manifest>["reduce"];
};
