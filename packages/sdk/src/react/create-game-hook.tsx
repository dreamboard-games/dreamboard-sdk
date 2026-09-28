import {
  GameDragProvider,
  useCardDraggable,
  useBoardDroppable,
  type BoardDropOptions,
  type DragBinding,
} from "./drag.js";
import type { IdOf } from "../headless/model.js";
import type { DropTarget, TargetOptions } from "../headless/targets.js";
import {
  createContext,
  useContext,
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
      const [instance, setInstance] = useState<Instance | null>(null);
      const lifetime = useRef<{
        instance: Instance;
        generation: number;
      } | null>(null);
      const options = {
        ...defaults,
        ...overrides,
      };
      useLayoutEffect(() => {
        let current = lifetime.current;
        if (!current) {
          current = {
            instance: createGameInstance<Game>()(options),
            generation: 0,
          };
          lifetime.current = current;
          setInstance(current.instance);
        }
        const owned = current;
        ++owned.generation;
        return () => {
          const generation = ++owned.generation;
          queueMicrotask(() => {
            if (owned.generation !== generation) return;
            owned.instance.dispose();
            if (lifetime.current === owned) lifetime.current = null;
          });
        };
        // Construction belongs to this committed provider lifetime. Current
        // options are installed separately without recreating features.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useLayoutEffect(() => {
        lifetime.current?.instance.setOptions(options);
      });
      return instance ? (
        <Context.Provider value={instance}>
          {"drag" in instance ? (
            <GameDragProvider game={instance as DragBinding<Game>}>
              {children}
            </GameDragProvider>
          ) : (
            children
          )}
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

    function useCardDrag(
      cardId: IdOf<Game, "cardId">,
      options?: TargetOptions<Game>,
    ) {
      const game = useGame();
      return useCardDraggable(game as DragBinding<Game>, cardId, options);
    }
    function useBoardDrop(
      target: DropTarget<Game> | null,
      options?: BoardDropOptions,
    ) {
      return useBoardDroppable(target, options);
    }
    return { GameProvider, useGame, Subscribe, useCardDrag, useBoardDrop };
  };
}
