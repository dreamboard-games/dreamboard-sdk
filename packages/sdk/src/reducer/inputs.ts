export { formInput } from "./inputs/formInput";
export { boardInput, type BoardSpaceInputSchema } from "./inputs/boardInput";
export { boardTarget } from "./inputs/boardTarget";
export type {
  BoardTargetBuilder,
  BoardTargetPredicate,
  BoardTargetRule,
  BoardSpaceTarget,
} from "./inputs/boardTarget";
export { cardTarget } from "./inputs/cardTarget";
export type {
  CardTargetBuilder,
  CardTargetPredicate,
  CardTargetRule,
} from "./inputs/cardTarget";
export { choiceTarget } from "./inputs/choiceTarget";
export type {
  ChoiceOptionsFactory,
  ChoiceTargetOption,
  ChoiceTargetBuilder,
  ChoiceTargetPredicate,
  ChoiceTargetRule,
} from "./inputs/choiceTarget";
export type {
  BoundTargetRule,
  TargetContext,
  TargetPredicate,
  TargetPredicateArgs,
  TargetRule,
  TargetRuleBuilder,
} from "./inputs/targetRule";
export { cardInput } from "./inputs/cardInput";
export { rngInput } from "./inputs/rngInput";
export { many, type ManyOptions } from "./inputs/many";

export { tileTarget } from "./inputs/tileTarget";
export type {
  TileTargetBuilder,
  TileTargetPredicate,
  TileTargetRule,
} from "./inputs/tileTarget";
export { tileInput } from "./inputs/tileInput";
