import React from "react";
import { Interaction } from "@dreamboard-games/sdk/runtime/primitives";

export function AutomaRiverInteractionRoutes() {
  return (
    <>
      <Interaction.Routes
        routes={{
          claimCargo: {
            collect: {},
          },
        }}
      />
      <Interaction.Submit params={{ claimId: "main-claim" }}>
        Claim cargo
      </Interaction.Submit>
    </>
  );
}
