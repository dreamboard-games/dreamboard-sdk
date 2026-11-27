import type { ZoneInteractionRefs } from "../interaction-schema.js";
import type { InteractionDescriptor, PluginGameplayFrame } from "./frame.js";

/** Self-contained hosted snapshot. References are local to this frame. */
export type CompactGameplayFrame = Omit<
  PluginGameplayFrame,
  "availableInteractions" | "zones"
> & {
  readonly interactionsByRef: Readonly<Record<string, InteractionDescriptor>>;
  readonly availableInteractionRefs: readonly string[];
  readonly zones: Readonly<
    Record<string, Readonly<Record<string, ZoneInteractionRefs>>>
  >;
};

/** Traverses references without reparsing descriptors for every card. */
export function visitInteractionRefs(
  frame: Pick<CompactGameplayFrame, "availableInteractionRefs" | "zones">,
  visit: (ref: string, path: (string | number)[]) => void,
): void {
  frame.availableInteractionRefs.forEach((ref, index) =>
    visit(ref, ["availableInteractionRefs", index]),
  );
  for (const [zoneId, hosts] of Object.entries(frame.zones)) {
    for (const [hostId, zone] of Object.entries(hosts)) {
      for (const [cardId, refs] of Object.entries(zone.playableByCardId)) {
        refs.forEach((ref, index) =>
          visit(ref, [
            "zones",
            zoneId,
            hostId,
            "playableByCardId",
            cardId,
            index,
          ]),
        );
      }
    }
  }
}

/** Hydrates a schema-admitted frame, retaining the shared descriptor objects. */
export function hydrateCompactGameplayFrame(
  frame: CompactGameplayFrame,
): PluginGameplayFrame {
  const { interactionsByRef, availableInteractionRefs, zones, ...base } = frame;
  const hydrate = (refs: readonly string[]) =>
    refs.map((ref) => interactionsByRef[ref]);
  return {
    ...base,
    availableInteractions: hydrate(availableInteractionRefs),
    zones: Object.fromEntries(
      Object.entries(zones).map(([zoneId, hosts]) => [
        zoneId,
        Object.fromEntries(
          Object.entries(hosts).map(([hostId, zone]) => [
            hostId,
            {
              ...zone,
              playableByCardId: Object.fromEntries(
                Object.entries(zone.playableByCardId).map(([cardId, refs]) => [
                  cardId,
                  hydrate(refs),
                ]),
              ),
            },
          ]),
        ),
      ]),
    ),
  };
}
