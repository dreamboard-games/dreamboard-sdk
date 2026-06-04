import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Coins } from "lucide-react";
import { CostDisplay, type ResourceDefinition } from "./CostDisplay.js";

const resourceDefs: ResourceDefinition[] = [
  { type: "gold", label: "Gold", icon: Coins },
  { type: "wood", label: "Wood" },
];

test("CostDisplay renders shadcn tooltip triggers for each resource cost", () => {
  const html = renderToString(
    <CostDisplay
      cost={{ gold: 3, wood: 2 }}
      currentResources={{ gold: 4, wood: 1 }}
      resourceDefs={resourceDefs}
    />,
  );

  expect(html).toContain('data-slot="tooltip-trigger"');
  expect(html).toContain('aria-label="Cost: 3 Gold, 2 Wood (cannot afford)"');
  expect(html).not.toContain("title=");
});
