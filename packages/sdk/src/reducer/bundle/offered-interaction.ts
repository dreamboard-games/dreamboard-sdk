import type {
  InputDomain,
  InteractionDescriptor,
  PluginGameplayFrame,
} from "../../shared/protocol/frame.js";

/** A seat may submit only interactions currently offered as available. */
export function offeredInteraction<Key extends string>(
  frame: Pick<
    PluginGameplayFrame<unknown, string, Key>,
    "availableInteractions"
  >,
  key: NoInfer<Key>,
) {
  return frame.availableInteractions.find(
    (descriptor) =>
      descriptor.interactionKey === key &&
      descriptor.availability.status === "available",
  );
}

/** Resolve a named input in the current step and narrow its projected domain. */
export function offeredInputDomain<Type extends InputDomain["type"]>(
  interaction: InteractionDescriptor | undefined,
  key: string,
  type: Type,
) {
  const domain = interaction?.inputs.find((input) => input.key === key)?.domain;
  return domain?.type === type
    ? (domain as Extract<InputDomain, { type: Type }>)
    : undefined;
}
