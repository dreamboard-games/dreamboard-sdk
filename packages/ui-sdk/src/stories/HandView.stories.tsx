import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useMemo, useState } from "react";
import { CardFace } from "../components/Card.js";
import { HandView, type HandViewProps } from "../components/HandView.js";
import {
  CardDragSurface,
  CardDropTargetView,
} from "../components/CardDragSurface.js";
import type { ViewCard } from "@dreamboard-games/sdk-types";
import type {
  CardIntent,
  InteractionVisualState,
} from "../types/visual-state.js";

function makeCards(count: number): ViewCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i}`,
    cardType: "spell",
    name: `Card ${i + 1}`,
    properties: {
      title: `Card ${i + 1}`,
      subtitle: ["Spell", "Action", "Beast", "Artifact"][i % 4]!,
      effect: "Sample effect text for layout.",
      cost: `${(i % 5) + 1}`,
    },
  }));
}

interface RenderProps extends Partial<HandViewProps> {
  cardCount?: number;
}

function HandStage({
  cardCount = 5,
  layout = "fan",
  cardSize = "md",
  stateForCard,
  onCardIntent,
  ...rest
}: RenderProps) {
  const cards = useMemo(() => makeCards(cardCount), [cardCount]);
  return (
    <div
      className="sb-stage"
      style={{
        background: "var(--db-surface-app, #fff)",
        minHeight: 320,
      }}
    >
      <HandView
        cards={cards}
        layout={layout}
        cardSize={cardSize}
        stateForCard={stateForCard}
        onCardIntent={onCardIntent}
        renderCard={(card, state) => (
          <CardFace card={card} {...state} size={cardSize} />
        )}
        {...rest}
      />
    </div>
  );
}

const meta: Meta<typeof HandStage> = {
  title: "Hands/HandView",
  component: HandStage,
};
export default meta;

type Story = StoryObj<typeof HandStage>;

export const Empty: Story = {
  args: { cardCount: 0 },
  render: (args) => (
    <HandStage
      {...args}
      renderEmpty={() => <span data-testid="empty">No cards in hand</span>}
    />
  ),
};

export const SingleCard: Story = { args: { cardCount: 1 } };

export const FiveCardFan: Story = { args: { cardCount: 5, layout: "fan" } };

export const ThirteenCardFanDesktop: Story = {
  args: { cardCount: 13, layout: "fan", cardSize: "md" },
  globals: { viewport: { value: "desktop" } },
};

export const ThirteenCardCompressedFan: Story = {
  name: "Thirteen card fan — compressed",
  args: { cardCount: 13, layout: "compressed-fan", cardSize: "sm" },
};

export const StripLayout: Story = { args: { cardCount: 5, layout: "strip" } };

export const StackLayout: Story = { args: { cardCount: 5, layout: "stack" } };

export const TrayLayout: Story = {
  name: "Tray (mobile)",
  args: { cardCount: 5, layout: "tray", cardSize: "sm" },
  globals: { viewport: { value: "phonePortrait" } },
};

export const PhonePortraitThirteen: Story = {
  name: "Phone portrait — 13 cards",
  args: {
    cardCount: 13,
    layout: { desktop: "fan", mobile: "tray" },
    cardSize: "sm",
  },
  globals: { viewport: { value: "phonePortrait" } },
};

export const SelectedMany: Story = {
  name: "Multi-select state",
  args: { cardCount: 5, layout: "fan" },
  render: (args) => {
    const states: Record<string, InteractionVisualState> = {
      c0: { selected: true },
      c1: { selected: true },
      c2: { eligible: true },
      c3: { eligible: true },
      c4: { disabled: true },
    };
    return <HandStage {...args} stateForCard={(card) => states[card.id]} />;
  },
};

export const InteractiveControlled: Story = {
  name: "Controlled selection (no runtime)",
  parameters: {
    docs: {
      description: {
        story:
          "Story-local state tracks the last emitted CardIntent and renders a selected/eligible visualization without any Dreamboard runtime adapter.",
      },
    },
  },
  render: () => {
    const cards = useMemo(() => makeCards(5), []);
    const [selected, setSelected] = useState<string | null>(null);
    const [lastIntent, setLastIntent] = useState<CardIntent | null>(null);
    return (
      <div className="sb-stage">
        <HandView
          cards={cards}
          layout="fan"
          stateForCard={(card) => ({
            eligible: !selected || card.id === selected,
            selected: card.id === selected,
          })}
          onCardIntent={(intent) => {
            setLastIntent(intent);
            if (intent.type === "activate") {
              setSelected((cur) =>
                cur === intent.cardId ? null : intent.cardId,
              );
            }
          }}
          renderCard={(card, state) => <CardFace card={card} {...state} />}
        />
        <pre data-testid="last-intent" style={{ fontSize: 12 }}>
          {lastIntent ? JSON.stringify(lastIntent) : "—"}
        </pre>
      </div>
    );
  },
};

export const ConvergesUnderCenteringParent: Story = {
  name: "Fan width converges under a centering parent",
  parameters: {
    docs: {
      description: {
        story:
          "Regression guard for the ResizeObserver fan-width loop. A 13-card fan inside a content-sized centering column — wrapped the recommended way, in a definite full-width element — must settle to a single width instead of oscillating as the measured width chases the layout it produces.",
      },
    },
  },
  render: () => {
    const cards = useMemo(() => makeCards(13), []);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 720,
        }}
      >
        {/* A definite full-width wrapper so the fan cannot shrink-wrap its
            centering parent to its own measured width (the loop trigger). */}
        <div style={{ width: "100%", minWidth: 0 }}>
          <HandView
            cards={cards}
            layout="fan"
            cardSize="sm"
            stateForCard={() => ({ eligible: true })}
            renderCard={(card, state) => (
              <CardFace card={card} {...state} size="sm" />
            )}
          />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>(
      '[data-dreamboard-hand-view] [role="row"]',
    );
    expect(row).not.toBeNull();
    const samples: number[] = [];
    for (let i = 0; i < 6; i++) {
      samples.push(Math.round(row!.getBoundingClientRect().width));
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(null)),
      );
    }
    // A single distinct width across frames means the layout settled; multiple
    // values would mean the measure→layout→measure feedback loop is back.
    const distinct = [...new Set(samples)];
    expect(distinct).toHaveLength(1);
    expect(distinct[0]).toBeGreaterThan(0);
  },
};

// ---------------------------------------------------------------------------
// Interaction tests — verify generic UI intent without `ui-runtime`.
// Each `play` function exercises one behavior named in the phase 4 plan.
// ---------------------------------------------------------------------------

interface IntentTestStoryProps {
  cardCount: number;
  layout: HandViewProps["layout"];
  cardSize?: HandViewProps["cardSize"];
  stateForCard?: HandViewProps["stateForCard"];
  onIntent: (intent: CardIntent) => void;
}

function IntentTestHand({
  cardCount,
  layout,
  cardSize = "md",
  stateForCard = () => ({ eligible: true }),
  onIntent,
}: IntentTestStoryProps) {
  const cards = useMemo(() => makeCards(cardCount), [cardCount]);
  return (
    <HandView
      cards={cards}
      layout={layout}
      cardSize={cardSize}
      stateForCard={stateForCard}
      onCardIntent={onIntent}
      renderCard={(card, state) => (
        <CardFace card={card} {...state} size={cardSize} />
      )}
    />
  );
}

type TestStory = StoryObj<typeof IntentTestHand>;

function findActivate(intents: CardIntent[]): CardIntent | undefined {
  return intents.find((intent) => intent.type === "activate");
}

function intentsFromMock(mock: ReturnType<typeof fn>): CardIntent[] {
  return mock.mock.calls.map((call) => call[0] as CardIntent);
}

export const TapEmitsActivate: TestStory = {
  name: "Tap emits one activate intent",
  args: { cardCount: 3, layout: "fan", onIntent: fn() },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    await userEvent.click(cells[0]!);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const activates = intents.filter((intent) => intent.type === "activate");
    expect(activates).toHaveLength(1);
    expect(activates[0]).toMatchObject({ type: "activate", source: "tap" });
  },
};

export const KeyboardEmitsActivate: TestStory = {
  name: "Keyboard emits one activate intent",
  args: { cardCount: 3, layout: "strip", onIntent: fn() },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    cells[0]!.focus();
    await userEvent.keyboard("{Enter}");
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const activates = intents.filter((intent) => intent.type === "activate");
    expect(activates).toHaveLength(1);
    expect(activates[0]).toMatchObject({
      type: "activate",
      source: "keyboard",
    });
  },
};

export const KeyboardSpaceAlsoActivates: TestStory = {
  name: "Keyboard space activates",
  args: { cardCount: 3, layout: "strip", onIntent: fn() },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    cells[1]!.focus();
    await userEvent.keyboard(" ");
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const activate = findActivate(intents);
    expect(activate).toMatchObject({ type: "activate", source: "keyboard" });
  },
};

export const DisabledCardSwallowsActivate: TestStory = {
  name: "Disabled card emits no activation",
  args: {
    cardCount: 3,
    layout: "strip",
    onIntent: fn(),
    stateForCard: () => ({ disabled: true }),
  },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    await userEvent.click(cells[0]!);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "activate")).toHaveLength(
      0,
    );
  },
};

export const TrayOpenCloseAccessibility: Story = {
  name: "Tray accessibility — region label",
  args: { cardCount: 5, layout: "tray" },
  globals: { viewport: { value: "phonePortrait" } },
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
    expect(region).toBeTruthy();
    expect(region?.getAttribute("data-mode")).toBe("tray");
    expect(region?.getAttribute("aria-label")).toMatch(/5 cards/);
  },
};

function dispatchPointer(
  el: HTMLElement,
  type: string,
  coords: { clientX: number; clientY: number },
  pointerId = 1,
): void {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId,
      pointerType: "touch",
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: coords.clientX,
      clientY: coords.clientY,
    }),
  );
}

export const LongPressPreviewIntent: TestStory = {
  name: "Long-press preview emits previewStart",
  args: { cardCount: 3, layout: "fan", onIntent: fn() },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getAllByRole("gridcell")[0]!;
    const rect = cell.getBoundingClientRect();
    const center = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    dispatchPointer(cell, "pointerdown", center);
    await new Promise((resolve) => setTimeout(resolve, 280));
    dispatchPointer(cell, "pointerup", center);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(
      intents.find((intent) => intent.type === "previewStart"),
    ).toBeTruthy();
    expect(intents.find((intent) => intent.type === "previewEnd")).toBeTruthy();
    expect(
      intents.find((intent) => intent.type === "activate"),
    ).toBeUndefined();
  },
};

export const HorizontalBrowseNoActivation: TestStory = {
  name: "Horizontal browse never activates",
  args: {
    cardCount: 13,
    layout: { desktop: "fan", mobile: "tray" },
    cardSize: "sm",
    onIntent: fn(),
  },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cell = canvas.getAllByRole("gridcell")[2]!;
    const rect = cell.getBoundingClientRect();
    const start = {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    dispatchPointer(cell, "pointerdown", start);
    dispatchPointer(cell, "pointermove", {
      clientX: start.clientX + 40,
      clientY: start.clientY + 2,
    });
    dispatchPointer(cell, "pointermove", {
      clientX: start.clientX + 90,
      clientY: start.clientY + 1,
    });
    dispatchPointer(cell, "pointerup", {
      clientX: start.clientX + 90,
      clientY: start.clientY + 1,
    });
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "activate")).toHaveLength(
      0,
    );
  },
};

function NarrowContainerHand({
  cardCount,
  width,
  onIntent,
}: {
  cardCount: number;
  width: number;
  onIntent: (intent: CardIntent) => void;
}) {
  const cards = useMemo(() => makeCards(cardCount), [cardCount]);
  return (
    <div
      data-testid="hand-wrapper"
      style={{
        width,
        background: "var(--db-surface-app, #fff)",
        padding: 8,
      }}
    >
      <HandView
        cards={cards}
        cardSize="sm"
        layout={{ desktop: "fan", mobile: "tray" }}
        onCardIntent={onIntent}
        stateForCard={() => ({ eligible: true })}
        renderCard={(card, state) => (
          <CardFace card={card} {...state} size="sm" />
        )}
      />
    </div>
  );
}

export const NarrowWidthFallsBackToTray: StoryObj<typeof NarrowContainerHand> =
  {
    name: "Narrow container falls back to tray",
    args: { cardCount: 13, width: 320, onIntent: fn() },
    render: (args) => <NarrowContainerHand {...args} />,
    play: async ({ canvasElement }) => {
      // ResizeObserver runs asynchronously; give the hook one frame to settle.
      await new Promise((resolve) => setTimeout(resolve, 60));
      const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
      expect(region).toBeTruthy();
      expect(region?.getAttribute("data-mode")).toBe("tray");
    },
  };

export const ComfortableWidthRendersFan: StoryObj<typeof NarrowContainerHand> =
  {
    name: "Comfortable container renders fan",
    args: { cardCount: 5, width: 720, onIntent: fn() },
    render: (args) => <NarrowContainerHand {...args} />,
    play: async ({ canvasElement }) => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
      expect(region).toBeTruthy();
      expect(region?.getAttribute("data-mode")).toBe("fan");
    },
  };

export const ReducedMotionLegibility: TestStory = {
  name: "Reduced motion — legibility",
  args: { cardCount: 5, layout: "fan", onIntent: fn() },
  parameters: { reducedMotion: "force" },
  globals: { reducedMotion: "force" },
  render: (args) => <IntentTestHand {...args} />,
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
    expect(region?.getAttribute("data-reduced-motion")).toBe("true");
    const cells = within(canvasElement).getAllByRole("gridcell");
    expect(cells.length).toBeGreaterThan(0);
  },
};

// ---------------------------------------------------------------------------
// Drag-to-target stories
// ---------------------------------------------------------------------------

interface DragTestStoryProps {
  cardCount: number;
  layout: HandViewProps["layout"];
  cardSize?: HandViewProps["cardSize"];
  onIntent: (intent: CardIntent) => void;
}

interface ExtendedDragStageProps extends DragTestStoryProps {
  /** Optional second target with controllable eligibility. */
  secondaryTargetEligible?: boolean;
  secondaryTargetLabel?: string;
  secondaryTargetId?: string;
  /** Pre-selected card ids; rendered with a `selected` visual state. */
  selectedCardIds?: readonly string[];
}

function DragTargetStage({
  cardCount,
  layout,
  cardSize = "sm",
  onIntent,
  secondaryTargetEligible,
  secondaryTargetLabel = "Discard pile",
  secondaryTargetId = "discard",
  selectedCardIds,
}: ExtendedDragStageProps) {
  const cards = useMemo(() => makeCards(cardCount), [cardCount]);
  const selectedSet = useMemo(
    () => new Set(selectedCardIds ?? []),
    [selectedCardIds],
  );
  return (
    <div
      className="sb-stage"
      style={{ background: "var(--db-surface-app, #fff)", minHeight: 480 }}
    >
      <CardDragSurface onCardIntent={onIntent}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: 16,
          }}
        >
          <CardDropTargetView
            targetId="selected-cards"
            label="Selected cards"
            order={1}
            state={{ eligible: true }}
            renderTarget={(state) => (
              <div
                data-testid="target-selected"
                style={{
                  border: state.over
                    ? "2px solid var(--db-accent, #4f46e5)"
                    : "2px dashed rgba(0,0,0,0.2)",
                  background: state.active
                    ? "rgba(79,70,229,0.08)"
                    : "transparent",
                  borderRadius: 12,
                  padding: 24,
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                {state.over ? "Drop to add" : "Drop card here"}
              </div>
            )}
          />
          {secondaryTargetEligible !== undefined ? (
            <CardDropTargetView
              targetId={secondaryTargetId}
              label={secondaryTargetLabel}
              order={2}
              state={{ eligible: secondaryTargetEligible }}
              renderTarget={(state) => (
                <div
                  data-testid="target-secondary"
                  style={{
                    border: state.over
                      ? "2px solid var(--db-accent, #4f46e5)"
                      : "2px dashed rgba(0,0,0,0.2)",
                    opacity: state.eligible === false ? 0.4 : 1,
                    background: state.active
                      ? "rgba(79,70,229,0.04)"
                      : "transparent",
                    borderRadius: 12,
                    padding: 16,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  {secondaryTargetLabel}
                  {state.eligible === false ? " (not allowed)" : ""}
                </div>
              )}
            />
          ) : null}
          <HandView
            cards={cards}
            layout={layout}
            cardSize={cardSize}
            mobileInteraction="drag-to-target"
            stateForCard={(card) => ({
              eligible: true,
              selected: selectedSet.has(card.id),
            })}
            onCardIntent={onIntent}
            renderCard={(card, state) => (
              <CardFace card={card} {...state} size={cardSize} />
            )}
          />
        </div>
      </CardDragSurface>
    </div>
  );
}

type DragTestStory = StoryObj<typeof DragTargetStage>;

export const DragToTargetSurfaceLayout: DragTestStory = {
  name: "Drag-to-target — surface layout",
  args: { cardCount: 4, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    expect(surface).toBeTruthy();
    const target = canvasElement.querySelector(
      "[data-dreamboard-card-drop-target]",
    );
    expect(target).toBeTruthy();
    const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
    expect(region?.getAttribute("data-mobile-interaction")).toBe(
      "drag-to-target",
    );
  },
};

export const DragToTargetTapInspects: DragTestStory = {
  name: "Drag-to-target — tap inspects without dropping",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    await userEvent.click(cells[0]!);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(
      intents.filter(
        (intent) => intent.type === "drop" || intent.type === "activate",
      ),
    ).toHaveLength(0);
  },
};

function dispatchKeyDown(el: HTMLElement, key: string): void {
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
    }),
  );
}

async function flush(): Promise<void> {
  // Yield a couple of macrotasks so React can commit any pending state
  // updates and effects scheduled by the most recent synthetic event.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(() => resolve(null))
      : setTimeout(resolve, 16),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForKeyboardFocusedTarget(
  canvasElement: HTMLElement,
): Promise<HTMLElement> {
  // Poll the entire document — the surface lives outside `canvasElement` for
  // some stage compositions, and the test runner resets focus between
  // assertions.
  for (let i = 0; i < 60; i++) {
    const root = (canvasElement.getRootNode() as Document) || document;
    const target =
      canvasElement.querySelector<HTMLElement>(
        "[data-dreamboard-card-drop-target][data-keyboard-focused='true']",
      ) ??
      root.querySelector<HTMLElement>(
        "[data-dreamboard-card-drop-target][data-keyboard-focused='true']",
      );
    if (target) return target;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("No keyboard-focused target appeared in time");
}

export const DragToTargetKeyboardDrop: DragTestStory = {
  name: "Drag-to-target — keyboard pickup and drop",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    // Wait for `CardDropTargetView` registration effects to commit. Without
    // this delay the surface registry can be empty when the keyboard
    // pickup fires.
    await flush();
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    await flush();
    const target = await waitForKeyboardFocusedTarget(canvasElement);
    dispatchKeyDown(target, "Enter");
    await flush();
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const drops = intents.filter((intent) => intent.type === "drop");
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({
      type: "drop",
      source: "keyboard",
      targetId: "selected-cards",
    });
  },
};

export const DragToTargetKeyboardEscapeCancels: DragTestStory = {
  name: "Drag-to-target — escape cancels keyboard pickup",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    await flush();
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole("gridcell");
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    const target = await waitForKeyboardFocusedTarget(canvasElement);
    dispatchKeyDown(target, "Escape");
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "drop")).toHaveLength(0);
  },
};

async function simulatePointerDrag(
  card: HTMLElement,
  target: HTMLElement,
  options: { release?: { clientX: number; clientY: number } } = {},
): Promise<void> {
  // Make sure the surface registry has captured target geometry before the
  // drag begins (storybook test runner may schedule the play function before
  // CardDropTargetView's mount effects flush in some React 19 builds).
  await flush();
  const cardRect = card.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const start = {
    clientX: cardRect.left + cardRect.width / 2,
    clientY: cardRect.top + cardRect.height / 2,
  };
  const release = options.release ?? {
    clientX: targetRect.left + targetRect.width / 2,
    clientY: targetRect.top + targetRect.height / 2,
  };
  // Issue raw pointer events directly. The Storybook test-runner exposes
  // a real Chromium DOM, but `userEvent.pointer` over touch requires
  // explicit `target:` on every move and is brittle for chained drags.
  const pointerId = 1;
  function fire(
    type: string,
    coords: { clientX: number; clientY: number },
    el: HTMLElement = card,
  ) {
    el.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId,
        pointerType: "touch",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
        clientX: coords.clientX,
        clientY: coords.clientY,
      }),
    );
  }
  fire("pointerdown", start);
  // Lift past the threshold, then move to release point.
  fire("pointermove", { clientX: start.clientX, clientY: start.clientY - 50 });
  fire("pointermove", { clientX: start.clientX, clientY: start.clientY - 90 });
  fire("pointermove", release);
  fire("pointerup", release);
  // Yield so React can flush the resulting state updates.
  await new Promise((resolve) => setTimeout(resolve, 30));
}

export const DragToTargetPointerDrop: DragTestStory = {
  name: "Drag-to-target — pointer drag emits one drop",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    const card =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']")[0]!;
    const target = canvasElement.querySelector<HTMLElement>(
      "[data-testid='target-selected']",
    )!;
    await simulatePointerDrag(card, target);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const drops = intents.filter((intent) => intent.type === "drop");
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({
      type: "drop",
      source: "pointer",
      targetId: "selected-cards",
    });
  },
};

export const DragToTargetPointerDropSingleEmission: DragTestStory = {
  name: "Drag-to-target — pointer drop emits exactly one intent",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    const card =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']")[0]!;
    const target = canvasElement.querySelector<HTMLElement>(
      "[data-testid='target-selected']",
    )!;
    await simulatePointerDrag(card, target);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(
      intents.filter(
        (intent) => intent.type === "drop" && intent.source === "pointer",
      ),
    ).toHaveLength(1);
    expect(intents.filter((intent) => intent.type === "activate")).toHaveLength(
      0,
    );
  },
};

export const DragToTargetPointerOutsideReturns: DragTestStory = {
  name: "Drag-to-target — release outside any target snaps back",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    const card =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']")[0]!;
    const target = canvasElement.querySelector<HTMLElement>(
      "[data-testid='target-selected']",
    )!;
    const cardRect = card.getBoundingClientRect();
    await simulatePointerDrag(card, target, {
      release: {
        // Release far away from any drop target.
        clientX: cardRect.left + cardRect.width / 2 + 400,
        clientY: cardRect.top + cardRect.height / 2 - 400,
      },
    });
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "drop")).toHaveLength(0);
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    // Surface drops out of dragging and into either returning or idle.
    expect(surface?.getAttribute("data-drag-phase")).not.toBe("dragging");
  },
};

export const DragToTargetTapShowsLift: DragTestStory = {
  name: "Drag-to-target — tap renders inspecting lift on the card",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement }) => {
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    await userEvent.click(cells[0]!);
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    expect(surface?.getAttribute("data-drag-phase")).toBe("inspecting");
    expect(cells[0]!.getAttribute("data-inspecting")).toBe("true");
  },
};

export const DragToTargetIneligibleTargetRejected: DragTestStory = {
  name: "Drag-to-target — ineligible target ignores pointer release",
  args: {
    cardCount: 3,
    layout: "tray",
    onIntent: fn(),
    secondaryTargetEligible: false,
    secondaryTargetLabel: "Discard pile",
    secondaryTargetId: "discard",
  },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    const card =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']")[0]!;
    const target = canvasElement.querySelector<HTMLElement>(
      "[data-testid='target-secondary']",
    )!;
    await simulatePointerDrag(card, target);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "drop")).toHaveLength(0);
  },
};

export const DragToTargetIneligibleTargetSkippedByKeyboard: DragTestStory = {
  name: "Drag-to-target — keyboard skips ineligible targets",
  args: {
    cardCount: 3,
    layout: "tray",
    onIntent: fn(),
    secondaryTargetEligible: false,
    secondaryTargetLabel: "Discard pile",
    secondaryTargetId: "discard",
  },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement, args }) => {
    await flush();
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    const target = await waitForKeyboardFocusedTarget(canvasElement);
    dispatchKeyDown(target, "Enter");
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    const drops = intents.filter((intent) => intent.type === "drop");
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({ targetId: "selected-cards" });
  },
};

export const DragToTargetTapWithoutTargetsHoldsInspect: DragTestStory = {
  name: "Drag-to-target — tap with no usable target stays in inspecting",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => (
    // Render a hand without any drop targets so `recordTap` cannot fall
    // back to direct activate. The card must remain non-committing.
    <div
      className="sb-stage"
      style={{ background: "var(--db-surface-app, #fff)", minHeight: 320 }}
    >
      <CardDragSurface onCardIntent={args.onIntent}>
        <HandView
          cards={makeCards(args.cardCount)}
          layout={args.layout}
          cardSize={args.cardSize ?? "sm"}
          mobileInteraction="drag-to-target"
          stateForCard={() => ({ eligible: true })}
          renderCard={(card, state) => (
            <CardFace card={card} {...state} size={args.cardSize ?? "sm"} />
          )}
        />
      </CardDragSurface>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    await userEvent.click(cells[0]!);
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "activate")).toHaveLength(
      0,
    );
    expect(intents.filter((intent) => intent.type === "drop")).toHaveLength(0);
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    expect(surface?.getAttribute("data-drag-phase")).toBe("inspecting");
  },
};

export const DragToTargetKeyboardWithoutTargetsHoldsInspect: DragTestStory = {
  name: "Drag-to-target — keyboard pickup with no targets stays in inspecting",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => (
    <div
      className="sb-stage"
      style={{ background: "var(--db-surface-app, #fff)", minHeight: 320 }}
    >
      <CardDragSurface onCardIntent={args.onIntent}>
        <HandView
          cards={makeCards(args.cardCount)}
          layout={args.layout}
          cardSize={args.cardSize ?? "sm"}
          mobileInteraction="drag-to-target"
          stateForCard={() => ({ eligible: true })}
          renderCard={(card, state) => (
            <CardFace card={card} {...state} size={args.cardSize ?? "sm"} />
          )}
        />
      </CardDragSurface>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    await new Promise((resolve) => setTimeout(resolve, 50));
    const intents = intentsFromMock(args.onIntent as ReturnType<typeof fn>);
    expect(intents.filter((intent) => intent.type === "activate")).toHaveLength(
      0,
    );
    expect(intents.filter((intent) => intent.type === "drop")).toHaveLength(0);
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    expect(surface?.getAttribute("data-drag-phase")).toBe("inspecting");
  },
};

export const DragToTargetSelectedManyStaging: DragTestStory = {
  name: "Drag-to-target — selected cards remain visually selected",
  args: {
    cardCount: 5,
    layout: "tray",
    onIntent: fn(),
    selectedCardIds: ["c0", "c2"],
  },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement }) => {
    const selected = canvasElement.querySelectorAll<HTMLElement>(
      "[data-selected='true']",
    );
    expect(selected.length).toBeGreaterThanOrEqual(2);
  },
};

export const DragToTargetKeyboardNoResidualLift: DragTestStory = {
  name: "Drag-to-target — phase returns to idle after keyboard drop",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement }) => {
    await flush();
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    const target = await waitForKeyboardFocusedTarget(canvasElement);
    dispatchKeyDown(target, "Enter");
    // Allow settle/exit animation (reducedMotion in story env or short).
    await new Promise((resolve) => setTimeout(resolve, 600));
    const surface = canvasElement.querySelector(
      "[data-dreamboard-card-drag-surface]",
    );
    expect(surface?.getAttribute("data-drag-phase")).toBe("idle");
    const liftedCards = canvasElement.querySelectorAll(
      "[role='gridcell'][data-lifted='true']",
    );
    expect(liftedCards.length).toBe(0);
  },
};

interface StagingStageProps {
  cardCount: number;
  initiallyStagedIds?: readonly string[];
  onIntent: (intent: CardIntent) => void;
}

function SelectionStagingStage({
  cardCount,
  initiallyStagedIds = [],
  onIntent,
}: StagingStageProps) {
  const cards = useMemo(() => makeCards(cardCount), [cardCount]);
  const [stagedIds, setStagedIds] =
    useState<readonly string[]>(initiallyStagedIds);
  const stagedSet = useMemo(() => new Set(stagedIds), [stagedIds]);
  const stagedCards = useMemo(
    () => cards.filter((card) => stagedSet.has(card.id)),
    [cards, stagedSet],
  );
  const handCards = useMemo(
    () => cards.filter((card) => !stagedSet.has(card.id)),
    [cards, stagedSet],
  );
  return (
    <div
      className="sb-stage"
      style={{
        background: "var(--db-surface-app, #fff)",
        minHeight: 520,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <CardDragSurface
        onCardIntent={(intent) => {
          onIntent(intent);
          if (intent.type === "drop" && intent.targetId === "selected-cards") {
            setStagedIds((cur) =>
              cur.includes(intent.cardId) ? cur : [...cur, intent.cardId],
            );
          }
        }}
      >
        <CardDropTargetView
          targetId="selected-cards"
          label="Selected cards"
          state={{ eligible: true }}
          renderTarget={(state) => (
            <div
              data-testid="staging-target"
              style={{
                border: state.over
                  ? "2px solid var(--db-accent, #4f46e5)"
                  : "2px dashed rgba(0,0,0,0.2)",
                background: state.active
                  ? "rgba(79,70,229,0.08)"
                  : "rgba(0,0,0,0.02)",
                borderRadius: 12,
                padding: 12,
                minHeight: 132,
                display: "flex",
                gap: 8,
                alignItems: "center",
                justifyContent:
                  stagedCards.length === 0 ? "center" : "flex-start",
                flexWrap: "wrap",
              }}
            >
              {stagedCards.length === 0 ? (
                <span
                  data-testid="staging-target-empty"
                  style={{ fontSize: 13, color: "rgba(0,0,0,0.5)" }}
                >
                  Drag a card here
                </span>
              ) : (
                stagedCards.map((card) => (
                  <div
                    key={card.id}
                    data-testid={`staged-card-${card.id}`}
                    data-staged="true"
                    style={{ flex: "0 0 auto" }}
                  >
                    <CardFace card={card} selected size="sm" />
                  </div>
                ))
              )}
            </div>
          )}
        />
        <HandView
          cards={handCards}
          layout="tray"
          cardSize="sm"
          mobileInteraction="drag-to-target"
          stateForCard={() => ({ eligible: true })}
          renderCard={(card, state) => (
            <CardFace card={card} {...state} size="sm" />
          )}
        />
      </CardDragSurface>
    </div>
  );
}

type StagingTestStory = StoryObj<typeof SelectionStagingStage>;

export const DragToTargetSelectionStaging: StagingTestStory = {
  name: "Drag-to-target — staged cards render inside the target",
  args: {
    cardCount: 5,
    initiallyStagedIds: ["c0", "c2"],
    onIntent: fn(),
  },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <SelectionStagingStage {...args} />,
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector<HTMLElement>(
      "[data-testid='staging-target']",
    )!;
    const stagedInTarget = target.querySelectorAll<HTMLElement>(
      "[data-staged='true']",
    );
    expect(stagedInTarget.length).toBe(2);
    // The same card ids must NOT appear in the hand region simultaneously.
    const hand = canvasElement.querySelector("[data-dreamboard-hand-view]");
    const handCells = hand?.querySelectorAll<HTMLElement>("[role='gridcell']");
    const handIds = Array.from(handCells ?? []).map((el) => el.id);
    expect(handIds.some((id) => id.includes("c0"))).toBe(false);
    expect(handIds.some((id) => id.includes("c2"))).toBe(false);
  },
};

export const DragToTargetSelectionStagingKeyboardCommit: StagingTestStory = {
  name: "Drag-to-target — keyboard drop adds card to staging target",
  args: { cardCount: 4, onIntent: fn() },
  globals: { viewport: { value: "phonePortrait" } },
  render: (args) => <SelectionStagingStage {...args} />,
  play: async ({ canvasElement }) => {
    await flush();
    const cells =
      canvasElement.querySelectorAll<HTMLElement>("[role='gridcell']");
    expect(cells.length).toBeGreaterThan(0);
    cells[0]!.focus();
    dispatchKeyDown(cells[0]!, "Enter");
    const target = await waitForKeyboardFocusedTarget(canvasElement);
    dispatchKeyDown(target, "Enter");
    await new Promise((resolve) => setTimeout(resolve, 600));
    const stagingTarget = canvasElement.querySelector<HTMLElement>(
      "[data-testid='staging-target']",
    )!;
    const staged = stagingTarget.querySelectorAll<HTMLElement>(
      "[data-staged='true']",
    );
    expect(staged.length).toBe(1);
  },
};

export const DragToTargetReducedMotion: DragTestStory = {
  name: "Drag-to-target — reduced motion legibility",
  args: { cardCount: 3, layout: "tray", onIntent: fn() },
  parameters: {
    reducedMotion: "force",
  },
  globals: {
    reducedMotion: "force",
    viewport: { value: "phonePortrait" },
  },
  render: (args) => <DragTargetStage {...args} />,
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector("[data-dreamboard-hand-view]");
    expect(region?.getAttribute("data-reduced-motion")).toBe("true");
  },
};
