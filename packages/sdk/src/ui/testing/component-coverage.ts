export type ComponentCapability =
  | "click"
  | "keyboard"
  | "pointer-drag"
  | "touch-drag"
  | "responsive-layout"
  | "runtime-draft"
  | "runtime-submit";

export interface ComponentCoverage {
  exportName: string;
  owner: string;
  storyIds: readonly string[];
  requiredCapabilities: readonly ComponentCapability[];
  workbenchScenarioIds: readonly string[];
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
  "PrimaryActionButton",
  "PrimaryButton",
  "Select",
  "SlotSystem",
  "StagingZone",
  "ThemedButton",
] as const;

export const COMPONENT_COVERAGE: readonly ComponentCoverage[] = [
  {
    exportName: "ActionButton",
    owner: "sdk-ui",
    storyIds: ["buttons--action-button-states", "panels--compact-panel"],
    requiredCapabilities: ["click", "keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "ActionPanel",
    owner: "sdk-ui",
    storyIds: ["panels--compact-panel", "panels--focus-order"],
    requiredCapabilities: ["click", "keyboard", "responsive-layout"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "CardDragSurface",
    owner: "sdk-ui",
    storyIds: [
      "hands-handview--drag-to-target-surface-layout",
      "hands-handview--drag-to-target-pointer-drop",
    ],
    requiredCapabilities: ["pointer-drag", "touch-drag", "keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "CardDropTargetView",
    owner: "sdk-ui",
    storyIds: [
      "hands-handview--drag-to-target-surface-layout",
      "hands-handview--drag-to-target-keyboard-drop",
    ],
    requiredCapabilities: ["pointer-drag", "keyboard", "runtime-draft"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "CardFace",
    owner: "sdk-ui",
    storyIds: [
      "cards-cardface--default-content",
      "cards-cardface--interactive-controlled",
      "cards-cardface--state-attributes-present",
    ],
    requiredCapabilities: ["click", "keyboard", "responsive-layout"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "Dialog",
    owner: "sdk-ui",
    storyIds: ["panels--dialog-standard"],
    requiredCapabilities: ["click", "keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "Drawer",
    owner: "sdk-ui",
    storyIds: ["panels--mobile-bottom-sheet"],
    requiredCapabilities: [
      "click",
      "keyboard",
      "touch-drag",
      "responsive-layout",
    ],
    workbenchScenarioIds: [],
  },
  {
    exportName: "HandView",
    owner: "sdk-ui",
    storyIds: [
      "hands-handview--five-card-fan",
      "hands-handview--phone-portrait-thirteen",
      "hands-handview--tap-emits-activate",
      "hands-handview--keyboard-emits-activate",
      "hands-handview--drag-to-target-selection-staging",
    ],
    requiredCapabilities: [
      "click",
      "keyboard",
      "pointer-drag",
      "touch-drag",
      "responsive-layout",
      "runtime-draft",
      "runtime-submit",
    ],
    workbenchScenarioIds: [],
  },
  {
    exportName: "Input",
    owner: "sdk-ui",
    storyIds: ["panels--dialog-standard"],
    requiredCapabilities: ["keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "MoreActions",
    owner: "sdk-ui",
    storyIds: ["misc--toast-notifications"],
    requiredCapabilities: ["click", "keyboard", "responsive-layout"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "PrimaryActionButton",
    owner: "sdk-ui",
    storyIds: ["buttons--primary-action-dock"],
    requiredCapabilities: ["click", "keyboard", "runtime-submit"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "PrimaryButton",
    owner: "sdk-ui",
    storyIds: ["buttons--themed-variants"],
    requiredCapabilities: ["click", "keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "Select",
    owner: "sdk-ui",
    storyIds: ["panels--dialog-standard"],
    requiredCapabilities: ["click", "keyboard"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "SlotSystem",
    owner: "sdk-ui",
    storyIds: [
      "board-targets--eligible-targets",
      "board-targets--claimed-and-disabled",
    ],
    requiredCapabilities: ["click", "keyboard", "responsive-layout"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "StagingZone",
    owner: "sdk-ui",
    storyIds: ["hand-stagingzone--removes-on-click"],
    requiredCapabilities: ["click", "keyboard", "runtime-draft"],
    workbenchScenarioIds: [],
  },
  {
    exportName: "ThemedButton",
    owner: "sdk-ui",
    storyIds: [
      "buttons--themed-variants",
      "buttons--themed-button-invokes-on-click",
      "buttons--disabled-themed-button-does-not-invoke",
    ],
    requiredCapabilities: ["click", "keyboard"],
    workbenchScenarioIds: [],
  },
];
