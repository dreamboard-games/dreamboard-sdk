import { expect, test } from "@playwright/test";
import { createReducerBundle } from "@dreamboard-games/sdk/reducer";
import { materializeScenarioRuntimeCheckpoint } from "@dreamboard-games/sdk/testing-runtime";
import {
  digestUIFixtureTransportRequest,
  compilePluginProtocolTape,
  createReducerScenarioRunner,
} from "@dreamboard-games/sdk/testing";
import game from "../../../examples/reference-games/hex-network-trading/app/game";
import scenario from "../../../examples/reference-games/hex-network-trading/test/scenarios/bandits.scenario";
import { BANDITS_PREFIX_COMMANDS } from "../../../examples/reference-games/hex-network-trading/test/scenario-commands";

for (const cancelFirst of [false, true]) {
  test(`Bandits commits separate browser intents${cancelFirst ? " with cancel and no victim" : " with a victim"}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "chromium-desktop");
    const checkpoint = await materializeScenarioRuntimeCheckpoint({
      game,
      scenario,
      at: { segment: "given", completed: BANDITS_PREFIX_COMMANDS.length },
    });
    const submit = (params: Record<string, string | null>) => ({
      operation: "submit" as const,
      input: {
        kind: "interaction" as const,
        playerId: "player-1",
        interactionId: "moveBandits",
        params,
      },
    });
    const operations = [
      submit({ hexId: "northForest" }),
      ...(cancelFirst
        ? [
            {
              operation: "submit" as const,
              input: {
                kind: "interaction.cancel" as const,
                playerId: "player-1",
                interactionId: "moveBandits",
              },
            },
            submit({ hexId: "southWestClay" }),
          ]
        : []),
      submit({ targetPlayerId: cancelFirst ? null : "player-2" }),
    ];
    const runner = createReducerScenarioRunner({
      scenarioId: "bandits-browser",
      gameId: "hex-network-trading",
      bundle: createReducerBundle(game),
      initialState: checkpoint.state,
      playerIds: checkpoint.playerIds,
      viewer: { seatId: "player-1", playerId: "player-1" },
    });
    const trace = await runner.run(
      operations.map((operation, i) => ({ ...operation, id: `command-${i}` })),
    );
    expect(
      trace.exchanges.every(
        (exchange) =>
          exchange.operation === "submit" &&
          exchange.result.kind === "accepted",
      ),
    ).toBe(true);
    const tape = compilePluginProtocolTape({
      trace,
      session: {
        sessionId: "bandits-browser",
        players: checkpoint.playerIds.map((playerId) => ({
          playerId,
          displayName: playerId,
        })),
      },
    });
    await page.route(
      "**/fixtures/**/hex-network-trading.bandits.desktop.fixture.json",
      async (route) => {
        const response = await route.fetch();
        const fixture = await response.json();
        await route.fulfill({ json: { ...fixture, protocol: tape } });
      },
    );
    await page.goto("/scenario/hex-network-trading.bandits.desktop?mode=test");
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const events = () =>
      page.evaluate(() =>
        window
          .__dreamboardUIFixture!.getHostEvents()
          .filter((event) => event.kind === "submit-received"),
      );
    const flush = () =>
      page.evaluate(() => window.__dreamboardUIFixture!.flush());
    await expect(
      page.getByRole("button", { name: "Confirm district", exact: true }),
    ).toBeVisible();
    expect(await events()).toHaveLength(0);
    const chooseDistrict = async (id: string) => {
      await page
        .getByRole("button", { name: `Select space ${id}`, exact: true })
        .click();
      await expect(
        page.getByText("District committed.", { exact: false }),
      ).toBeVisible();
      await flush();
    };
    await chooseDistrict("northForest");
    expect(
      (await events()).map((event) =>
        event.command?.type === "interaction.submit"
          ? event.command.params
          : null,
      ),
    ).toEqual([{ hexId: "northForest" }]);
    if (cancelFirst) {
      await page.getByRole("button", { name: "Cancel Bandits move" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm district", exact: true }),
      ).toBeVisible();
      await chooseDistrict("southWestClay");
    }
    const count = cancelFirst ? 3 : 1;
    await flush();
    expect(await events()).toHaveLength(count);
    await page
      .getByRole("button", {
        name: cancelFirst ? "No victim" : "player-2",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Confirm victim", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "End turn", exact: true }),
    ).toBeVisible();
    await flush();
    const commands = (await events()).map((event) => event.command);
    expect(commands).toHaveLength(count + 1);
    expect(
      commands.map((command) => {
        if (!command) throw new Error("Missing browser command");
        return digestUIFixtureTransportRequest({
          operation:
            command.type === "interaction.cancel" ? "cancel" : "submit",
          basis: command.basis,
          interactionId: command.interactionId,
          payload:
            command.type === "interaction.cancel" ? null : command.params,
        });
      }),
    ).toEqual(
      tape.steps.flatMap((step) =>
        step.kind === "client.submit" ? [step.requestDigest] : [],
      ),
    );
    expect(commands.at(-1)).toMatchObject({
      type: "interaction.submit",
      params: { targetPlayerId: cancelFirst ? null : "player-2" },
    });
    if (cancelFirst)
      expect(commands[1]).toMatchObject({
        type: "interaction.cancel",
        interactionId: "moveBandits",
      });
    await page.evaluate(() => window.__dreamboardUIFixture!.assertConsumed());
    expect(pageErrors).toEqual([]);
  });
}
