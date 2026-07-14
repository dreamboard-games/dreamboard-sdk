import type { ReactElement, ReactNode } from "react";
import { useAuthoredPluginGameplayFrameSelector } from "../context/PluginGameplayFrameContext.js";
import type { PhaseKey } from "../ui-contract.js";

export type PhaseRouteMap<Phase extends string = PhaseKey> = {
  readonly [Key in Phase]: () => ReactNode;
};

export type PhaseFallback = ReactNode | ((phase: string | null) => ReactNode);

export interface PhaseSwitchProps<Phase extends string = PhaseKey> {
  routes: PhaseRouteMap<Phase>;
  fallback?: PhaseFallback;
}

function hasRoute<Phase extends string>(
  routes: PhaseRouteMap<Phase>,
  phase: string,
): phase is Phase {
  return Object.prototype.hasOwnProperty.call(routes, phase);
}

function renderFallback(
  fallback: PhaseFallback | undefined,
  phase: string | null,
): ReactNode {
  return typeof fallback === "function" ? fallback(phase) : (fallback ?? null);
}

export function PhaseSwitch<Phase extends string = PhaseKey>({
  routes,
  fallback,
}: PhaseSwitchProps<Phase>): ReactElement | null {
  const phase = useAuthoredPluginGameplayFrameSelector(
    (frame) => frame.flow.currentPhase,
  );
  if (phase && hasRoute(routes, phase)) {
    return <>{routes[phase]()}</>;
  }
  return <>{renderFallback(fallback, phase)}</>;
}

export const Phase = {
  Switch: PhaseSwitch,
};
