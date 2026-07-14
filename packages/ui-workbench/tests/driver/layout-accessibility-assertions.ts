import type { Locator, Page } from "@playwright/test";
import {
  BROWSER_INTERACTION_ATTRIBUTES,
  DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
} from "@dreamboard-games/sdk/browser-interaction";

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    throw new Error(
      `Document has horizontal overflow: scrollWidth ${overflow.scrollWidth}, clientWidth ${overflow.clientWidth}.`,
    );
  }
}

export async function expectAllEnabledActuatorsInViewport(
  page: Page,
): Promise<void> {
  const failures = await page.evaluate(
    async ({ attrs, version }) => {
      const selector = [
        `[${attrs.protocol}="${version}"]`,
        `[${attrs.role}="actuator"]`,
        `[${attrs.enabled}="true"]`,
      ].join("");
      const initialScroll = { x: window.scrollX, y: window.scrollY };
      const failures = [];
      for (const element of document.querySelectorAll(selector)) {
        element.scrollIntoView({ block: "nearest", inline: "nearest" });
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const rect = element.getBoundingClientRect();
        if (
          rect.right < 0 ||
          rect.bottom < 0 ||
          rect.left > window.innerWidth ||
          rect.top > window.innerHeight
        ) {
          failures.push({
            interactionKey: element.getAttribute(attrs.interactionKey),
            actuatorId: element.getAttribute(attrs.actuatorId),
            rect: {
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
            },
          });
        }
      }
      window.scrollTo(initialScroll.x, initialScroll.y);
      return failures;
    },
    {
      attrs: BROWSER_INTERACTION_ATTRIBUTES,
      version: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    },
  );
  if (failures.length > 0) {
    throw new Error(
      `Enabled semantic actuators cannot be scrolled into the viewport: ${JSON.stringify(failures)}`,
    );
  }
}

export async function expectMinimumTouchTargetSize(
  page: Page,
  minimum: { readonly width: number; readonly height: number },
): Promise<void> {
  const failures = await page.evaluate(
    ({ attrs, minimumSize, version }) => {
      const selector = [
        `[${attrs.protocol}="${version}"]`,
        `[${attrs.role}="actuator"]`,
        `[${attrs.enabled}="true"]`,
      ].join("");
      return [...document.querySelectorAll(selector)]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            interactionKey: element.getAttribute(attrs.interactionKey),
            actuatorId: element.getAttribute(attrs.actuatorId),
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(
          ({ width, height }) =>
            width > 0 &&
            height > 0 &&
            (width < minimumSize.width || height < minimumSize.height),
        );
    },
    {
      attrs: BROWSER_INTERACTION_ATTRIBUTES,
      minimumSize: minimum,
      version: DREAMBOARD_BROWSER_INTERACTION_PROTOCOL_VERSION,
    },
  );
  if (failures.length > 0) {
    throw new Error(
      `Enabled semantic actuators below ${minimum.width}x${minimum.height}: ${JSON.stringify(
        failures,
      )}`,
    );
  }
}

export async function expectNoOverlap(
  first: Locator,
  second: Locator,
): Promise<void> {
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  if (!firstBox || !secondBox) {
    throw new Error("Cannot assert overlap for non-visible locators.");
  }
  const overlaps =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y;
  if (overlaps) {
    throw new Error("Expected locators not to overlap.");
  }
}

export async function expectDialogWithinSafeArea(
  page: Page,
  dialog: Locator,
): Promise<void> {
  const box = await dialog.boundingBox();
  if (!box) {
    throw new Error("Cannot assert safe area for a non-visible dialog.");
  }
  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Cannot assert dialog safe area without a viewport.");
  }
  const inside =
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height;
  if (!inside) {
    throw new Error(`Dialog outside safe area: ${JSON.stringify(box)}`);
  }
}

export async function expectBasicAccessibilityInvariants(
  page: Page,
): Promise<void> {
  const failures = await page.evaluate(() => {
    const missingButtonNames = [...document.querySelectorAll("button")].filter(
      (button) =>
        !button.textContent?.trim() &&
        !button.getAttribute("aria-label") &&
        !button.getAttribute("aria-labelledby"),
    ).length;
    const missingImageText = [...document.querySelectorAll("img")].filter(
      (image) => !image.hasAttribute("alt"),
    ).length;
    const duplicateIds = new Set<string>();
    const seenIds = new Set<string>();
    for (const element of document.querySelectorAll("[id]")) {
      const id = element.id;
      if (seenIds.has(id)) duplicateIds.add(id);
      seenIds.add(id);
    }
    return {
      duplicateIds: [...duplicateIds],
      missingButtonNames,
      missingImageText,
    };
  });
  if (
    failures.duplicateIds.length > 0 ||
    failures.missingButtonNames > 0 ||
    failures.missingImageText > 0
  ) {
    throw new Error(
      `Accessibility invariant failures: ${JSON.stringify(failures)}`,
    );
  }
}
