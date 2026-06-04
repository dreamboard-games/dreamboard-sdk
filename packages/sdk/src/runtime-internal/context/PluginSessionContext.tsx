import { createContext, useContext } from "react";
import type { PluginSessionState } from "../types/runtime-api";

/**
 * Context for plugin session metadata.
 * This context is provided by the RuntimeContext after receiving init message from parent.
 */
export const PluginSessionContext = createContext<PluginSessionState | null>(
  null,
);

/**
 * Hook to access plugin session metadata.
 * Returns session initialization status and IDs.
 *
 * @returns Plugin session state with status, sessionId, controllablePlayerIds, and controllingPlayerId
 *
 * @example
 * ```tsx
 * function MyPluginComponent() {
 *   const { status, sessionId, controllablePlayerIds, controllingPlayerId } = usePluginSession();
 *
 *   if (status === "loading") {
 *     return <div>Initializing...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Session: {sessionId}</p>
 *       <p>Can control: {controllablePlayerIds.join(", ")}</p>
 *       <p>Currently controlling: {controllingPlayerId}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePluginSession(): PluginSessionState {
  const context = useContext(PluginSessionContext);

  if (context === null) {
    throw new Error(
      "usePluginSession must be used within a PluginSessionContext.Provider (provided by RuntimeContext)",
    );
  }

  return context;
}
