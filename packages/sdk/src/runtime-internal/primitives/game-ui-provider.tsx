import type { ReactNode } from "react";
import {
  PluginStateProvider,
  type PluginStateProviderProps,
} from "../context/PluginStateContext.js";
import { RuntimeProvider } from "../context/RuntimeContext.js";
import {
  InteractionUiProvider,
  type InteractionUiStoreApi,
} from "../context/InteractionDraftContext.js";
import type { RuntimeAPI } from "../types/runtime-api.js";

export interface GameUIProviderProps {
  runtime: RuntimeAPI;
  children: ReactNode;
  loadingComponent?: PluginStateProviderProps["loadingComponent"];
  interactionStore?: InteractionUiStoreApi;
}

export function GameUIProvider({
  runtime,
  children,
  loadingComponent,
  interactionStore,
}: GameUIProviderProps) {
  return (
    <RuntimeProvider runtime={runtime}>
      <PluginStateProvider loadingComponent={loadingComponent}>
        <InteractionUiProvider store={interactionStore}>
          {children}
        </InteractionUiProvider>
      </PluginStateProvider>
    </RuntimeProvider>
  );
}
