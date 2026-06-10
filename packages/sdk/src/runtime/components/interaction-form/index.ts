/**
 * Public surface of the interaction form module. Re-exports exactly the names
 * the original monolithic `../InteractionForm.tsx` exported.
 */
export {
  InteractionField,
  defaultFormInputs,
  hasDefaultInteractionFormFields,
  type InteractionFieldProps,
  type InteractionFieldRenderMap,
  type InteractionFieldRenderProps,
} from "./fields.js";
export type {
  InteractionButtonSlotProps,
  InteractionCardsSlotProps,
  InteractionInputRenderMap,
  InteractionInputSlot,
  InteractionOptionsSlotProps,
  InteractionSlotComponentProps,
  InteractionSubmitSlot,
  InteractionTargetSlotProps,
  InteractionValueSlotProps,
} from "./input-slot.js";
export {
  InteractionForm,
  type InteractionFormProps,
} from "./InteractionForm.js";
