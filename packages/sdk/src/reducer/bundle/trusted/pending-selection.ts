import type { ReferenceBasis } from "../../../shared/runtime-types.js";
import type {
  PhaseMapOf,
  ReducerGameContractLike,
  RuntimePayload,
  ViewOfContract,
} from "../../model.js";
import type {
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope.js";
import type { createInteractionResolver } from "./interaction-resolver.js";
import { evaluateStepPrefix } from "./step-prefix.js";
import { createSeatDisclosure } from "./tile-disclosure.js";
import { concealCards } from "./card-concealment.js";
import {
  canDiscloseSelection,
  selectionHasConcealedReferences,
} from "./seat-interactions.js";

/** Reconcile pending references before any projection, inspection or action decision. */
export function createPendingSelectionReconciler<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(
  scope: TrustedRuntimeScope<Contract, Definitions, View>,
  interactions: ReturnType<
    typeof createInteractionResolver<Contract, Definitions, View>
  >,
) {
  type State = TrustedState<Contract>;
  type PlayerId = TrustedPlayerId<Contract>;
  function reconcilePending(
    state: State,
    referenceBasis?: ReferenceBasis,
  ): State {
    const pending = { ...state.runtime.pending };
    for (const [seat, choice] of Object.entries(state.runtime.pending)) {
      const playerId = seat as PlayerId;
      const saved = choice as NonNullable<
        State["runtime"]["pending"][PlayerId]
      >;
      const interaction = scope.findInteractionInPhase(
        state.flow.currentPhase,
        saved.interactionId,
      );
      const eligibility = interactions.resolveInteractionEligibility({
        state,
        playerId,
        interactionId: saved.interactionId,
      });
      if (
        saved.phaseName !== state.flow.currentPhase ||
        !interaction?.steps ||
        !eligibility.found ||
        !eligibility.validation.valid
      ) {
        delete pending[playerId];
        continue;
      }
      const prefix = evaluateStepPrefix(
        interaction.steps,
        scope.toDomainState(state),
        playerId,
        saved.values,
        scope.manifest,
      );
      if (!referenceBasis)
        throw new Error(
          "Pending selections require an authority reference basis.",
        );
      const disclosure = createSeatDisclosure(
        state.table,
        scope.manifest,
        playerId,
        referenceBasis,
      );
      const cards = concealCards(state.table, playerId, disclosure);
      const concealed = selectionHasConcealedReferences(
        prefix.selected,
        prefix.collectors,
        disclosure,
        cards,
      );
      const current = saved.concealedBasis
        ? saved.concealedBasis.sessionId === referenceBasis.sessionId &&
          saved.concealedBasis.version === referenceBasis.version
        : !concealed;
      if (
        prefix.values.length === 0 ||
        !current ||
        !canDiscloseSelection(
          prefix.selected,
          prefix.collectors,
          disclosure,
          cards,
        )
      )
        delete pending[playerId];
      else
        pending[playerId] = {
          ...saved,
          values: prefix.values as RuntimePayload[],
        };
    }
    return { ...state, runtime: { ...state.runtime, pending } };
  }

  return reconcilePending;
}
