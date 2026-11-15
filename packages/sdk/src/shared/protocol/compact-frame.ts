import * as z from "zod";
import {
  InteractionDescriptorSchema,
  ZoneInteractionRefsSchema,
} from "../interaction-schema.js";
import type { ZoneInteractionRefs } from "../interaction-schema.js";
import type { InteractionDescriptor, PluginGameplayFrame } from "./frame.js";
import { PluginGameplayFrameSchema } from "./schema.js";

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

export const CompactGameplayFrameSchema = PluginGameplayFrameSchema.omit({
  availableInteractions: true,
  zones: true,
})
  .extend({
    interactionsByRef: z.record(z.string(), InteractionDescriptorSchema),
    availableInteractionRefs: z.array(z.string()),
    zones: z.record(
      z.string(),
      z.record(z.string(), ZoneInteractionRefsSchema),
    ),
  })
  .superRefine((frame, context) => {
    const reachable = new Set<string>();
    visitInteractionRefs(frame, (ref, path) => {
      reachable.add(ref);
      if (!Object.hasOwn(frame.interactionsByRef, ref)) {
        context.addIssue({
          code: "custom",
          path,
          message: `Missing interaction reference '${ref}'.`,
        });
      }
    });
    for (const ref of Object.keys(frame.interactionsByRef)) {
      if (!reachable.has(ref)) {
        context.addIssue({
          code: "custom",
          path: ["interactionsByRef", ref],
          message: `Unused interaction reference '${ref}'.`,
        });
      }
    }
  }) satisfies z.ZodType<CompactGameplayFrame>;

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
