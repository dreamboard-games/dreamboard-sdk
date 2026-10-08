import { expect, type Page } from "@playwright/test";
import { cardSurface as surface } from "./card-surface.ts";

export async function proveHandChoreography(
  page: Page,
  touch: boolean,
  capturePrefix: string,
) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const cards = hand.locator(".db-hand-card");
  const clip = hand.locator(".db-hand-clip");
  await expect(cards).toHaveCount(9);
  const before = (await hand.boundingBox())!;
  if (!touch) {
    const active = cards.nth(4);
    await page.mouse.move(
      ...(Object.values(await surface(active)) as [number, number]),
    );
    await expect(active).toHaveAttribute("data-hovered", "true");
    const activeId = await active.getAttribute("data-card");
    // Park the mouse through the complete neighbour/return settling tail.
    await page.waitForTimeout(650);
    await expect(hand.locator("[data-hovered]")).toHaveAttribute(
      "data-card",
      activeId!,
    );
    const upright = (await active.boundingBox())!;
    expect(upright.width).toBeGreaterThan(125);
    expect((await hand.boundingBox())!.height).toBeCloseTo(before.height, 0);
    await page.keyboard.down("Alt");
    const inspection = page.locator('[data-card-preview="hover"] .db-card');
    await expect(inspection).toBeVisible();
    expect((await inspection.boundingBox())!.width).toBeGreaterThan(
      upright.width * 1.25,
    );
    await page.keyboard.up("Alt");
    await expect(inspection).toHaveCount(0);
    const next = cards.nth(5);
    const at = await surface(next);
    const entryWatch = await next.evaluateHandle((element) => {
      const horizontal = element.closest(".db-hand-slot")!;
      // The shared child owns the painted lift; its parent sets the destination.
      const vertical = element.closest(".db-hand-pose")!.parentElement!;
      const before = {
        x: horizontal.getBoundingClientRect().x,
        y: vertical.getBoundingClientRect().y,
      };
      let started = 0;
      element.addEventListener(
        "pointermove",
        () => {
          started = performance.now();
        },
        { once: true },
      );
      return {
        horizontal,
        vertical,
        before,
        get started() {
          return started;
        },
      };
    });
    const entry = entryWatch.evaluate(async (watch) => {
      const { horizontal, vertical, before } = watch;
      const frames = [];
      while (!watch.started || performance.now() - watch.started < 900) {
        await new Promise(requestAnimationFrame);
        if (watch.started)
          frames.push({
            at: performance.now() - watch.started,
            x: horizontal.getBoundingClientRect().x,
            y: vertical.getBoundingClientRect().y,
          });
      }
      return { before, frames };
    });
    await page.mouse.move(at.x, at.y);
    await expect(next).toHaveAttribute("data-hovered", "true");
    // Outgoing cards immediately return to ordinary fan order.
    expect(
      await active
        .locator("xpath=ancestor::*[contains(@class,'db-hand-slot')]")
        .evaluate((e) => getComputedStyle(e).zIndex),
    ).toBe("4");
    const samples = await active.evaluate(async (element) => {
      const samples: number[] = [];
      for (let frame = 0; frame < 28; frame++) {
        await new Promise(requestAnimationFrame);
        const matrix = new DOMMatrix(
          getComputedStyle(element.closest(".db-hand-pose")!).transform,
        );
        samples.push(Math.hypot(matrix.a, matrix.b));
      }
      return samples;
    });
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0.999);
    for (let index = 1; index < samples.length; index++)
      expect(samples[index]).toBeLessThanOrEqual(samples[index - 1] + 0.002);
    const lift = await entry;
    await entryWatch.dispose();
    const end = lift.frames.at(-1)!;
    const ninety = (axis: "x" | "y") =>
      lift.frames.find(
        (frame) =>
          Math.abs(end[axis] - frame[axis]) <=
          Math.abs(end[axis] - lift.before[axis]) * 0.1,
      )!.at;
    expect(Math.abs(end.x - lift.before.x)).toBeGreaterThan(20);
    expect(Math.abs(end.y - lift.before.y)).toBeGreaterThan(20);
    expect(ninety("y")).toBeLessThan(ninety("x") * 0.5);
    expect(ninety("x")).toBeGreaterThan(200);
    expect(ninety("x")).toBeLessThan(450);
    console.log(
      `Hand entry 90%: vertical ${ninety("y").toFixed(1)}ms, horizontal ${ninety("x").toFixed(1)}ms.`,
    );
    // Interrupt the horizontal return twice. Sample the actual React/Motion
    // transform, including elapsed time, rather than assuming a 60fps machine.
    await active.evaluate((element) =>
      element.closest(".db-hand-slot")!.setAttribute("data-proof-sampling", ""),
    );
    const flight = active.evaluate(async (element) => {
      const slot = element.closest(".db-hand-slot")!;
      const frames: { at: number; x: number; scale: number }[] = [];
      while (slot.hasAttribute("data-proof-sampling")) {
        await new Promise(requestAnimationFrame);
        const matrix = new DOMMatrix(
          getComputedStyle(element.closest(".db-hand-pose")!).transform,
        );
        frames.push({
          at: performance.now(),
          x: slot.getBoundingClientRect().x,
          scale: Math.hypot(matrix.a, matrix.b),
        });
      }
      return frames;
    });
    try {
      for (const target of [active, next, active]) {
        // Track a moving face with real pointer movements. CI protocol latency
        // can outlive a single measured point while the neighbour is returning.
        await expect
          .poll(
            async () => {
              const at = await surface(target, undefined, false);
              await page.mouse.move(at.x, at.y);
              return target.getAttribute("data-hovered");
            },
            { intervals: [16] },
          )
          .toBe("true");
        await page.waitForTimeout(35);
      }
      await page.waitForTimeout(650);
    } finally {
      await active.evaluate((element) =>
        element
          .closest(".db-hand-slot")!
          .removeAttribute("data-proof-sampling"),
      );
    }
    const frames = await flight;
    const baseWidth = await active
      .locator(".db-card")
      .evaluate((e) => (e as HTMLElement).offsetWidth);
    const maxScale = upright.width / baseWidth;
    const peakSpeed = Math.max(
      ...frames
        .slice(1)
        .map(
          (frame, index) =>
            (Math.abs(frame.x - frames[index].x) /
              (frame.at - frames[index].at)) *
            1000,
        ),
    );
    console.log(
      `Hand retarget: ${frames.length} frames, peak horizontal speed ${peakSpeed.toFixed(1)}px/s, scale ${Math.min(...frames.map((frame) => frame.scale)).toFixed(3)}–${Math.max(...frames.map((frame) => frame.scale)).toFixed(3)}.`,
    );
    expect(
      peakSpeed,
      "retargeting must glide from its current horizontal position",
    ).toBeLessThan(upright.width * 5);
    for (const frame of frames) {
      expect(frame.scale).toBeGreaterThanOrEqual(0.999);
      expect(frame.scale).toBeLessThanOrEqual(maxScale + 0.01);
    }
    await expect(active).toHaveAttribute("data-hovered", "true");
    await page.screenshot({ path: `${capturePrefix}-settled.png` });
    // A readable pickup preserves its actual face rather than applying the
    // idle pickup enlargement a second time. Grab away from the centre.
    await page.waitForTimeout(650);
    const picked = (await active.boundingBox())!;
    const grab = {
      x: picked.x + picked.width * 0.3,
      y: picked.y + picked.height * 0.4,
    };
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x, grab.y - 20);
    await expect(page.locator("[data-drag-overlay]")).toBeVisible();
    const pickup = await page
      .locator("[data-drag-overlay] .db-card")
      .evaluate(async (element) => {
        const frames: {
          x: number;
          y: number;
          width: number;
          height: number;
        }[] = [];
        for (let frame = 0; frame < 20; frame++) {
          await new Promise(requestAnimationFrame);
          const { x, y, width, height } = element.getBoundingClientRect();
          frames.push({ x, y, width, height });
        }
        return frames;
      });
    for (const frame of pickup) {
      expect(frame.width).toBeCloseTo(picked.width, 0);
      expect(frame.height).toBeCloseTo(picked.height, 0);
      expect(frame.y + frame.height).toBeLessThan(page.viewportSize()!.height);
    }
    expect(pickup.at(-1)!.x).toBeCloseTo(picked.x, 0);
    expect(pickup.at(-1)!.y).toBeCloseTo(picked.y - 20, 0);
    await page.screenshot({ path: `${capturePrefix}-pickup.png` });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.locator("[data-drag-overlay]")).toHaveCount(0);
    await page.mouse.move(1, 1);
    await expect(hand.locator("[data-hovered]")).toHaveCount(0);
    // Keyboard focus gets the same readable, upright geometry.
    await cards.nth(2).focus();
    await expect(cards.nth(2)).toHaveAttribute("data-hovered", "true");
    await expect
      .poll(async () => (await cards.nth(2).boundingBox())!.width)
      .toBeGreaterThan(125);
    await cards.nth(2).blur();
  }

  // Crowding inside a transformed authored layout still fits the hand, which
  // becomes one button that opens every card in a sheet.
  await hand.evaluate((element) =>
    Object.assign((element as HTMLElement).style, {
      width: "260px",
      transform: "translateZ(0)",
    }),
  );
  const open = hand.getByRole("button", { name: "Your hand: 9 cards" });
  await expect(open).toBeVisible();
  await expect(hand.getByRole("button")).toHaveCount(1);
  await page.waitForTimeout(650);
  const fan = (await clip.boundingBox())!;
  for (const card of await cards.all()) {
    const box = (await card.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(fan.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(fan.x + fan.width + 1);
  }
  if (touch) await open.tap();
  else await open.click();
  const sheet = page.getByRole("dialog", { name: "Your hand · 9" });
  await expect(sheet.locator(".db-hand-card")).toHaveCount(9);
  await page.screenshot({ path: `${capturePrefix}-sheet.png` });
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  // A narrow hand with room to aim keeps its cards.
  await hand.evaluate((element) => {
    (element as HTMLElement).style.width = "340px";
  });
  await expect(open).toHaveCount(0);
  await page.waitForTimeout(650);
  if (!touch) {
    const first = cards.first();
    const at = await surface(first);
    await page.mouse.move(at.x, at.y);
    await expect(first).toHaveAttribute("data-hovered", "true");
    await page.waitForTimeout(600);
    const bounds = (await hand.boundingBox())!;
    const face = (await first.boundingBox())!;
    expect(face.x).toBeGreaterThanOrEqual(bounds.x - 1);
    expect(face.x + face.width).toBeLessThanOrEqual(
      bounds.x + bounds.width + 1,
    );
    const top = await clip.boundingBox();
    expect(face.y).toBeGreaterThan(top!.y);
    // Returning faces remain inside the same shared, padded viewport.
    await page.mouse.move(1, 1);
    expect(
      await first.evaluate((e) => e.closest(".db-hand-clip") !== null),
    ).toBe(true);
  }
  // Normal fan z-order must leave each immediate neighbour physically
  // targetable, even though farther neighbours can temporarily be clipped.
  const bounds = (await hand.boundingBox())!;
  for (const index of [0, 4, 8]) {
    await page.keyboard.press("Tab");
    await cards.nth(index).focus();
    await expect(cards.nth(index)).toHaveAttribute("data-hovered", "true");
    await page.waitForTimeout(650);
    for (const next of [index - 1, index + 1]) {
      if (next < 0 || next >= 9) continue;
      const at = await surface(cards.nth(next), bounds);
      expect(at.x).toBeGreaterThanOrEqual(bounds.x);
      expect(at.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      if (touch) {
        await page.touchscreen.tap(at.x, at.y);
        await expect(cards.nth(next)).toHaveAttribute("aria-expanded", "true");
        await page.keyboard.press("Escape");
      } else {
        await page.mouse.move(at.x, at.y);
        await expect(cards.nth(next)).toHaveAttribute("data-hovered", "true");
      }
      await cards.nth(index).blur();
      await cards.nth(index).focus();
      await expect(cards.nth(index)).toHaveAttribute("data-hovered", "true");
      await page.waitForTimeout(650);
    }
  }
  await cards.nth(8).blur();
  await page.mouse.move(1, 1);
  await hand.evaluate((element) => element.removeAttribute("style"));
}

/** Real text and a landscape face preserve authored geometry during inspection. */
export async function proveHandReading(
  page: Page,
  touch: boolean,
  paths: { readable: string; inspection: string },
) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const card = hand.locator(".db-hand-card").nth(4);
  await expect(card).toBeVisible();
  await card.focus();
  await expect(card).toHaveAttribute("data-hovered", "true");
  await page.waitForTimeout(650);
  await expect(page.locator(".db-turn-banner p")).toHaveCount(0, {
    timeout: 6000,
  });
  const source = await card.locator(".db-card").evaluate((element) => ({
    width: parseFloat(getComputedStyle(element).width),
    height: parseFloat(getComputedStyle(element).height),
  }));
  const readable = (await card.boundingBox())!;
  expect(readable.width).toBeGreaterThan(source.width * 1.5);
  await page.screenshot({ path: paths.readable, fullPage: true });
  let cdp;
  if (touch) {
    const at = await surface(card);
    cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...at, id: 1 }],
    });
  } else await page.keyboard.down("Alt");
  const preview = page.locator("[data-card-preview]");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveCSS("opacity", "1");
  const face = (await preview.locator(".db-card").boundingBox())!;
  expect(face.width / face.height).toBeCloseTo(source.width / source.height, 2);
  expect(face.width).toBeGreaterThan(source.width * 2);
  const viewport = page.viewportSize()!;
  expect(face.x).toBeGreaterThanOrEqual(0);
  expect(face.y).toBeGreaterThanOrEqual(0);
  expect(face.x + face.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(face.y + face.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ path: paths.inspection });
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else await page.keyboard.up("Alt");
  await expect(preview).toHaveCount(0);
}

/** An open action menu holds its card still, so the menu stays where it opened. */
export async function proveHandMenuHold(page: Page, touch: boolean) {
  const hand = page.getByRole("region", { name: "Your hand" });
  const card = hand.locator(".db-hand-card").nth(4);
  const play = page.getByRole("button", { name: "Play", exact: true });
  const expectMenuStill = async (
    travel?: (menu: { x: number; y: number }) => Promise<void>,
  ) => {
    await expect(card).toHaveAttribute("aria-expanded", "true");
    await expect(play).toBeVisible();
    const opened = (await play.boundingBox())!;
    await travel?.({
      x: opened.x + opened.width / 2,
      y: opened.y + opened.height / 2,
    });
    // Longer than the whole return curve: a released card carries its menu away.
    await page.waitForTimeout(700);
    const held = (await play.boundingBox())!;
    expect(Math.abs(held.x - opened.x)).toBeLessThan(1);
    expect(Math.abs(held.y - opened.y)).toBeLessThan(1);
    await page.keyboard.press("Escape");
    await expect(card).toHaveAttribute("aria-expanded", "false");
  };
  if (!touch) {
    const at = await surface(card);
    await page.mouse.move(at.x, at.y);
    await expect(card).toHaveAttribute("data-hovered", "true");
    await page.waitForTimeout(650);
    await page.mouse.down();
    await page.mouse.up();
    // A person travels to the menu, and the pointer leaves the card on the way.
    await expectMenuStill((menu) =>
      page.mouse.move(menu.x, menu.y, { steps: 12 }),
    );
    await page.mouse.move(1, 1);
  }
  // Enter moves focus into the menu while the card keeps its pose under it.
  await page.keyboard.press("Tab");
  await card.focus();
  await expect(card).toHaveAttribute("data-hovered", "true");
  await page.waitForTimeout(650);
  await page.keyboard.press("Enter");
  await expectMenuStill();
  await expect(card).toBeFocused();
}
