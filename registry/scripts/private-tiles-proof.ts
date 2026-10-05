import { z } from "zod";
import { expect, type Page, type Locator } from "@playwright/test";
async function activate(control: Locator, touch: boolean) {
  if (touch) await control.tap();
  else await control.click();
}
async function version(page: Page) {
  return Number(
    await page.locator("[data-private-tiles]").getAttribute("data-version"),
  );
}
async function action(page: Page, name: string, touch: boolean) {
  const before = await version(page);
  await activate(page.getByRole("button", { name, exact: true }), touch);
  await expect.poll(() => version(page)).toBeGreaterThan(before);
}
async function hidden(page: Page) {
  const authorized = page.getByLabel("Authorized frame");
  await expect(authorized).not.toContainText(
    /SECRET_|secret-west|secret-east|secret-root|secret-crown/,
  );
  await expect(page.locator("svg [data-input=cell]")).toHaveCount(0);
  const diagnostic = z
    .object({
      view: z.object({
        boards: z.object({
          map: z.object({
            spaces: z.record(z.string(), z.unknown()),
            edges: z.array(z.unknown()),
            vertices: z.array(z.unknown()),
          }),
        }),
      }),
    })
    .parse(JSON.parse((await authorized.textContent()) ?? "null"));
  expect(Object.keys(diagnostic.view.boards.map.spaces)).toEqual([]);
  expect(diagnostic.view.boards.map.edges).toEqual([]);
  expect(diagnostic.view.boards.map.vertices).toEqual([]);
  await expect(page.locator("svg [data-target-kind]")).toHaveCount(0);
  const viewBox = await page
    .getByRole("group", { name: "Expedition board", exact: true })
    .getAttribute("viewBox");
  const [, , width, height] = (viewBox ?? "").split(/\s+/).map(Number);
  expect(width).toBeGreaterThanOrEqual(60);
  expect(height).toBeGreaterThanOrEqual(60);
  expect(width).toBe(height);

  await expect(
    page.locator("svg [data-tile-disclosure=concealed]"),
  ).toHaveCount(1);
  await expect(
    page.locator("svg [data-tile-disclosure=concealed]").locator("xpath=.."),
  ).not.toHaveAttribute("role", "button");
}
export async function provePrivateTiles(page: Page, touch: boolean) {
  const root = page.locator("[data-private-tiles]");
  await expect(root).toBeVisible();
  const seat = page.getByRole("combobox", { name: "Selected seat" });
  const seats = await seat
    .locator("option")
    .evaluateAll((options) =>
      options.map((option) => option.getAttribute("value")!),
    );
  await expect(page.locator("[data-bag-tile]")).toHaveCount(2);
  await activate(
    page.getByRole("button", { name: "Hold tile handler", exact: true }),
    touch,
  );
  const oldRef = await page
    .locator("[data-bag-tile]")
    .first()
    .getAttribute("data-value");
  await action(page, "Track bag tile", touch);
  await expect(page.locator('[data-draft="play.trackBag"]')).not.toHaveText(
    "{}",
  );
  await seat.selectOption(seats[1]);
  await action(page, "Shuffle bag", touch);
  await seat.selectOption(seats[0]);
  await expect(page.locator('[data-draft="play.trackBag"]')).toHaveText("{}");
  if (touch) await page.locator("[data-bag-tile]").first().tap();
  else {
    await page.locator("[data-bag-tile]").first().focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator('[data-draft="play.place"]')).not.toHaveText("{}");
  await action(page, "Confirm placement", touch);
  await expect(page.locator("[data-bag-tile]")).toHaveCount(1);
  await hidden(page);
  await seat.selectOption(seats[1]);
  await hidden(page);
  await activate(
    page.getByRole("button", { name: "Save checkpoint", exact: true }),
    touch,
  );
  await action(page, "Track board tile", touch);
  await expect(page.locator('[data-draft="play.trackBoard"]')).not.toHaveText(
    "{}",
  );
  await seat.selectOption(seats[0]);
  await action(page, "Reveal board", touch);
  await seat.selectOption(seats[1]);
  await expect(page.locator('[data-draft="play.trackBoard"]')).toHaveText("{}");
  await expect(page.locator("svg [data-tile-disclosure=visible]")).toHaveCount(
    1,
  );
  await expect(page.locator("svg [data-input=cell]")).toHaveCount(2);
  await expect(page.getByLabel("Authorized frame")).toContainText("SECRET_");
  await action(page, "Restore checkpoint", touch);
  await hidden(page);
  await activate(
    page.getByRole("button", { name: "Try held handler", exact: true }),
    touch,
  );
  await expect(page.locator('[data-draft="play.place"]')).toHaveText("{}");
  await activate(
    page.getByRole("button", { name: "Try held reference", exact: true }),
    touch,
  );
  await expect(page.getByLabel("Held reference result")).toHaveText("rejected");
  expect(
    await page.locator("[data-bag-tile]").first().getAttribute("data-value"),
  ).not.toBe(oldRef);
  await action(page, "Track bag tile", touch);
  await expect(page.locator('[data-draft="play.trackBag"]')).not.toHaveText(
    "{}",
  );
  await seat.selectOption(seats[0]);
  await action(page, "Shuffle bag", touch);
  await seat.selectOption(seats[1]);
  await expect(page.locator('[data-draft="play.trackBag"]')).toHaveText("{}");
  await hidden(page);
}
