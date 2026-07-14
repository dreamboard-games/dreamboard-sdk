import type { ReactNode } from "react";
import { usePendingInteractionKey } from "../../context/InteractionDraftContext.js";
import { useAuthoredPluginGameplayFrameSelector } from "../../context/PluginGameplayFrameContext.js";
import { useRuntimeContext } from "../../context/RuntimeContext.js";
import type { InteractionKey } from "../../ui-contract.js";
import type { InteractionDescriptor } from "../../types/plugin-state.js";
import type { RuntimeAPI } from "../../types/runtime-api.js";
import { isInteractionAvailable } from "../../utils/interaction-status.js";
import { InteractionRoot } from "./context.js";

export interface InteractionSwitchRenderState<
  Interaction extends string = InteractionKey,
> {
  interaction: Interaction;
  descriptor: InteractionDescriptor<Interaction>;
}

export type InteractionSwitchRouteMap<
  Interaction extends string = InteractionKey,
> = {
  [Key in Interaction]?: (
    state: InteractionSwitchRenderState<Key>,
  ) => ReactNode;
};

export interface InteractionRoute {
  readonly collect: Record<string, unknown>;
}

export type InteractionRoutesMap<Interaction extends string = InteractionKey> =
  {
    [Key in Interaction]: InteractionRoute;
  };

export interface InteractionSwitchProps<
  Interaction extends string = InteractionKey,
> {
  interaction?: Interaction;
  routes: InteractionSwitchRouteMap<Interaction>;
  fallback?: ReactNode;
}

export function InteractionSwitch<Interaction extends string = InteractionKey>({
  interaction,
  routes,
  fallback = null,
}: InteractionSwitchProps<Interaction>) {
  const pendingInteractionKey = usePendingInteractionKey();
  const descriptors = useAuthoredPluginGameplayFrameSelector(
    (frame) => frame.availableInteractions,
  );
  const routedInteraction = interaction ?? pendingInteractionKey;
  const descriptor = routedInteraction
    ? descriptors.find(
        (candidate) => candidate.interactionKey === routedInteraction,
      )
    : undefined;
  if (!descriptor) return <>{fallback}</>;
  const route =
    routes[descriptor.interactionKey as keyof typeof routes] ?? null;
  if (!route) return <>{fallback}</>;
  const typedInteraction = descriptor.interactionKey as Interaction;
  return (
    <InteractionRoot interaction={typedInteraction}>
      {route({
        interaction: typedInteraction,
        descriptor: descriptor as InteractionDescriptor<Interaction>,
      })}
    </InteractionRoot>
  );
}

export interface InteractionRoutesProps<
  Interaction extends string = InteractionKey,
> {
  routes: InteractionRoutesMap<Interaction>;
  fallback?: ReactNode;
  includeUnavailable?: boolean | null;
}

const warnedInteractionRouteIssues = new Set<string>();

function warnInteractionRouteIssue(message: string, runtime?: RuntimeAPI) {
  if (warnedInteractionRouteIssues.has(message)) return;
  warnedInteractionRouteIssues.add(message);
  if (runtime?.emitDiagnostic) {
    runtime.emitDiagnostic({ type: "runtimeLog", level: "warn", message });
  } else {
    console.warn(message);
  }
}

export function InteractionRoutes<Interaction extends string = InteractionKey>({
  routes,
  fallback = null,
  includeUnavailable = false,
}: InteractionRoutesProps<Interaction>) {
  const runtime = useRuntimeContext() as RuntimeAPI;
  const descriptors = useAuthoredPluginGameplayFrameSelector(
    (frame) => frame.availableInteractions,
  );
  if (descriptors.length === 0) return <>{fallback}</>;
  const routedDescriptors = descriptors
    .filter(
      (descriptor) => includeUnavailable || isInteractionAvailable(descriptor),
    )
    .map((descriptor) => {
      const interaction = descriptor.interactionKey as Interaction;
      const route = routes[interaction as keyof typeof routes];
      if (!route) {
        warnInteractionRouteIssue(
          `[dreamboard] Interaction.Routes is missing a collector route for "${descriptor.interactionKey}". Declare the interaction in routes so input collection stays explicit.`,
          runtime,
        );
        return null;
      }
      const missingInputs = descriptor.inputs
        .map((input) => input.key)
        .filter((input) => !(input in route.collect));
      if (missingInputs.length > 0) {
        warnInteractionRouteIssue(
          `[dreamboard] Interaction.Routes route "${descriptor.interactionKey}" is missing collectors for: ${missingInputs.join(
            ", ",
          )}.`,
          runtime,
        );
      }
      return descriptor;
    });
  if (routedDescriptors.length === 0) return <>{fallback}</>;
  return null;
}
