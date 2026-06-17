import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useInteractionHandle } from "../../hooks/useInteractionHandle.js";
import { useAuthoredPluginGameplayFrameSelector } from "../../context/PluginGameplayFrameContext.js";
import type { InteractionKey } from "../../ui-contract.js";
import type { InteractionDescriptor } from "../../types/plugin-state.js";
import { isTargetDomain } from "../../utils/interaction-inputs.js";
import { isInteractionAvailable } from "../../utils/interaction-status.js";
import { renderPrimitive } from "../../../ui/primitives/primitive-props.js";
import { createGameplayInteractionRootAttributes } from "../../../browser-interaction/index.js";
import { GAMEPLAY_BROWSER_SCOPE_ID } from "../../interactions/gameplay-attributes.js";

interface InteractionContextValue {
  interaction: string;
  descriptor: InteractionDescriptor | null;
  handle: ReturnType<typeof useInteractionHandle> | null;
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

export function humanizeInteraction(value: string): string {
  const parts = value.split(".");
  const leaf = parts[parts.length - 1] ?? value;
  return leaf
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first: string) => first.toUpperCase());
}

export function useInteractionPrimitiveContext(): InteractionContextValue {
  const value = useContext(InteractionContext);
  if (!value) {
    throw new Error(
      "Interaction primitives must be rendered inside <Interaction.Root>.",
    );
  }
  return value;
}

/**
 * Live draft value for the active interaction's card-target input, resolved
 * from the surrounding `<Interaction.Root>`. Returns the selected card-id array
 * for `selection: "many"` inputs and the single id for `selection: "one"`.
 * Returns `undefined` when there is no interaction context or no card-target
 * input (so it is safe to render outside a root). Reactive: `handle.values`
 * updates as the draft changes. Backs the card surface `slot.card.Value`.
 */
export function useResolvedCardTargetValue(): unknown {
  const context = useContext(InteractionContext);
  const descriptor = context?.descriptor;
  const handle = context?.handle;
  if (!descriptor || !handle) return undefined;
  const cardInput = descriptor.inputs.find(
    (input) =>
      isTargetDomain(input.domain) && input.domain.type === "cardTarget",
  );
  if (!cardInput) return undefined;
  return (handle.values as Record<string, unknown>)[cardInput.key];
}

function useInteractionDescriptor(interaction: string) {
  return useAuthoredPluginGameplayFrameSelector((frame) =>
    frame.availableInteractions.find(
      (descriptor) =>
        descriptor.interactionKey === interaction ||
        descriptor.interactionId === interaction,
    ),
  );
}

export interface InteractionRootProps<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  children: ReactNode;
  unavailable?: "render" | "hide";
}

function ResolvedInteractionRoot({
  interaction,
  descriptor,
  children,
}: {
  interaction: string;
  descriptor: InteractionDescriptor;
  children: ReactNode;
}) {
  const handle = useInteractionHandle(descriptor);
  const value = useMemo<InteractionContextValue>(
    () => ({ interaction, descriptor, handle }),
    [descriptor, handle, interaction],
  );
  const available = isInteractionAvailable(descriptor);
  const rootAttributes = createGameplayInteractionRootAttributes({
    scopeId: GAMEPLAY_BROWSER_SCOPE_ID,
    interactionKey: descriptor.interactionKey,
    interactionId: descriptor.interactionId,
    ...(descriptor.descriptorDigest !== undefined
      ? { descriptorDigest: descriptor.descriptorDigest }
      : {}),
    ...(descriptor.draftDigest !== undefined
      ? { draftDigest: descriptor.draftDigest }
      : {}),
    readiness: available
      ? handle.isReady
        ? "ready"
        : "blocked"
      : "unavailable",
  });
  return (
    <InteractionContext.Provider value={value}>
      {renderPrimitive("span", {
        ...rootAttributes,
        style: { display: "contents" },
        children,
      })}
    </InteractionContext.Provider>
  );
}

export function InteractionRoot<Interaction extends string = InteractionKey>({
  interaction,
  children,
  unavailable = "render",
}: InteractionRootProps<Interaction>) {
  const descriptor = useInteractionDescriptor(interaction);
  if (!descriptor) {
    if (unavailable === "hide") return null;
    return (
      <InteractionContext.Provider
        value={{
          interaction,
          descriptor: null,
          handle: null,
        }}
      >
        {children}
      </InteractionContext.Provider>
    );
  }
  if (!isInteractionAvailable(descriptor) && unavailable === "hide") {
    return null;
  }
  return (
    <ResolvedInteractionRoot interaction={interaction} descriptor={descriptor}>
      {children}
    </ResolvedInteractionRoot>
  );
}
