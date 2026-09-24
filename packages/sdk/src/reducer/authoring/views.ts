import type { AuthoredView } from "../../shared/runtime-types";
import type { ViewDefinition } from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

/** Contextual typing for a view defined outside the game assembly module. */
export function defineView<Contract extends AnyReducerGameContract>() {
  return <Projection extends AuthoredView>(
    view: ViewDefinition<
      ContractState<Contract>,
      ContractManifest<Contract>,
      Projection
    >,
  ) => view;
}
