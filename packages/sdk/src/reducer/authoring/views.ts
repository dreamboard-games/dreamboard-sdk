import type { ViewData } from "../model/spec/views";
import type { ViewDefinition } from "../model";
import type {
  AnyReducerGameContract,
  ContractManifest,
  ContractState,
} from "./types";

/** Contextual typing for a view defined outside the game assembly module. */
export function defineView<Contract extends AnyReducerGameContract>() {
  return <Projection extends ViewData>(
    view: ViewDefinition<
      ContractState<Contract>,
      ContractManifest<Contract>,
      Projection
    >,
  ) => view;
}
