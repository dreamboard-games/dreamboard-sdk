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
 * Builds the surface-spec resolvers for one workspace contract. Note:
 * `resolveSurfaceDescriptor` deliberately calls `useInteractionFormSurface`
 * (and the other `use*` surface hooks) conditionally — this mirrors the
 * original single-file implementation exactly; do not "fix" the hook call
 * positions.
 */
export function createSurfaceResolvers({
  Board,
  Zone,
  useInteractionFormSurface,
}: SurfaceResolverDeps) {
  function resolveSurfaceDescriptor(
    name: string,
    descriptor: WorkspaceSurfaceDescriptor,
  ): unknown {
    switch (descriptor.kind) {
      case "board":
        return Board.useSurface(name);
      case "hand":
        return Zone.useHand(name, {
          zone: descriptor.zone,
          role: descriptor.role,
          label: descriptor.label,
          order: descriptor.order,
        });
      case "pile":
        return Zone.usePile(name, { zone: descriptor.zone });
      case "piles":
        return Object.fromEntries(
          descriptor.zones.map((zone) => [
            zone,
            Zone.usePile(String(zone), { zone }),
          ]),
        );
      case "cardCollection":
        return Zone.useCardCollection(name, {
          zones: descriptor.zones,
          mode: descriptor.mode,
        });
      case "form":
        return useInteractionFormSurface(descriptor.interaction);
      case "forms":
        return Object.fromEntries(
          Object.entries(descriptor.interactions).map(([key, interaction]) => [
            key,
            useInteractionFormSurface(interaction),
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
