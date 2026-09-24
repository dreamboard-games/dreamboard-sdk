import { z } from "zod";
import { RuntimeJsonSchema } from "./runtime-json.js";

export const InteractionCommitPolicySchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual") }).strict(),
  z.object({ mode: z.literal("autoWhenReady") }).strict(),
]);

export const InputSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("single") }).strict(),
  z
    .object({
      mode: z.literal("many"),
      min: z.number().int(),
      max: z.number().int().optional(),
      distinct: z.boolean().optional(),
    })
    .strict(),
]);

export const InteractionChoiceOptionSchema = z
  .object({
    value: z.string().nullable(),
    label: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    description: z.string().optional(),
    disabled: z.boolean().optional(),
    disabledReason: z.string().optional(),
  })
  .strict();

const selection = { selection: InputSelectionSchema.optional() };
export const InputDomainSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("cardTarget"),
    projection: z.literal("resolved"),
    targetKind: z.literal("card"),
    zoneIds: z.array(z.string()),
    eligibleTargets: z.array(z.string()),
    ...selection,
  }),
  z.strictObject({
    type: z.literal("boardTarget"),
    projection: z.literal("resolved"),
    targetKind: z.enum(["edge", "vertex", "space", "tile"]),
    boardId: z.string(),
    valueKind: z.enum(["board-id", "player-board-space"]).optional(),
    eligibleTargets: z.array(z.string()),
    ...selection,
  }),
  z.strictObject({
    type: z.literal("resourceMap"),
    resources: z.array(
      z.strictObject({
        resourceId: z.string(),
        label: z.string().optional(),
        icon: z.string().optional(),
        min: z.number(),
        max: z.number(),
      }),
    ),
    ...selection,
  }),
  z.strictObject({
    type: z.literal("boundedNumber"),
    min: z.number(),
    max: z.number(),
    step: z.number().optional(),
    ...selection,
  }),
  z.strictObject({
    type: z.literal("choice"),
    choices: z.array(InteractionChoiceOptionSchema),
    ...selection,
  }),
  z.strictObject({
    type: z.literal("choiceList"),
    choices: z.array(
      InteractionChoiceOptionSchema.extend({ value: z.string() }),
    ),
    min: z.number().int().optional(),
    max: z.number().int().optional(),
    ...selection,
  }),
]);

export const InteractionInputDescriptorSchema = z
  .object({
    key: z.string().min(1),
    kind: z.enum([
      "form",
      "board-vertex",
      "board-edge",
      "board-tile",
      "board-space",
      "card",
      "rng",
    ]),
    domain: InputDomainSchema,
    defaultValue: RuntimeJsonSchema.optional(),
  })
  .strict();

export const InteractionAvailabilitySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("available") }).strict(),
  z.object({ status: z.literal("notYourTurn"), reason: z.string() }).strict(),
  z
    .object({
      status: z.literal("blocked"),
      reason: z.string(),
      code: z.string().optional(),
    })
    .strict(),
]);

const InteractionBaseSchema = z
  .object({
    phaseName: z.string().min(1),
    interactionKey: z.string().min(1),
    interactionId: z.string().min(1),
    label: z.string().min(1),
    help: z.string().optional(),
    zoneId: z.string().optional(),
    zoneIds: z.array(z.string()).optional(),
    commit: InteractionCommitPolicySchema,
    descriptorDigest: z.string().optional(),
    actorSeat: z.number().int().optional(),
    draftDigest: z.string().optional(),
    inputs: z.array(InteractionInputDescriptorSchema),
    step: z
      .object({
        index: z.number().int().nonnegative(),
        total: z.number().int().positive(),
        selected: z.record(z.string(), RuntimeJsonSchema),
        canCancel: z.boolean(),
      })
      .strict()
      .optional(),
    availability: InteractionAvailabilitySchema,
    reasons: z
      .array(
        z
          .object({
            ruleId: z.string(),
            errorCode: z.string(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const InteractionDescriptorSchema = InteractionBaseSchema.extend({
  kind: z.literal("action"),
}).strict();

export const ZoneInteractionRefsSchema = z.strictObject({
  cardIds: z.array(z.string()),
  cardViewsById: z.record(z.string(), z.string()),
  playableByCardId: z.record(z.string(), z.array(z.string())),
});

type DeepReadonly<T> = T extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
export type InputDomain = DeepReadonly<z.infer<typeof InputDomainSchema>>;
export type InputSelection = DeepReadonly<z.infer<typeof InputSelectionSchema>>;
export type InteractionCommitPolicy = z.infer<
  typeof InteractionCommitPolicySchema
>;
export type InteractionChoiceOption = DeepReadonly<
  z.infer<typeof InteractionChoiceOptionSchema>
>;
export type InteractionInputDescriptor = Readonly<
  Omit<z.infer<typeof InteractionInputDescriptorSchema>, "domain">
> & { readonly domain: InputDomain };
export type InteractionAvailability = DeepReadonly<
  z.infer<typeof InteractionAvailabilitySchema>
>;
type DescriptorData = z.infer<typeof InteractionDescriptorSchema>;
export type InteractionDescriptor = Readonly<
  Omit<DescriptorData, "inputs" | "step" | "zoneIds" | "reasons">
> & {
  readonly inputs: readonly InteractionInputDescriptor[];
  readonly zoneIds?: readonly string[];
  readonly reasons?: readonly Readonly<
    NonNullable<DescriptorData["reasons"]>[number]
  >[];
  readonly step?: Readonly<
    Omit<NonNullable<DescriptorData["step"]>, "selected">
  > & {
    readonly selected: Readonly<
      NonNullable<DescriptorData["step"]>["selected"]
    >;
  };
};
export type InteractionDiagnosticReason = NonNullable<
  InteractionDescriptor["reasons"]
>[number];
export type ZoneInteractionRefs = DeepReadonly<
  z.infer<typeof ZoneInteractionRefsSchema>
>;
