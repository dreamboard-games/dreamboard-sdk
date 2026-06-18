/**
 * Artisans' Guild — full-game playwright e2e (T200).
 *
 * STATUS: NOT HERMETIC. Requires a registered backend game session.
 * See ../PLAYWRIGHT_README.md for prerequisites and the bootstrap
 * path. Currently blocked on a backend compile-validation gap (see
 * docs/goals/artisans-guild-implementation/notes/T200-playwright-evidence.md
 * §"UI bugs / gaps found"). Once the gap is resolved, this spec
 * codifies the canonical 2-player click-through that mirrors the
 * scenario `full-season-6-game-flow.scenario.ts`.
 *
 * Run (after prerequisites):
 *   cd examples/published/artisans-guild
 *   bunx playwright test test/playwright/e2e-artisans-guild.spec.ts
 *
 * Two-context strategy: a single test launches two browser contexts,
 * one per seat. Each context navigates to
 * `http://localhost:5174/_dev/play/{shortCode}` and the test driver
 * alternates submits via the SDK auto-form modal.
 */
import { test, expect, type BrowserContext } from "@playwright/test";

// ── Prerequisites -------------------------------------------------------
//
// Set SHORT_CODE in the environment to point at a freshly-created
// session. See PLAYWRIGHT_README.md for how to provision one.
const SHORT_CODE = process.env.AG_SHORT_CODE;
const HARNESS_BASE_URL =
  process.env.AG_HARNESS_BASE_URL ?? "http://localhost:5174";

test.skip(
  !SHORT_CODE,
  "AG_SHORT_CODE not set — see PLAYWRIGHT_README.md for setup.",
);

// ── Helpers -------------------------------------------------------------
async function openSeat(
  context: BrowserContext,
  seatLabel: string,
): Promise<import("@playwright/test").Page> {
  const page = await context.newPage();
  await page.goto(`${HARNESS_BASE_URL}/_dev/play/${SHORT_CODE}`);
  await expect(page.getByText("Artisans' guild")).toBeVisible({
    timeout: 15_000,
  });
  await page.evaluate(
    (label) => console.info(`[playwright] ${label} ready`),
    seatLabel,
  );
  return page;
}

async function clickActionButton(
  page: import("@playwright/test").Page,
  label: string,
): Promise<void> {
  await page.getByRole("button", { name: label }).click();
}

async function submitInteractionForm(
  page: import("@playwright/test").Page,
  buttonLabel: string,
  fields: Record<string, string>,
): Promise<void> {
  await clickActionButton(page, buttonLabel);
  for (const [field, value] of Object.entries(fields)) {
    // SDK auto-form fields render as labelled selects/inputs. The
    // generated label matches the input's key (camelCase).
    const select = page.getByLabel(field, { exact: false });
    await select.selectOption(value);
  }
  await page
    .getByRole("button", { name: buttonLabel, exact: false })
    .last()
    .click();
}

// ── The canonical chain -------------------------------------------------
test("artisans-guild full season chain via /_dev/play", async ({ browser }) => {
  const seat0Ctx = await browser.newContext();
  const seat1Ctx = await browser.newContext();

  const seat0 = await openSeat(seat0Ctx, "seat-0");
  const seat1 = await openSeat(seat1Ctx, "seat-1");

  // ── Season 1 ───────────────────────────────────────────────────────
  await submitInteractionForm(seat0, "Pick wake-up slot", {
    spaceId: "wake-up-1",
  });
  await submitInteractionForm(seat1, "Pick wake-up slot", {
    spaceId: "wake-up-4",
  });

  // Mirror full-season-6-game-flow.scenario.ts placements.
  await submitInteractionForm(seat0, "Place worker", {
    componentId: "apprentice-p1-1",
    spaceId: "lumberyard",
  });
  await submitInteractionForm(seat1, "Place worker", {
    componentId: "apprentice-p2-1",
    spaceId: "quarry",
  });
  // ... (full chain continues — see full-season-6-game-flow.scenario.ts
  // for the exhaustive sequence). For T200 we drive the full chain
  // here once the bootstrap blocker clears.

  // Endgame assertion.
  await expect(seat0.getByText(/winner/i)).toBeVisible({ timeout: 60_000 });
  await expect(seat1.getByText(/winner/i)).toBeVisible({ timeout: 60_000 });

  await seat0Ctx.close();
  await seat1Ctx.close();
});
