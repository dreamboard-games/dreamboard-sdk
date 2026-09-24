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

/** Bind erased game types, features and one owned source lifetime. */
export function createGameHook<Game>() {
  return function <
    const Enabled extends Features = Record<never, never>,
    Source extends GameSource = GameSource,
  >(
    defaults: InstanceOptions<Game, Source> & {
      features?: (
        core: CoreInstance<Game>,
        context: FeatureContext<Game>,
      ) => Enabled;
    },
  ) {
    type Instance = GameInstance<Game, Enabled, Source>;
    type Snapshot = GameSnapshot<Game, Enabled>;
    type ProviderProps = Partial<InstanceOptions<Game, Source>> & {
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
        source: overrides.source ?? defaults.source,
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
        <Context.Provider value={instance}>{children}</Context.Provider>
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
        selector ?? ((snapshot) => snapshot as unknown as Value),
        options,
      );
      return selector ? selected : instance;
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

    return { GameProvider, useGame, Subscribe };
  };
}
