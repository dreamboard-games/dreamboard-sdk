import { expect, type Locator, type Page } from "@playwright/test";
import { cardSurface } from "./card-surface.ts";

async function pose(card: Locator) {
  return card.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    const matrix = new DOMMatrix(
      getComputedStyle(element.closest(".db-hand-pose")!).transform,
    );
    return {
      at: performance.now(),
      x,
      y,
      width,
      height,
      scale: Math.hypot(matrix.a, matrix.b),
      rotate: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
      scroll: element.closest(".db-hand-scroll")?.scrollLeft ?? 0,
    };
  });
}

/** Sample the first painted handoff, including input/protocol latency. */
function flight(card: Locator, returning: boolean, count = 24) {
  return card.evaluate(
    async (element, { returning, count }) => {
      const frames = [];
      const started = performance.now();
      for (let frame = 0; frame < count; frame++) {
        await new Promise(requestAnimationFrame);
        const clone = document.querySelector("[data-drag-overlay] .db-card");
        const face = returning ? (clone ? null : element) : clone;
        if (!face) {
          if (performance.now() - started > 3000)
            throw new Error("No pickup handoff");
          frame--;
          continue;
        }
        const owner = face.closest(".db-hand-pose")!;
        const matrix = new DOMMatrix(getComputedStyle(owner).transform);
        const { x, y, width, height } = face.getBoundingClientRect();
        frames.push({
          at: performance.now(),
          x,
          y,
          width,
          height,
          scale: Math.hypot(matrix.a, matrix.b),
          rotate: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
          scroll: element.closest(".db-hand-scroll")?.scrollLeft ?? 0,
        });
      }
      return frames;
    },
    { returning, count },
  );
}

/** Native tilted pickup and cancellation retain the visible pose, not its AABB. */
export async function proveHandPickup(
  page: Page,
  touch: boolean,
  capturePrefix: string,
) {
  for (const scenario of touch
    ? ["first", "last", "scrolled", "regrab"]
    : ["quick", "held", "regrab"]) {
    await page.reload();
    const cards = page
      .getByRole("region", { name: "Your hand" })
      .locator(".db-hand-card");
    await expect(cards).toHaveCount(9);
    if (scenario === "first") {
      // Player two's first club can drag; four real draws produce the -15° fan.
      await page.getByRole("button", { name: "End turn" }).click();
      await page.getByRole("button", { name: "Switch seat" }).click();
      for (let draw = 0; draw < 4; draw++) {
        await page.getByRole("button", { name: "Deck actions" }).click();
        await page.locator('[data-action="draw"]').click();
      }
      await expect(cards).toHaveCount(7);
      for (const card of await cards.all()) await expect(card).toBeVisible();
      await expect(page.locator("[data-card-arrival]")).toHaveCount(0);
    }
    if (scenario === "scrolled") {
      const hand = page.getByRole("region", { name: "Your hand" });
      await hand.evaluate((element) => {
        (element as HTMLElement).style.width = "260px";
      });
      const at = await cardSurface(cards.first());
      const tracking = cards.first().evaluate(async (element) => {
        const scroll = element.closest(".db-hand-scroll") as HTMLElement;
        const before = element.getBoundingClientRect();
        const centre = before.x + before.width / 2 + scroll.scrollLeft;
        const frames = [];
        for (let frame = 0; frame < 16; frame++) {
          await new Promise(requestAnimationFrame);
          const box = element.getBoundingClientRect();
          frames.push(box.x + box.width / 2 + scroll.scrollLeft);
        }
        return { centre, frames };
      });
      const pan = await page.context().newCDPSession(page);
      await pan.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...at, id: 1 }],
      });
      for (let step = 1; step <= 8; step++)
        await pan.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: at.x - step * 12, y: at.y, id: 1 }],
        });
      await pan.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await pan.detach();
      const tracked = await tracking;
      for (const centre of tracked.frames)
        expect(centre).toBeCloseTo(tracked.centre, 0);
      await expect
        .poll(() =>
          hand
            .locator(".db-hand-scroll")
            .evaluate((element) => element.scrollLeft),
        )
        .toBeGreaterThan(20);
    }
    await page.waitForTimeout(650);
    const card = touch
      ? scenario === "first"
        ? cards.first()
        : cards.last()
      : cards.nth(4);
    const rest = await pose(card);
    const at = await cardSurface(card);
    if (!touch) {
      await page.mouse.move(at.x, at.y);
      await expect(card).toHaveAttribute("data-hovered", "true");
      await page.waitForTimeout(650);
    }
    const source = await pose(card);
    const grab = touch
      ? at
      : {
          x: source.x + source.width * 0.3,
          y: source.y + source.height * 0.4,
        };
    const pickup = flight(card, false, scenario === "quick" ? 2 : 24);
    const cdp = touch ? await page.context().newCDPSession(page) : null;
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...grab, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: grab.x, y: grab.y - 20, id: 1 }],
      });
    } else {
      await page.mouse.move(grab.x, grab.y);
      await page.mouse.down();
      await page.mouse.move(grab.x, grab.y - 20);
    }
    const frames = await pickup;
    const targetScale = Math.max(1.2, source.scale);
    const first = frames[0];
    // The first rAF may follow one Motion tick; it must retain the source tilt.
    expect(Math.abs(first.rotate - source.rotate)).toBeLessThan(2);
    expect(first.scale).toBeCloseTo(source.scale, 1);
    expect(first.width).toBeCloseTo(source.width, 0);
    for (const frame of frames) {
      expect(frame.scale).toBeGreaterThanOrEqual(source.scale - 0.002);
      expect(frame.scale).toBeLessThanOrEqual(targetScale + 0.002);
      expect(frame.y).toBeGreaterThan(0);
      expect(frame.y + frame.height).toBeLessThan(page.viewportSize()!.height);
    }
    for (let index = 1; index < frames.length; index++) {
      expect(frames[index].scale).toBeGreaterThanOrEqual(
        frames[index - 1].scale - 0.002,
      );
      expect(Math.abs(frames[index].rotate)).toBeLessThanOrEqual(
        Math.abs(frames[index - 1].rotate) + 0.03,
      );
    }
    if (scenario !== "quick") {
      expect(frames.at(-1)!.scale).toBeCloseTo(targetScale, 2);
      expect(frames.at(-1)!.rotate).toBeCloseTo(0, 2);
      await page.screenshot({
        path: `${capturePrefix}-${scenario}-pickup.png`,
      });
    }
    if (scenario === "regrab") {
      const interrupted = flight(card, true, 2);
      if (cdp)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchCancel",
          touchPoints: [],
        });
      else {
        await page.keyboard.press("Escape");
        await page.mouse.up();
      }
      await interrupted;
      const at = await cardSurface(card, undefined, false);
      if (!cdp) {
        await page.mouse.move(at.x, at.y);
        await page.mouse.down();
      }
      // Observe the actual painted source at the physical drag event, before
      // the SDK handles it; the returning shared projection is still running.
      const contact = await card.evaluateHandle((element) => {
        let width = 0;
        let startY = 0;
        document.addEventListener(
          "pointermove",
          () => {
            const box = element.getBoundingClientRect();
            width = box.width;
            startY = box.y + box.height / 2;
          },
          { capture: true, once: true },
        );
        return {
          get width() {
            return width;
          },
          get startY() {
            return startY;
          },
        };
      });
      const regrab = flight(card, false);
      if (cdp) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...at, id: 1 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: at.x, y: at.y - 20, id: 1 }],
        });
      } else await page.mouse.move(at.x, at.y - 20);
      const frames = await regrab;
      const measured = await contact.evaluate((value) => ({
        width: value.width,
        startY: value.startY,
      }));
      await contact.dispose();
      if (cdp) {
        expect(Math.abs(frames[0].width - measured.width)).toBeLessThan(2);
        const final = frames.at(-1)!;
        expect(final.y + final.height / 2).toBeCloseTo(
          measured.startY - 20 - final.height * 0.3,
          0,
        );
      } else {
        expect(frames[0].width).toBeCloseTo(measured.width, 0);
        for (const frame of frames)
          expect(frame.width).toBeCloseTo(measured.width, 0);
      }
    }
    const clone = await pose(page.locator("[data-drag-overlay] .db-card"));
    const returned = flight(card, true, 40);
    if (cdp) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
      if (scenario === "scrolled") {
        // Pan back while the tilted card is returning: native offset must carry
        // its viewport centre without a counteracting layout animation.
        const at = await cardSurface(cards.first(), undefined, false);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ ...at, id: 1 }],
        });
        for (let step = 1; step <= 8; step++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: at.x + step * 12, y: at.y, id: 1 }],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      }
      await cdp.detach();
    } else {
      await page.keyboard.press("Escape");
      await page.mouse.up();
    }
    const returning = await returned;
    for (const frame of returning) {
      // These straight-up grabs share the fan's horizontal centre. A return
      // projection must not multiply its ancestor's hand translation by scale.
      expect(frame.x + frame.width / 2 + frame.scroll).toBeCloseTo(
        rest.x + rest.width / 2 + rest.scroll,
        0,
      );
      expect(frame.scale).toBeGreaterThanOrEqual(0.999);
      expect(frame.width).toBeLessThanOrEqual(
        Math.max(clone.width, rest.width) + 1,
      );
      const centre = frame.y + frame.height / 2;
      expect(centre).toBeGreaterThanOrEqual(
        Math.min(clone.y + clone.height / 2, rest.y + rest.height / 2) - 2,
      );
      expect(centre).toBeLessThanOrEqual(
        Math.max(clone.y + clone.height / 2, rest.y + rest.height / 2) + 2,
      );
    }
    for (let index = 1; index < returning.length; index++)
      expect(returning[index].scale).toBeLessThanOrEqual(
        returning[index - 1].scale + 0.003,
      );
    const final = returning.at(-1)!;
    expect(final.x + final.scroll).toBeCloseTo(rest.x + rest.scroll, 0);
    for (const key of ["y", "width", "height"] as const)
      expect(final[key]).toBeCloseTo(rest[key], 0);
    console.log(
      `Hand pickup ${scenario}: scale ${source.scale.toFixed(3)}→${targetScale.toFixed(3)}, first ${first.width.toFixed(2)}×${first.height.toFixed(2)}, ${returning.length} return frames.`,
    );
  }
}
