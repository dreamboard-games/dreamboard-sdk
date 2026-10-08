import { createStore, type Store } from "@tanstack/store";
import type {
  CoreInstance,
  FeatureContext,
  IdOf,
  InputKey,
  InputKind,
  InputTarget,
  InteractionKey,
  InteractionParams,
  SelectionTarget,
  SubmitResult,
  ZoneHostId,
} from "../model.js";
import { runtimeFeatures } from "../runtime-features.js";
import type { RuntimeSelectionTarget } from "../targets.js";
import type { RuntimeJson } from "../../shared/runtime-json.js";

/** A zone control carries the actual admitted attachment, including its host. */
export type ShortcutZoneTarget<G> = {
  [Z in IdOf<G, "zoneId">]: {
    readonly kind: "zone";
    readonly zoneId: Z;
    readonly hostId: ZoneHostId<G, Z>;
  };
}[IdOf<G, "zoneId">];
export type ShortcutTarget<G> = SelectionTarget<G> | ShortcutZoneTarget<G>;
type TargetKind = SelectionTarget<unknown>["kind"];
type CollectorKind<Kind extends TargetKind> = Kind extends "space"
  ? "board-space"
  : Kind extends "edge"
    ? "board-edge"
    : Kind extends "vertex"
      ? "board-vertex"
      : Kind;
type TargetFor<
  G,
  K extends InteractionKey<G>,
  N extends InputKey<G, K>,
  Kind extends TargetKind,
> = Extract<SelectionTarget<G>, { readonly kind: Kind }> & {
  readonly value: InputTarget<G, K, N>;
};
type Binding<G, K extends InteractionKey<G>, Target, Filter> = Filter & {
  /** Exact browser event.key values; modifiers and held repeats are ignored. */
  readonly keys: readonly string[];
  readonly label: string;
  readonly kind: "interaction";
  readonly interaction: K;
  readonly inputs: (context: {
    readonly key: string;
    readonly target: Target;
  }) => InteractionParams<G, K>;
};
type SelectionBinding<G, K extends InteractionKey<G>> = {
  [N in InputKey<G, K>]: {
    [Kind in TargetKind]: [
      Extract<InputKind<G, K, N>, CollectorKind<Kind>>,
    ] extends [never]
      ? never
      : Binding<
          G,
          K,
          TargetFor<G, K, N, Kind>,
          { readonly target: Kind; readonly input: N }
        >;
  }[TargetKind];
}[InputKey<G, K>];
/** Correlated by interaction, input kind, and the selected target's value. */
export type InteractionShortcutBinding<G> = {
  [K in InteractionKey<G>]:
    | SelectionBinding<G, K>
    | {
        [Z in IdOf<G, "zoneId">]: Binding<
          G,
          K,
          Extract<ShortcutZoneTarget<G>, { readonly zoneId: Z }>,
          { readonly target: "zone"; readonly zoneId: Z }
        >;
      }[IdOf<G, "zoneId">];
}[InteractionKey<G>];
/** Local presentation actions run only from control focus, independent of reducer turns. */
export type LocalShortcutBinding<G> = {
  [Z in IdOf<G, "zoneId">]: {
    readonly kind: "local";
    readonly keys: readonly string[];
    readonly label: string;
    readonly target: "zone";
    readonly zoneId: Z;
    /** Pure applicability predicate, also evaluated for hints. */
    readonly getIsAvailable?: (context: {
      readonly key: string;
      readonly target: Extract<ShortcutZoneTarget<G>, { readonly zoneId: Z }>;
    }) => boolean;
    readonly run: (context: {
      readonly key: string;
      readonly target: Extract<ShortcutZoneTarget<G>, { readonly zoneId: Z }>;
    }) => void | Promise<void>;
  };
}[IdOf<G, "zoneId">];
export type ShortcutBinding<G> =
  InteractionShortcutBinding<G> | LocalShortcutBinding<G>;
export interface ShortcutOptions<G> {
  readonly bindings: readonly ShortcutBinding<G>[];
}
export type ShortcutHint<G = unknown> = {
  readonly keys: readonly string[];
  readonly label: string;
} & (
  | { readonly kind: "interaction"; readonly interaction: InteractionKey<G> }
  | { readonly kind: "local" }
);
export type ShortcutResult =
  | { readonly kind: "interaction"; readonly result: SubmitResult }
  | { readonly kind: "local" };
/** Mounted control activity; explicit-target interaction menus need no focus. */
export interface ShortcutActivity<G> {
  readonly focusedTarget: ShortcutTarget<G> | null;
  /** Card press, drag, or submitted drag overlay still settling. */
  readonly pointerActive: boolean;
}
export interface ShortcutsController<G> {
  /** UI binding configuration has its own subscription, independent of reducer frames. */
  readonly configuration: Pick<
    Store<ShortcutOptions<G> | null>,
    "get" | "subscribe"
  >;
  /** Registers one mounted adapter. Cleanup removes both behavior and hints. */
  register(options: ShortcutOptions<G>): {
    update(options: ShortcutOptions<G>): void;
    dispose(): void;
  };
  /** null means unhandled; a handled key runs or submits exactly once. */
  handle(
    key: string,
    target: ShortcutTarget<G> | null,
    activity?: ShortcutActivity<G>,
  ): Promise<ShortcutResult> | null;
  getHints(
    target: ShortcutTarget<G> | null,
    activity?: ShortcutActivity<G>,
  ): readonly ShortcutHint<G>[];
}
export type RuntimeShortcutTarget =
  | RuntimeSelectionTarget
  | {
      readonly kind: "zone";
      readonly zoneId: string;
      readonly hostId: string;
    };
type RuntimeBinding = {
  readonly keys: readonly string[];
  readonly label: string;
  readonly target: RuntimeShortcutTarget["kind"];
  readonly zoneId?: string;
} & (
  | {
      readonly kind: "interaction";
      readonly interaction: string;
      readonly input?: string;
      readonly inputs: (context: {
        readonly key: string;
        readonly target: RuntimeShortcutTarget;
      }) => Readonly<Record<string, RuntimeJson>>;
    }
  | {
      readonly kind: "local";
      readonly run: (context: {
        readonly key: string;
        readonly target: RuntimeShortcutTarget;
      }) => void | Promise<void>;
      readonly getIsAvailable?: (context: {
        readonly key: string;
        readonly target: RuntimeShortcutTarget;
      }) => boolean;
    }
);

/** Headless and opt-in: no names, bindings or browser listeners are installed by default. */
export function shortcutsFeature<G>(
  _game: CoreInstance<G>,
  context: FeatureContext<G>,
) {
  const game = context[runtimeFeatures].game;
  const configuration = createStore<ShortcutOptions<G> | null>(null);
  let registration: object | null = null;
  function bindings(): readonly RuntimeBinding[] {
    // eslint-disable-next-line no-restricted-syntax -- Instance composition owns the typed bindings; resolve validates the admitted projected domain before invoking each factory.
    return (configuration.get()?.bindings ??
      []) as unknown as readonly RuntimeBinding[];
  }
  let disposed = false;
  function resolve(
    binding: RuntimeBinding,
    key: string,
    target: RuntimeShortcutTarget | null,
    activity?: ShortcutActivity<G>,
  ) {
    if (disposed || game.connection !== "ready") return null;
    if (binding.kind === "local") {
      if (!activity || activity.pointerActive) return null;
      const focused = activity.focusedTarget as RuntimeShortcutTarget | null;
      const card =
        focused?.kind === "card" ? game.cards.find(focused.value) : undefined;
      const zone =
        focused?.kind === "zone"
          ? focused
          : card
            ? { kind: "zone" as const, zoneId: card.zone, hostId: card.hostId }
            : null;
      if (
        !zone ||
        zone.zoneId !== binding.zoneId ||
        !game.zones.find(zone.zoneId, zone.hostId)
      )
        return null;
      const action = { key, target: zone };
      return binding.getIsAvailable?.(action) === false
        ? null
        : { kind: "local" as const, binding, action };
    }
    if (!target || game.request || target.kind !== binding.target) return null;
    const routes =
      target.kind === "card"
        ? (game.cards.find(target.value)?.getInteractions() ?? [])
        : game.interactions.list();
    const interaction = routes.find((item) => item.key === binding.interaction);
    if (!interaction || interaction.getStatus() !== "open") return null;
    if (target.kind === "zone") {
      if (
        target.zoneId !== binding.zoneId ||
        !game.zones.find(target.zoneId, target.hostId)
      )
        return null;
    } else {
      const input = interaction
        .getInputs()
        .find((item) => item.key === binding.input);
      if (!input || !input.getIsEligible(target.value)) return null;
      const domain = input.getDomain();
      if (target.kind === "card" && input.kind !== "card") return null;
      if (target.kind === "tile" && input.kind !== "tile") return null;
      if (
        target.kind === "space" ||
        target.kind === "edge" ||
        target.kind === "vertex"
      ) {
        if (
          domain.type !== "boardTarget" ||
          domain.targetKind !== target.kind ||
          domain.valueKind !== target.valueKind
        )
          return null;
        if (
          domain.valueKind === "board-id" &&
          target.valueKind === "board-id" &&
          domain.boardId !== target.boardId
        )
          return null;
      }
    }
    const params = binding.inputs({ key, target });
    return interaction.getIsAvailable(params) && interaction.getIsReady(params)
      ? { kind: "interaction" as const, interaction, params }
      : null;
  }
  const controller: ShortcutsController<G> = {
    configuration,
    register(options) {
      if (registration)
        throw new Error("Mount useGameShortcuts once per GameProvider.");
      const owned = {};
      registration = owned;
      configuration.setState(() => options);
      return {
        update(options) {
          if (registration !== owned) return;
          configuration.setState(() => options);
        },
        dispose() {
          if (registration !== owned) return;
          registration = null;
          configuration.setState(() => null);
        },
      };
    },
    handle(key, target, activity) {
      const candidates = bindings()
        .filter((binding) => binding.keys.includes(key))
        .flatMap((binding) => {
          const resolved = resolve(binding, key, target, activity);
          return resolved ? [resolved] : [];
        });
      // Ambiguous authored routes do not guess which action to run.
      if (candidates.length !== 1) return null;
      const candidate = candidates[0];
      if (candidate.kind === "interaction")
        return candidate.interaction
          .submit(candidate.params)
          .then((result) => ({ kind: "interaction", result }));
      // Capture synchronous callback errors in the same promise path as async failures.
      try {
        return Promise.resolve(candidate.binding.run(candidate.action)).then(
          () => ({ kind: "local" }),
        );
      } catch (cause) {
        return Promise.reject(cause);
      }
    },
    getHints(target, activity) {
      const eligible = bindings().map((binding) => ({
        binding,
        keys: binding.keys.filter((key) =>
          resolve(binding, key, target, activity),
        ),
      }));
      const counts = new Map<string, number>();
      for (const { keys } of eligible)
        for (const key of new Set(keys))
          counts.set(key, (counts.get(key) ?? 0) + 1);
      return eligible.flatMap(({ binding, keys }) => {
        const unique = [...new Set(keys)].filter(
          (key) => counts.get(key) === 1,
        );
        return unique.length
          ? [
              {
                keys: unique,
                label: binding.label,
                ...(binding.kind === "interaction"
                  ? {
                      kind: "interaction" as const,
                      interaction: binding.interaction,
                    }
                  : { kind: "local" as const }),
              },
            ]
          : [];
      }) as readonly ShortcutHint<G>[];
    },
  };
  return {
    root: { shortcuts: controller },
    dispose() {
      disposed = true;
      registration = null;
      configuration.setState(() => null);
    },
  };
}
