export {
  type ClientParamSchema,
  type ClientParamSchemaMap,
} from "./context/ClientParamSchemaContext.js";

export type { GameplaySnapshot } from "./types/plugin-state.js";
export type {
  InteractionDescriptor,
  ZoneHandlesSnapshot,
} from "./types/plugin-state.js";
export type { Player } from "./hooks/useMe.js";
export type { SeatInbox } from "./hooks/useSeatInbox.js";
export type {
  DraftValidation,
  InteractionHandle,
  InteractionHandleStatus,
  InteractionParamsShape,
} from "./hooks/useInteractionHandle.js";
export type { CardCollection, ViewCard } from "../shared/domain/cards.js";
export type { ViewSlotOccupant } from "../shared/domain/slots.js";
