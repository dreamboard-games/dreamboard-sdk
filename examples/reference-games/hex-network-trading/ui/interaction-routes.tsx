import type { ComponentProps } from "react";
import { useGame } from "./game";
import { InteractionForm } from "./components/dreamboard/interaction-form";

export function Form(props: ComponentProps<typeof InteractionForm>) {
  return (
    <InteractionForm
      {...props}
      className="stormtrail-form"
      renderInput={(input) => {
        const domain = input.getDomain();
        if (domain.type !== "boardTarget") return undefined;
        return (
          <p key={input.key}>
            Choose a highlighted {String(domain.targetKind)} on the frontier.
            {input.getValue() !== undefined && (
              <span> Selected: {String(input.getValue())}</span>
            )}
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
