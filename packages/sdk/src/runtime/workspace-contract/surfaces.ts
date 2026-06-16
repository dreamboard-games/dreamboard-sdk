import type {
  WorkspaceHandOptions,
  WorkspaceSurfaceDescriptor,
  WorkspaceSurfaceSpec,
} from "./types.js";

interface SurfaceResolverDeps {
  readonly Board: {
    useSurface(name: string): unknown;
  };
  readonly Zone: {
    useHand(name: string, zoneOptions: WorkspaceHandOptions): unknown;
    usePile(name: string, zoneOptions: { zone: string }): unknown;
    useCardCollection(
      name: string,
      zoneOptions: { zones: readonly string[]; mode?: "all" | "top-card" },
    ): unknown;
  };
  readonly useInteractionFormSurface: (interaction: string) => unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSurfaceDescriptor(
  value: unknown,
): value is WorkspaceSurfaceDescriptor {
  return (
    isPlainObject(value) &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

/**
 * Builds the surface-spec resolvers for one workspace contract.
 */
export function createSurfaceResolvers({
  Board,
  Zone,
  useInteractionFormSurface,
}: SurfaceResolverDeps) {
  const boardSurface = Board.useSurface;
  const zoneHandSurface = Zone.useHand;
  const zonePileSurface = Zone.usePile;
  const zoneCardCollectionSurface = Zone.useCardCollection;
  const interactionFormSurface = useInteractionFormSurface;

  function resolveSurfaceDescriptor(
    name: string,
    descriptor: WorkspaceSurfaceDescriptor,
  ): unknown {
    switch (descriptor.kind) {
      case "board":
        return boardSurface(name);
      case "hand":
        return zoneHandSurface(name, {
          zone: descriptor.zone,
          role: descriptor.role,
          label: descriptor.label,
          order: descriptor.order,
        });
      case "pile":
        return zonePileSurface(name, { zone: descriptor.zone });
      case "piles":
        return Object.fromEntries(
          descriptor.zones.map((zone) => [
            zone,
            zonePileSurface(String(zone), { zone }),
          ]),
        );
      case "cardCollection":
        return zoneCardCollectionSurface(name, {
          zones: descriptor.zones,
          mode: descriptor.mode,
        });
      case "form":
        return interactionFormSurface(descriptor.interaction);
      case "forms":
        return Object.fromEntries(
          Object.entries(descriptor.interactions).map(([key, interaction]) => [
            key,
            interactionFormSurface(interaction),
          ]),
        );
    }
  }

  function resolveSurfaceSpec(spec: WorkspaceSurfaceSpec): unknown {
    return Object.fromEntries(
      Object.entries(spec).map(([key, value]) => [
        key,
        isSurfaceDescriptor(value)
          ? resolveSurfaceDescriptor(key, value)
          : resolveSurfaceSpec(value as WorkspaceSurfaceSpec),
      ]),
    );
  }

  function defineSurfaces<const Spec extends WorkspaceSurfaceSpec>(spec: Spec) {
    return function useDefinedSurfaces() {
      return resolveSurfaceSpec(spec);
    };
  }

  return { defineSurfaces, resolveSurfaceSpec, resolveSurfaceDescriptor };
}
