import type { PhaseMapOf, ReducerGameDefinition, ViewMapOf } from "../model";
import type { AnyReducerGameContract } from "./types";
import {
  validateDefineGamePhaseNames,
  validateDefineGameSimultaneousPhases,
  validateDefineGameZoneWiring,
} from "./validation";

export function defineGame<
  const Contract extends AnyReducerGameContract,
  Definitions extends PhaseMapOf<Contract>,
  Views extends ViewMapOf<Contract>,
>(
  definition: { contract: Contract } & Omit<
    ReducerGameDefinition<NoInfer<Contract>, Definitions, Views>,
    "contract"
  >,
): ReducerGameDefinition<Contract, Definitions, Views> {
  validateDefineGamePhaseNames(definition);
  validateDefineGameSimultaneousPhases(definition);
  validateDefineGameZoneWiring(definition);
  return definition;
}
