import type { Page, Locator } from "@playwright/test";
/** Browser actions use the same public DOM attributes as installed registry items. */
export function gameDriver(page: Page) {
  function target(attributes: Record<string, string>): Locator {
    return page.locator(
      Object.entries(attributes)
        .map(([key, value]) => `[data-${key}=${JSON.stringify(value)}]`)
        .join(""),
    );
  }
  return {
    card(cardId: string) {
      return target({ action: "select", value: cardId });
    },
    input(interaction: string, input: string) {
      return target({ interaction, input });
    },
    choice(
      interaction: string,
      input: string,
      value: string | number | boolean | null,
    ) {
      return target({
        action: "select",
        interaction,
        input,
        value: typeof value === "string" ? value : JSON.stringify(value),
      });
    },
    board(board: string, value: string) {
      return target({ action: "select", board, value });
    },
    submit(interaction: string) {
      return target({ action: "submit", interaction });
    },
    cancel(interaction: string) {
      return target({ action: "cancel", interaction });
    },
    resource(interaction: string, input: string, resource: string) {
      return target({ interaction, input, resource });
    },
    async selectSeat(playerId: string) {
      await page
        .getByRole("combobox", { name: "Selected seat" })
        .selectOption(playerId);
    },
    async saveCheckpoint() {
      await page
        .getByRole("button", { name: "Save checkpoint", exact: true })
        .click();
    },
    async restoreCheckpoint() {
      await page
        .getByRole("button", { name: "Restore checkpoint", exact: true })
        .click();
    },
  };
}
