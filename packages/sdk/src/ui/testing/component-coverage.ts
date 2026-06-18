import { UI_CONTRACTS, type UIContractCapability } from "./ui-contracts.js";

export type ComponentCapability = UIContractCapability;

export interface ComponentCoverage {
  exportName: string;
  owner: string;
  storyIds: readonly string[];
  requiredCapabilities: readonly ComponentCapability[];
}

export const EXPORTED_INTERACTIVE_COMPONENTS = [
  "ActionButton",
  "ActionPanel",
  "CardDragSurface",
  "CardDropTargetView",
  "CardFace",
  "Dialog",
  "Drawer",
  "HandView",
  "Input",
  "MoreActions",
  "Panel",
  "PrimaryActionButton",
  "PrimaryButton",
  "Select",
  "SlotSystem",
  "StagingZone",
  "ThemedButton",
] as const;

const interactiveExportSet = new Set<string>(EXPORTED_INTERACTIVE_COMPONENTS);

function publicExportFor(contract: (typeof UI_CONTRACTS)[number]) {
  return "publicExport" in contract ? contract.publicExport : undefined;
}

function storyIdsFor(contract: (typeof UI_CONTRACTS)[number]) {
  return "storyIds" in contract ? contract.storyIds : [];
}

export const COMPONENT_COVERAGE: readonly ComponentCoverage[] =
  UI_CONTRACTS.filter((contract) => {
    const publicExport = publicExportFor(contract);
    return Boolean(publicExport && interactiveExportSet.has(publicExport));
  }).map((contract) => ({
    exportName: publicExportFor(contract)!,
    owner: contract.owner,
    storyIds: storyIdsFor(contract),
    requiredCapabilities: contract.requiredCapabilities ?? [],
  }));
