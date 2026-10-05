import type { TopologyDefinitions } from "../../shared/domain/topology-definitions.js";
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
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  readonly state: State;
  readonly playerId: PlayerIdOfState<State>;
  readonly q: TableQueriesOfState<State, Definitions>;
  readonly selected: Readonly<ParamsOf<Collectors>>;
};

export type InputStep<
  State extends CollectorState,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  readonly key: string;
  readonly resolve: {
    invoke(
      args: StepFactoryArgs<State, Record<string, InputCollector>, Definitions>,
    ): InputCollector;
  }["invoke"];
};

export type StepDefinition<
  Collectors extends Record<string, InputCollector>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> = {
  readonly collectors: Collectors;
  readonly entries: readonly InputStep<CollectorState, Definitions>[];
};

/** Ordered authoring definition. Only the committed values are persisted. */
export class InteractionSteps<
  State extends CollectorState,
  Collectors extends Record<string, InputCollector> = Record<never, never>,
  Definitions extends TopologyDefinitions = TopologyDefinitions,
> {
  declare readonly collectors: Collectors;

  constructor(
    readonly entries: readonly InputStep<State, Definitions>[] = [],
  ) {}

  input<const Key extends string, Collector extends StepCollector>(
    key: Key extends keyof Collectors ? never : Key,
    collector:
      | Collector
      | ((args: StepFactoryArgs<State, Collectors, Definitions>) => Collector),
  ): InteractionSteps<State, Collectors & Record<Key, Collector>, Definitions> {
    if (this.entries.some((entry) => entry.key === key)) {
      throw new Error(`Duplicate interaction step '${key}'.`);
    }
    const factory =
      typeof collector === "function"
        ? (collector as InputStep<State, Definitions>["resolve"])
        : () => collector;
    const resolve: InputStep<State, Definitions>["resolve"] = (args) => {
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
