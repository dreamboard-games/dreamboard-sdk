export type UIContractKind = "component" | "primitive" | "runtime";

export type UIContractCapability =
  | "click"
  | "keyboard"
  | "pointer-drag"
  | "touch-drag"
  | "responsive-layout"
  | "runtime-draft"
  | "runtime-submit";

export interface UIContractDefinition {
  readonly id: string;
  readonly kind: UIContractKind;
  readonly owner: string;
  readonly sourceFiles: readonly string[];
  readonly storyIds?: readonly string[];
  readonly requiredCapabilities?: readonly UIContractCapability[];
  readonly publicExport?: string;
}

export function defineUIContract<const TContract extends UIContractDefinition>(
  contract: TContract,
): Readonly<TContract> {
  return Object.freeze(contract);
}
