import type {
  CardActionSpec,
  InputCollector,
  InteractionRule,
  InteractionSpec,
  PlayerZoneIdOfManifest,
  ScopedPhaseState,
} from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
  InferPhaseState,
  PhaseStateInput,
} from "./types";
import { validateInteractionLikeDefinition } from "./validation";

export function defineInteraction<
  Contract extends AnyReducerGameContract,
  PhaseState extends PhaseStateInput = import("../model").SchemaLike<object>,
>() {
  return <Collectors extends Record<string, InputCollector>>(
    definition: InteractionSpec<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
      ContractManifest<Contract>
    >,
  ): InteractionSpec<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
    ContractManifest<Contract>
  > => {
    validateInteractionLikeDefinition(
      definition as {
        inputs?: Record<string, InputCollector>;
        commit?: { mode: string };
        paramsSchema?: unknown;
      },
      "defineInteraction",
    );
    return definition;
  };
}

export function defineInteractionRule<
  Contract extends AnyReducerGameContract,
  PhaseState extends PhaseStateInput = import("../model").SchemaLike<object>,
>() {
  return <
    Collectors extends Record<string, InputCollector> = Record<
      string,
      InputCollector
    >,
  >(
    definition: InteractionRule<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
      ContractManifest<Contract>
    >,
  ): InteractionRule<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
    ContractManifest<Contract>
  > => definition;
}

export function defineCardAction<
  Contract extends AnyReducerGameContract,
  PhaseState extends PhaseStateInput,
>() {
  return <
    Collectors extends Record<string, InputCollector> = Record<string, never>,
    const PlayFrom extends PlayerZoneIdOfManifest<
      ContractManifest<Contract>
    > = PlayerZoneIdOfManifest<ContractManifest<Contract>>,
  >(
    definition: CardActionSpec<
      Collectors,
      ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
      ContractManifest<Contract>,
      PlayFrom
    >,
  ): CardActionSpec<
    Collectors,
    ScopedPhaseState<ContractState<Contract>, InferPhaseState<PhaseState>>,
    ContractManifest<Contract>,
    PlayFrom
  > => {
    validateInteractionLikeDefinition(
      definition as {
        inputs?: Record<string, InputCollector>;
        commit?: { mode: string };
        paramsSchema?: unknown;
      },
      "defineCardAction",
    );
    return definition;
  };
}
