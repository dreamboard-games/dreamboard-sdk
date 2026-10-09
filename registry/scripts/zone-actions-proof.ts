import { expect, type Page } from "@playwright/test";

export async function proveZoneActions(page: Page, touch: boolean) {
  const zone = page.locator("[data-zone-actions-root]");
  const title = zone.getByRole("button", { name: "Deck actions", exact: true });
  const popup = page.getByRole("dialog", { name: "Deck actions", exact: true });
  if (!touch) {
    await title.hover();
    await expect(zone).toHaveCSS("outline-style", "solid");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    await expect(title).toBeFocused();
    await expect(zone).toHaveCSS("outline-style", "solid");
    await page.keyboard.press("Enter");
  } else await title.tap();
  await expect(popup).toBeVisible();
  await expect(
    popup.getByRole("button", { name: "Spread cards" }),
  ).toBeFocused();
  await expect(zone).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
  await expect(title).toBeFocused();
  await title.click();
  await popup.getByRole("button", { name: "Spread cards" }).click();
  await expect(popup).toHaveCount(0);
  for (const remaining of [2, 1, 0]) {
    await title.click();
    await popup.getByRole("button", { name: "Take a card" }).click();
    await expect(zone.locator(".db-card")).toHaveCount(remaining);
    await title.click();
    await expect(
      popup.getByRole("button", { name: "Gather cards" }),
    ).toBeVisible();
    if (remaining) await page.keyboard.press("Escape");
  }
  await expect(
    popup.getByRole("button", { name: "Take a card" }),
  ).toBeDisabled();
  await popup.getByRole("button", { name: "Gather cards" }).click();
  await expect(zone.locator(".db-pile[data-empty]")).toBeVisible();
  await expect(title).toBeFocused();
}
