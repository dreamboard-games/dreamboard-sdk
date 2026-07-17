import { expect, test } from "vitest";
import {
  dropTargetVisualStateDataAttributes,
  visualStateDataAttributes,
  type CardDropTargetVisualState,
  type CardIntent,
  type InteractionVisualState,
  type TargetIntent,
} from "./visual-state.js";

test("visualStateDataAttributes emits stable data-* keys for true flags only", () => {
  const attrs = visualStateDataAttributes({
    eligible: true,
    distinctlyEligible: false,
    selected: false,
    disabled: true,
    invalid: undefined,
    submitted: false,
    previewing: true,
  });

  expect(attrs["data-eligible"]).toBe("true");
  expect(attrs["data-disabled"]).toBe("true");
  expect(attrs["data-previewing"]).toBe("true");
  expect(attrs["data-selected"]).toBeUndefined();
  expect(attrs["data-distinctly-eligible"]).toBeUndefined();
  expect(attrs["data-invalid"]).toBeUndefined();
  expect(attrs["data-submitted"]).toBeUndefined();
  expect(
    visualStateDataAttributes({ distinctlyEligible: true })[
      "data-distinctly-eligible"
    ],
  ).toBe("true");
});

test("visualStateDataAttributes clamps intentProgress to [0,1] and stringifies it", () => {
  expect(
    visualStateDataAttributes({ intentProgress: 0.4 })["data-intent-progress"],
  ).toBe("0.4");
  expect(
    visualStateDataAttributes({ intentProgress: -1 })["data-intent-progress"],
  ).toBe("0");
  expect(
    visualStateDataAttributes({ intentProgress: 5 })["data-intent-progress"],
  ).toBe("1");
  expect(visualStateDataAttributes({})["data-intent-progress"]).toBeUndefined();
});

test("visualStateDataAttributes is empty for missing input", () => {
  expect(visualStateDataAttributes(undefined)).toEqual({});
});

test("InteractionVisualState is structurally controlled-only", () => {
  const state: InteractionVisualState = {
    eligible: true,
    selected: false,
    disabled: false,
    invalid: false,
    submitted: false,
    previewing: false,
    intentProgress: 0.5,
  };
  void state;
});

test("CardIntent enumerates the supported sources", () => {
  const intents: CardIntent[] = [
    { type: "activate", cardId: "c1", source: "tap" },
    { type: "activate", cardId: "c1", source: "keyboard" },
    { type: "previewStart", cardId: "c1" },
    { type: "previewEnd", cardId: "c1" },
    { type: "drop", cardId: "c1", targetId: "t1", source: "pointer" },
    { type: "drop", cardId: "c1", targetId: "t1", source: "keyboard" },
  ];
  expect(intents).toHaveLength(6);
});

test("TargetIntent enumerates the supported sources", () => {
  const intents: TargetIntent[] = [
    { type: "activate", targetId: "t1", source: "tap" },
    { type: "activate", targetId: "t1", source: "keyboard" },
    { type: "previewStart", targetId: "t1" },
    { type: "previewEnd", targetId: "t1" },
  ];
  expect(intents).toHaveLength(4);
});

test("dropTargetVisualStateDataAttributes adds drag-active and drag-over flags", () => {
  const state: CardDropTargetVisualState = {
    eligible: true,
    active: true,
    over: true,
  };
  const attrs = dropTargetVisualStateDataAttributes(state);
  expect(attrs["data-eligible"]).toBe("true");
  expect(attrs["data-drag-active"]).toBe("true");
  expect(attrs["data-drag-over"]).toBe("true");
});

test("dropTargetVisualStateDataAttributes omits drag flags when not set", () => {
  const attrs = dropTargetVisualStateDataAttributes({ eligible: true });
  expect(attrs["data-drag-active"]).toBeUndefined();
  expect(attrs["data-drag-over"]).toBeUndefined();
});
