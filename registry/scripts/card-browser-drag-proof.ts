import {
  expect,
  type FrameLocator,
  type Page,
  type Route,
} from "@playwright/test";

/** A single physical press leaves the modal and commits (or cancels) on the table. */
export async function proveBrowserDrag(
  page: Page,
  touch: boolean,
  hand = false,
  game: Page | FrameLocator = page,
) {
  const source = hand ? game.locator(".db-hand") : game.getByTestId("table");
  const authority = game.getByTestId(hand ? "table-cards" : "row-authority");
  const state = async () =>
    JSON.parse((await authority.textContent())!) as [string, string[]][];
  if (!hand) {
    await expect(source.locator("[data-card]")).toHaveCount(3);
    await source.evaluate((element) => {
      element.style.width = "180px";
      element.style.flex = "none";
    });
  }
  const browse = hand
    ? source.locator(".db-card-browse")
    : source.locator("..").locator(".db-card-browse");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const move = async (x: number, y: number) => {
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y, id: 1 }],
      });
    else await page.mouse.move(x, y);
  };
  for (const cancel of [true, false]) {
    const before = await state();
    await browse.click();
    const sheet = game.locator(".db-hand-sheet");
    await expect(sheet).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    if (hand && cdp) {
      // The gutter scrolls the collection; pressing a card starts its gesture.
      const content = sheet.locator(".db-hand-sheet-cards");
      const bounds = (await content.boundingBox())!;
      const x = bounds.x + 1;
      const y = bounds.y + bounds.height - 20;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let step = 1; step <= 8; step++) await move(x, y - step * 15);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(() => content.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      await expect(sheet).toBeVisible();
      await expect(game.locator("[data-drag-overlay]")).toHaveCount(0);
    }
    const card = sheet
      .locator(hand ? '[data-card^="spades-"]' : "[data-card]")
      .first();
    await card.scrollIntoViewIfNeeded();
    const id = (await card.getAttribute("data-card"))!;
    const box = (await card.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...start, id: 1 }],
      });
    else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
    }
    await move(start.x, start.y - 40);
    await expect(sheet).toHaveCount(0);
    const overlay = game.locator("[data-drag-overlay]");
    await expect(overlay).toHaveCount(1);
    await expect(browse).toBeDisabled();
    const target = hand
      ? game.locator('[data-zone="discard"]').first()
      : game.getByTestId("empty");
    const to = (await target.boundingBox())!;
    for (let step = 1; step <= 10; step++)
      await move(
        start.x + ((to.x + to.width / 2 - start.x) * step) / 10,
        start.y - 40 + ((to.y + to.height / 2 - start.y + 40) * step) / 10,
      );
    // Check the painted face before lifting: a drop assertion alone can miss
    // a preview that froze when the sheet removed the captured touch target.
    await expect
      .poll(
        async () => {
          const face = await overlay.locator(".db-card").boundingBox();
          return face
            ? Math.hypot(
                face.x + face.width / 2 - (to.x + to.width / 2),
                face.y + face.height / 2 - (to.y + to.height / 2),
              )
            : Infinity;
        },
        { message: "The held card follows the pointer after Browse closes" },
      )
      .toBeLessThan(50);
    if (cdp)
      await cdp.send("Input.dispatchTouchEvent", {
        type: cancel ? "touchCancel" : "touchEnd",
        touchPoints: [],
      });
    else {
      if (cancel) await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.mouse.move(1, 1);
    }
    await expect(overlay).toHaveCount(0);
    if (cancel) await expect(browse).toBeEnabled();
    await expect(sheet).toHaveCount(0);
    if (cancel) expect(await state()).toEqual(before);
    else
      await expect
        .poll(state)
        .toContainEqual([hand ? "discard" : "empty", [id]]);
  }
  await cdp?.detach();
}

/** Playtest embeds the game in an opaque iframe, unlike a top-level story. */
export async function proveEmbeddedBrowserDrag(page: Page, base: string) {
  const allowModules = async (route: Route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "access-control-allow-origin": "*" },
    });
  };
  // Static Storybook modules need CORS permission when loaded by a null origin.
  await page.route(`${base}/**`, allowModules);
  try {
    await page.setContent(
      `<meta name="viewport" content="width=device-width, initial-scale=1">
       <style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%;display:block}</style>
       <iframe title="Game" sandbox="allow-scripts" src="${base}/iframe.html?id=game-feel-hand--crowded-hand&viewMode=story"></iframe>`,
    );
    await proveBrowserDrag(
      page,
      true,
      true,
      page.frameLocator('iframe[title="Game"]'),
    );
  } finally {
    await page.unroute(`${base}/**`, allowModules);
  }
}
