import type { TrustedReducerBundle } from "./types";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  ReducerGameDefinition,
  ViewMapOf,
} from "../model";
import { createTrustedInstructionRunner } from "./trusted/instruction-runner";
import { createInteractionResolver } from "./trusted/interaction-resolver";
import { createLifecycleRunner } from "./trusted/lifecycle-runner";
import { createProjectionBuilder } from "./trusted/projection-builder";
import { createTrustedRuntimeScope } from "./trusted/runtime-scope";
import { createStaticProjectionBuilder } from "./trusted/static-projection";

export function createTrustedReducerBundle<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: ReducerGameDefinition<Contract, Definitions, Views>,
): TrustedReducerBundle<Contract, Definitions, Views> {
  const scope = createTrustedRuntimeScope(definition);
  const interactions = createInteractionResolver(scope);
  const lifecycle = createLifecycleRunner(scope, interactions);
  const instructions = createTrustedInstructionRunner(
    scope,
    interactions,
    lifecycle,
  );
  const staticProjection = createStaticProjectionBuilder(scope);
  const projection = createProjectionBuilder(scope, interactions);

  return {
    async initialize(input) {
      return lifecycle.initializeSession(input, instructions.drainInstructions);
    },
    async initializePhase({ state, to }) {
      const initialized = lifecycle.initializePhaseResult(
        scope.toCombinedState(state),
        to,
      );
      return scope.toSessionState(
        instructions.drainInstructions(
          initialized.state,
          initialized.instructions,
        ),
      );
    },
    async validateInput({ state, input }) {
      return interactions.validateClientInput(
        scope.toCombinedState(state),
        input,
      );
    },
    async reduce({ state, input }) {
      const combinedState = scope.toCombinedState(state);
      const reject = interactions.validateOrReject(combinedState, input);
      if (reject) {
        return reject;
      }
      const result = instructions.reduceOnce(combinedState, input);
      if (result.type === "reject") {
        return result;
      }
      return {
        type: "accept" as const,
        state: scope.toSessionState(result.state),
        instructions: result.instructions ?? [],
      };
    },
    async dispatch({ state, input }) {
      const combinedState = scope.toCombinedState(state);
      const reject = interactions.validateOrReject(combinedState, input);
      if (reject) {
        return reject;
      }
      const result = instructions.dispatch(combinedState, input);
      if (result.type === "reject") {
        return result;
      }
      return {
        type: "accept" as const,
        state: scope.toSessionState(result.state),
        trace: result.trace,
      };
    },
    projectStatic() {
      return staticProjection.projectStatic();
    },
    projectSeatsDynamic(input) {
      return projection.projectSeatsDynamic(input);
    },
    projectSeatViewDynamic(input) {
      return projection.projectSeatViewDynamic(input);
    },
  };
}
