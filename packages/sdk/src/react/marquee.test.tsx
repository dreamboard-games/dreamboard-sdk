import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useMarqueeSelection } from "./marquee.js";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

test("marquee selects intersecting cards, supports additive selection, and cancels without committing", async () => {
  const onSelect = vi.fn();
  const card = document.createElement("button");
  card.getBoundingClientRect = () => new DOMRect(20, 20, 20, 20);
  function Surface({ enabled = true }) {
    const marquee = useMarqueeSelection({
      enabled,
      getCards: () => [{ id: "red", element: card }],
      onSelect,
    });
    return (
      <div data-surface {...marquee.props}>
        <button>Card</button>
        <output>{JSON.stringify(marquee.bounds)}</output>
      </div>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(<Surface />));
  const surface = host.querySelector("[data-surface]")!;
  surface.getBoundingClientRect = () => new DOMRect(0, 0, 100, 100);
  const pointer = async (
    type: string,
    x: number,
    y: number,
    target: EventTarget = document,
    extras = {},
  ) => {
    await act(async () => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          button: 0,
          clientX: x,
          clientY: y,
          ...extras,
        }),
      );
    });
  };
  await pointer("pointerdown", 0, 0, surface, { shiftKey: true });
  await pointer("pointermove", 30, 30);
  expect(host.querySelector("output")!.textContent).toContain('"width":30');
  await pointer("pointerup", 30, 30);
  expect(onSelect).toHaveBeenLastCalledWith(["red"], true);
  await pointer("pointerdown", 0, 0, surface);
  await pointer("pointermove", 50, 50);
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  await pointer("pointerup", 50, 50);
  expect(onSelect).toHaveBeenCalledTimes(1);
  await pointer("pointerdown", 0, 0, surface.querySelector("button")!);
  await pointer("pointermove", 50, 50);
  await pointer("pointerup", 50, 50);
  expect(onSelect).toHaveBeenCalledTimes(1);
  await pointer("pointerdown", 0, 0, surface, { pointerType: "touch" });
  await pointer("pointerup", 0, 0);
  expect(onSelect).toHaveBeenCalledTimes(1);
  await pointer("pointerdown", 0, 0, surface);
  await pointer("pointerup", 2, 2);
  expect(onSelect).toHaveBeenLastCalledWith([], false);
  await pointer("pointerdown", 0, 0, surface);
  await pointer("pointermove", 50, 50);
  await act(async () => root.render(<Surface enabled={false} />));
  await pointer("pointerup", 50, 50);
  expect(onSelect).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
  host.remove();
});
