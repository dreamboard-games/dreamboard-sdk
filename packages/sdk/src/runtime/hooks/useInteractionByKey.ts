import { useMemo } from "react";
import { usePluginState } from "../context/PluginStateContext.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import type {
  InteractionHandle,
  InteractionParamsShape,
} from "./useInteractionHandle.js";
import { useBoundInteractionHandle } from "./useBoundInteractionHandle.js";

/**
 * Look up an interaction descriptor by phase-qualified key on the controlling seat's
 * inbox and return a bound {@link InteractionHandle}. Returns `null`
 * when no matching descriptor is currently projected.
 *
 * Prefer this over manual `inbox.bySurface.panel?.find(...)` + sentinel
 * descriptor patterns — it keeps hook-call order stable and guarantees
 * the handle reflects the freshest descriptor.
 *
 * Types:
 * - `Key` narrows the key literal. When called from the workspace-local
 *   `useInteractionByKey` re-export generated in `ui-contract.ts`, `Key` is
 *   constrained to the generated `InteractionKey` union so typos become
 *   compile errors.
 * - `Params` is the params shape (`InteractionParamsOf<Key>` in the
 *   generated re-export). It flows through to `draft`, `submit`,
 *   `validate`, and `setInput` for compile-time safety.
 *
 * ```tsx
 * // from the generated workspace re-export
 * const handle = useInteractionByKey("play.placeThingCard");
 * if (!handle) return <Waiting/>;
 * handle.setInput("cardId", card.id); // typed to ThingsDeckCardId
 * await handle.submit();
 * ```
 */
export function useInteractionByKey<
  Key extends string = string,
  Params extends InteractionParamsShape = InteractionParamsShape,
  DefaultedKeys extends keyof Params & string = never,
>(
  interactionKey: Key | null | undefined,
): InteractionHandle<Params, DefaultedKeys> | null {
  const descriptors = usePluginState(
    (state) => state.gameplay.availableInteractions ?? [],
  );

  const descriptor = useMemo<InteractionDescriptor | null>(() => {
    if (!interactionKey) return null;
    return descriptors.find((d) => d.interactionKey === interactionKey) ?? null;
  }, [descriptors, interactionKey]);

  return useBoundInteractionHandle<Params, DefaultedKeys>(descriptor);
}
