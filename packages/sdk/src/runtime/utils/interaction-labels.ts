import type { InteractionDescriptor } from "../types/plugin-state.js";

export function humanizeInteractionId(id: string): string {
  if (!id) return id;
  const withSpaces = id
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  if (!withSpaces) return id;
  return withSpaces
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function interactionLabel(
  descriptor: Pick<InteractionDescriptor, "interactionId" | "interactionKey">,
): string {
  return humanizeInteractionId(
    descriptor.interactionId || descriptor.interactionKey,
  );
}
