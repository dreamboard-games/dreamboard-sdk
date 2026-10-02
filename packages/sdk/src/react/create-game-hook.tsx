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
export type DropAreaBinding<G> = Exclude<
  TargetOptions<G>,
  { readonly interaction?: undefined }
>;

export interface CardGesture {
  /** Spread on the card's own control, after the card's selection props. */
  readonly props: CardGestureProps;
  readonly canDrag: boolean;
  readonly isDragging: boolean;
  /** Held on touch, or rested on with a mouse. */
  readonly inspecting: "hold" | "hover" | null;
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
      const routes = options.drag as false | RuntimeTargetOptions;
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
      return {
        props: session.cardProps(cardId, routes, { dragging, inspecting }),
        canDrag,
        isDragging: dragging,
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

    return {
      GameProvider,
      useGame,
      Subscribe,
      useCardGesture,
      useDropArea,
      useDragOverlay,
    };
  };
}
