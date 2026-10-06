import type { ComponentProps } from "react";
import { useGame } from "./game";
import { InteractionForm } from "./components/dreamboard/interaction-form";

export function Form(props: ComponentProps<typeof InteractionForm>) {
  const board = useGame((game) => game.boards.find("frontier"));
  return (
    <InteractionForm
      {...props}
      className="stormtrail-form"
      renderSelected={(input, value) => {
        if (input !== "hexId" || typeof value !== "string") return undefined;
        const space = board?.spaces.getAll().find((cell) => cell.id === value);
        const tile = board?.data.tiles.find(
          (tile) => tile.ref === space?.data.tileRef,
        );
        if (tile?.disclosure !== "visible") return "District selected";
        const words = tile.name
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .toLowerCase();
        return words.charAt(0).toUpperCase() + words.slice(1);
      }}
      renderInput={(input) => {
        const domain = input.getDomain();
        if (domain.type !== "boardTarget") return undefined;
        return (
          <p key={input.key}>
            Choose a highlighted {String(domain.targetKind)} on the frontier.
            {input.getValue() !== undefined && <span> Selected.</span>}
          </p>
        );
      }}
    />
  );
}

export function StormtrailInteractionRoutes() {
  const game = useGame();
  return (
    <div className="grid gap-3" data-stormtrail-actions="">
      {game.connection !== "ready" && (
        <p role="status">
          Connection: {game.connection}. Actions resume after reconnection.
        </p>
      )}
      {game.interactions.list().length === 0 && (
        <p>Waiting for the other crews.</p>
      )}
      <Form interaction="setupCamp.placeStartingCamp" />
      <Form interaction="setupTrail.placeStartingTrail" />
      <Form interaction="roll.rollDice" />
      <Form interaction="discardBarrier.discardSupplies" />
      <Form interaction="moveBandits.moveBandits" />
      <Form interaction="main.buildTrail" />
      <Form interaction="main.buildCamp" />
      <Form interaction="main.tradeWithSupplyDepot" />
      <Form interaction="main.offerTrade" />
      <Form interaction="main.endTurn" />
      <Form interaction="pendingTrade.acceptTrade" />
      <Form interaction="pendingTrade.rejectTrade" />
    </div>
  );
}
