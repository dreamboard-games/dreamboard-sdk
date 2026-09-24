import { validateInteractionInputsSchema } from "./validation";
import type {
  CollectorState,
  InputCollector,
  ParamsOf,
  PlayerIdOfState,
  TableQueriesOfState,
} from "../model";

type StepCollector = Exclude<InputCollector, { readonly kind: "rng" }>;

export type StepFactoryArgs<
  State extends CollectorState,
  Collectors extends Record<string, InputCollector>,
> = {
  readonly state: State;
  readonly playerId: PlayerIdOfState<State>;
  readonly q: TableQueriesOfState<State>;
  readonly selected: Readonly<ParamsOf<Collectors>>;
};

export type InputStep<State extends CollectorState> = {
  readonly key: string;
  readonly resolve: {
    invoke(
      args: StepFactoryArgs<State, Record<string, InputCollector>>,
    ): InputCollector;
  }["invoke"];
};

export type StepDefinition<Collectors extends Record<string, InputCollector>> =
  {
    readonly collectors: Collectors;
    readonly entries: readonly InputStep<CollectorState>[];
  };

/** Ordered authoring definition. Only the committed values are persisted. */
export class InteractionSteps<
  State extends CollectorState,
  Collectors extends Record<string, InputCollector> = Record<never, never>,
> {
  declare readonly collectors: Collectors;

  constructor(readonly entries: readonly InputStep<State>[] = []) {}

  input<const Key extends string, Collector extends StepCollector>(
    key: Key extends keyof Collectors ? never : Key,
    collector:
      | Collector
      | ((args: StepFactoryArgs<State, Collectors>) => Collector),
  ): InteractionSteps<State, Collectors & Record<Key, Collector>> {
    if (this.entries.some((entry) => entry.key === key)) {
      throw new Error(`Duplicate interaction step '${key}'.`);
    }
    const factory =
      typeof collector === "function"
        ? (collector as InputStep<State>["resolve"])
        : () => collector;
    const resolve: InputStep<State>["resolve"] = (args) => {
      const resolved = factory(args);
      if (resolved.kind === "rng")
        throw new Error("Interaction steps cannot contain RNG collectors.");
      validateInteractionInputsSchema({ [key]: resolved }, "defineInteraction");
      return resolved;
    };
    if (
      typeof collector !== "function" &&
      (collector as InputCollector).kind === "rng"
    ) {
      throw new Error("Interaction steps cannot contain RNG collectors.");
    }
    if (typeof collector !== "function")
      validateInteractionInputsSchema(
        { [key]: collector },
        "defineInteraction",
      );
    return new InteractionSteps([...this.entries, { key, resolve }]);
  }
}
