import { createStore } from "@tanstack/store";
import { inputValueKey } from "../shared/input-domain.js";
import { useShortcutsAdapter } from "./shortcuts.js";
import type {
  ShortcutOptions,
  ShortcutTarget,
  ShortcutHint,
  ShortcutsController,
  RuntimeShortcutTarget,
} from "../headless/features/shortcuts.js";
import {
  createGestureSession,
  resolveDropArea,
  sameDropTarget,
  GestureContext,
  useGestureSession,
  useGestureState,
  type CardGestureProps,
  type DropAreaInput,
  type GestureGame,
  type GestureSession,
} from "./gesture.js";
import type { SeatCardId } from "../headless/model.js";
import type {
  DropAreaBinding,
  DropTarget,
  RuntimeTargetOptions,
  TargetOptions,
} from "../headless/targets.js";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSelector } from "@tanstack/react-store";
import { createGameInstance } from "../headless/instance.js";
import type {
  CoreInstance,
  FeatureContext,
  Features,
  GameInstance,
  GameSnapshot,
  GameSource,
  InstanceOptions,
} from "../headless/model.js";

export interface SelectionOptions<Value> {
  readonly compare?: (previous: Value, next: Value) => boolean;
}

/** Inspection stays enabled when this control does not support dragging. */
export interface CardGestureOptions<Game> {
  readonly drag: false | TargetOptions<Game>;
}

/** An area that runs this interaction with whichever card is dropped on it. */
export type { DropAreaBinding } from "../headless/targets.js";

export interface CardGesture {
  /** Spread on the card's own control, after the card's selection props. */
  readonly props: CardGestureProps;
  readonly canDrag: boolean;
  readonly isDragging: boolean;
  readonly isActive: boolean;
  /** Held on touch, or rested on with a mouse. */
  readonly inspecting: "hold" | "hover" | null;
}

export interface CardRow {
  /** Spread on the element holding the row's cards; touching them never scrolls. */
  readonly props: {
    readonly "data-card-row": string;
    readonly style: CSSProperties;
  };
}

export interface DropArea {
  readonly props: {
    readonly "data-drop-area": string;
    readonly "data-drop-target"?: "true";
    readonly "data-drop-over"?: true;
  };
  readonly isEligible: boolean;
  readonly isOver: boolean;
}

export interface DragOverlay<G> {
  readonly cardId: SeatCardId<G>;
  /** Dropped and submitted; the authoritative frame has not arrived yet. */
  readonly settling: boolean;
  /** Attach to a fixed-position copy of the card; it follows the pointer. */
  readonly ref: (element: HTMLElement | null) => (() => void) | undefined;
}

/** Bind erased game types and features; each provider owns its source lifetime. */
export function createGameHook<Game, Source extends GameSource = GameSource>() {
  return function <const Enabled extends Features = Record<never, never>>(
    defaults: Omit<InstanceOptions<Game, Source>, "source"> & {
      features?: (
        core: CoreInstance<Game>,
        context: FeatureContext<Game>,
      ) => Enabled;
    },
  ) {
    type Instance = GameInstance<Game, Enabled, Source>;
    type Snapshot = GameSnapshot<Game, Enabled>;
    type ProviderProps = Partial<
      Omit<InstanceOptions<Game, Source>, "source">
    > & {
      source: Source;
      children?: ReactNode;
    };
    const Context = createContext<Instance | null>(null);

    /** Owns the source. Do not share it between independently mounted providers. */
    function GameProvider({ children, ...overrides }: ProviderProps) {
      const [owned, setOwned] = useState<{
        instance: Instance;
        session: GestureSession;
      } | null>(null);
      const lifetime = useRef<{
        instance: Instance;
        session: GestureSession;
        generation: number;
      } | null>(null);
      const options = {
        ...defaults,
        ...overrides,
      };
      useLayoutEffect(() => {
        let current = lifetime.current;
        if (!current) {
          const instance = createGameInstance<Game>()(options);
          current = {
            instance,
            session: createGestureSession(instance),
            generation: 0,
          };
          lifetime.current = current;
          setOwned({ instance, session: current.session });
        }
        const owned = current;
        ++owned.generation;
        return () => {
          const generation = ++owned.generation;
          queueMicrotask(() => {
            if (owned.generation !== generation) return;
            owned.session.dispose();
            owned.instance.dispose();
            if (lifetime.current === owned) lifetime.current = null;
          });
        };
        // Construction belongs to this committed provider lifetime. Current
        // options are installed separately without recreating features.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Construct once per committed provider lifetime; the next effect updates options.
      }, []);
      useLayoutEffect(() => {
        lifetime.current?.instance.setOptions(options);
      });
      return owned ? (
        <Context.Provider value={owned.instance}>
          <GestureContext.Provider value={owned.session}>
            {children}
          </GestureContext.Provider>
        </Context.Provider>
      ) : null;
    }

    function useInstance(): Instance {
      const instance = useContext(Context);
      if (!instance) throw new Error("useGame requires its GameProvider.");
      return instance;
    }

    function useGame(): Instance;
    function useGame<Value>(
      selector: (snapshot: Snapshot) => Value,
      options?: SelectionOptions<Value>,
    ): Value;
    function useGame<Value>(
      selector?: (snapshot: Snapshot) => Value,
      options?: SelectionOptions<Value>,
    ): Instance | Value {
      const instance = useInstance();
      const selected = useSelector(
        instance.store,
        (snapshot): { value: Value } | { snapshot: Snapshot } =>
          selector ? { value: selector(snapshot) } : { snapshot },
        {
          compare: (previous, next) =>
            "value" in previous && "value" in next
              ? (options?.compare ?? Object.is)(previous.value, next.value)
              : "snapshot" in previous &&
                "snapshot" in next &&
                Object.is(previous.snapshot, next.snapshot),
        },
      );
      return "value" in selected ? selected.value : instance;
    }

    function Subscribe<Value>({
      selector,
      compare,
      children,
    }: {
      selector: (snapshot: Snapshot) => Value;
      compare?: SelectionOptions<Value>["compare"];
      children: (value: Value) => ReactNode;
    }) {
      return children(useGame(selector, { compare }));
    }

    // Game-binding boundary: typed ids and routes cross into the erased session.
    const dragOf = (snapshot: Snapshot) =>
      (snapshot as Pick<GestureGame, "drag">).drag;

    /** Tap, hold, drag and browse on one card; hover intent with a mouse. */
    function useCardGesture(
      cardId: SeatCardId<Game>,
      options: CardGestureOptions<Game>,
    ): CardGesture {
      const session = useGestureSession();
      const control = `${session.id}${useId()}`;
      const routes = options.drag as false | RuntimeTargetOptions;
      const latestRoutes = useRef(routes);
      useLayoutEffect(() => {
        latestRoutes.current = routes;
      });
      useLayoutEffect(
        () => session.registerControl(control, () => latestRoutes.current),
        [session, control],
      );
      const canDrag = useGame(
        (snapshot) =>
          routes !== false &&
          (dragOf(snapshot)?.getCanDrag(cardId, routes) ?? false),
      );
      const dragging = useGestureState(
        session,
        (state) => state.drag?.cardId === cardId,
      );
      const inspecting = useGestureState(session, (state) =>
        state.inspect?.cardId === cardId ? state.inspect.via : null,
      );
      const isActive = useGestureState(
        session,
        (state) =>
          state.activeTarget?.kind === "card" &&
          state.activeTarget.value === cardId,
      );
      return {
        props: session.cardProps(cardId, control, routes, {
          dragging,
          inspecting,
        }),
        canDrag,
        isDragging: dragging,
        isActive,
        inspecting,
      };
    }

    /**
     * Marks an element where a dragged card can land: a board destination,
     * or an area that runs an interaction with the dropped card.
     */
    function useDropArea(
      binding: DropTarget<Game> | DropAreaBinding<Game> | null,
    ): DropArea {
      const session = useGestureSession();
      const id = `${session.id}${useId()}`;
      const erased = binding as DropAreaInput;
      const target = useGame(
        (snapshot) => resolveDropArea(dragOf(snapshot), erased),
        { compare: sameDropTarget },
      );
      const isOver = useGame((snapshot) => {
        const active = dragOf(snapshot)?.active?.target;
        return !!target && sameDropTarget(active ?? null, target);
      });
      const latest = useRef(erased);
      useLayoutEffect(() => {
        latest.current = erased;
      });
      useLayoutEffect(
        () => session.registerArea(id, () => latest.current),
        [session, id],
      );
      return {
        props: {
          "data-drop-area": id,
          "data-drop-target": target ? "true" : undefined,
          "data-drop-over": isOver || undefined,
        },
        isEligible: target !== null,
        isOver,
      };
    }

    const shortcutsOf = (snapshot: Snapshot) =>
      (
        snapshot as Snapshot & {
          readonly shortcuts?: ShortcutsController<Game>;
        }
      ).shortcuts;
    const noShortcutsConfiguration = createStore<ShortcutOptions<Game> | null>(
      null,
    );
    const sameHints = (
      left: readonly ShortcutHint<Game>[],
      right: readonly ShortcutHint<Game>[],
    ) =>
      left.length === right.length &&
      left.every((hint, index) => {
        const next = right[index];
        return (
          hint.label === next.label &&
          hint.interaction === next.interaction &&
          hint.keys.length === next.keys.length &&
          hint.keys.every((key, at) => key === next.keys[at])
        );
      });
    /** Current eligible hints; configuration and projected domains each notify their own readers. */
    function useShortcutHints(
      target: ShortcutTarget<Game> | null,
    ): readonly ShortcutHint<Game>[] {
      const controller = shortcutsOf(useInstance());
      useGame((snapshot) => shortcutsOf(snapshot)?.getHints(target) ?? [], {
        compare: sameHints,
      });
      return useSelector(
        controller?.configuration ?? noShortcutsConfiguration,
        () => controller?.getHints(target) ?? [],
        { compare: sameHints },
      );
    }

    /** Installs the authored keyboard bindings for this mounted application. */
    function useGameShortcuts(options: ShortcutOptions<Game>): {
      readonly target: ShortcutTarget<Game> | null;
      readonly hints: readonly ShortcutHint<Game>[];
    } {
      const instance = useInstance();
      const session = useGestureSession();
      // Feature-composition boundary: this binding and its installed root feature share Game.
      const controller = shortcutsOf(instance);
      if (!controller)
        throw new Error(
          "useGameShortcuts requires shortcutsFeature in the game binding.",
        );
      useShortcutsAdapter(instance, controller, session, options, (result) => {
        if (result instanceof Error) instance.getOptions().onError?.(result);
        else if (!result.accepted)
          instance
            .getOptions()
            .onError?.(
              new Error(result.message ?? result.errorCode, { cause: result }),
            );
      });
      const target = useGestureState(
        session,
        (state) => state.activeTarget,
      ) as ShortcutTarget<Game> | null;
      const hints = useShortcutHints(target);
      return { target, hints };
    }

    /** Shares the canonical pointer and keyboard focus with a zone, tile or board control. */
    function useShortcutTarget(target: ShortcutTarget<Game>) {
      const session = useGestureSession();
      const id = `${session.id}${useId()}`;
      const latest = useRef<RuntimeShortcutTarget>(target);
      const targetKey = inputValueKey(target);
      useLayoutEffect(() => {
        latest.current = target;
      });
      useLayoutEffect(
        () => session.registerTarget(id, () => latest.current),
        [session, id, targetKey],
      );
      return { props: session.targetProps(id) };
    }

    /** The card being dragged, and a ref that keeps its copy under the pointer. */
    function useDragOverlay(): DragOverlay<Game> | null {
      const session = useGestureSession();
      const drag = useGestureState(session, (state) => state.drag);
      return drag
        ? {
            cardId: drag.cardId as SeatCardId<Game>,
            settling: drag.settling,
            ref: session.overlayRef,
          }
        : null;
    }

    /**
     * Marks a row of cards that fits without scrolling, such as a hand. A
     * finger pressed on one of its cards slides along the row: `cardAt`
     * names the card whose resting place is under a viewport point, or null
     * off the row. That card becomes active; lifting the finger there clicks
     * it, and pulling up drags it.
     */
    function useCardRow(
      cardAt: (point: {
        readonly x: number;
        readonly y: number;
      }) => SeatCardId<Game> | null,
    ): CardRow {
      const session = useGestureSession();
      const id = `${session.id}${useId()}`;
      const latest = useRef(cardAt);
      useLayoutEffect(() => {
        latest.current = cardAt;
      });
      useLayoutEffect(
        () => session.registerRow(id, (point) => latest.current(point)),
        [session, id],
      );
      return { props: session.rowProps(id) };
    }

    /** Presentation focus shared by the fan, inspection and pointer activation. */
    function useActiveCard(): SeatCardId<Game> | null {
      const session = useGestureSession();
      return useGestureState(
        session,
        (state) =>
          (state.activeTarget?.kind === "card"
            ? state.activeTarget.value
            : null) as SeatCardId<Game> | null,
      );
    }

    return {
      GameProvider,
      useGame,
      Subscribe,
      useCardGesture,
      useCardRow,
      useActiveCard,
      useGameShortcuts,
      useShortcutTarget,
      useShortcutHints,
      useDropArea,
      useDragOverlay,
    };
  };
}
