import type {
  AnyInteractionSpec,
  PhaseMapOf,
  ReducerGameContractLike,
  ViewOfContract,
} from "../../model";
import type {
  TrustedDomainState,
  TrustedManifest,
  TrustedPhaseName,
  TrustedPlayerId,
  TrustedRuntimeScope,
  TrustedState,
} from "./runtime-scope";
import type { InteractionActorAuthorization } from "./interaction-types";
import type { ProjectionContext } from "./projection-context";
import {
  isSimultaneousPhase,
  resolveSimultaneousActors,
} from "./simultaneous-player";

function resolveActorSet<PlayerId extends string>(
  to: unknown,
): ReadonlySet<PlayerId> {
  if (to === undefined || to === null) return new Set();
  if (Array.isArray(to)) {
    return new Set(to as PlayerId[]);
  }
  if (typeof to === "string") {
    return new Set([to as PlayerId]);
  }
  return new Set();
}

export function createInteractionAuthorization<
  Contract extends ReducerGameContractLike,
  Definitions extends PhaseMapOf<Contract>,
  View extends ViewOfContract<Contract>,
>(scope: TrustedRuntimeScope<Contract, Definitions, View>) {
  type DomainState = TrustedDomainState<Contract>;
  type Manifest = TrustedManifest<Contract>;
  type State = TrustedState<Contract>;
  type PhaseName = TrustedPhaseName<Contract, Definitions, View>;
  type PlayerId = TrustedPlayerId<Contract>;

  function resolveInteractionActorAuthorization(
    state: State,
    interaction: AnyInteractionSpec<DomainState, Manifest>,
    projection?: ProjectionContext<DomainState>,
  ): InteractionActorAuthorization<PlayerId> {
    if (interaction.actor) {
      const resolved = interaction.actor(
        scope.buildRuntimeArgs(
          state,
          {
            state: projection?.domainState ?? scope.toDomainState(state),
          },
          projection,
        ),
      );
      return {
        mode: "actors",
        actors: resolveActorSet<PlayerId>(resolved),
      };
    }
    const phase = scope.phaseByName(state.flow.currentPhase as PhaseName);
    if (isSimultaneousPhase(phase)) {
      return {
        mode: "actors",
        actors: new Set(
          resolveSimultaneousActors(scope, state, phase, projection),
        ),
      };
    }
    if (phase.actor) {
      const resolved = phase.actor(
        scope.buildRuntimeArgs(
          state,
          {
            state: projection?.domainState ?? scope.toDomainState(state),
          },
          projection,
        ),
      );
      return {
        mode: "actors",
        actors: resolveActorSet<PlayerId>(resolved),
      };
    }
    return { mode: "active" };
  }

  function isActorAuthorized(
    state: State,
    playerId: PlayerId,
    authorization: InteractionActorAuthorization<PlayerId>,
  ): boolean {
    if (authorization.mode === "actors") {
      return authorization.actors.has(playerId);
    }
    const active = state.flow.activePlayers as readonly PlayerId[];
    if (active.length === 0) {
      return true;
    }
    return active.includes(playerId);
  }

  return {
    isActorAuthorized,
    resolveInteractionActorAuthorization,
  };
}
