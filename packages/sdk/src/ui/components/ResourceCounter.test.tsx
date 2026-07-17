import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import {
  ResourceCounter,
  type ResourceDisplayConfig,
} from "./ResourceCounter.js";

const resources: ResourceDisplayConfig[] = [
  { type: "gold", label: "Gold", icon: "🪙" },
];

test("ResourceCounter provides headless resource state to author markup", () => {
  const html = renderToString(
    <ResourceCounter.Root resources={resources} counts={{ gold: 3 }}>
      <ResourceCounter.Item className="author-chip">
        <ResourceCounter.Icon className="author-icon" />
        <ResourceCounter.Count />
      </ResourceCounter.Item>
    </ResourceCounter.Root>,
  );

  expect(html).toContain('data-dreamboard-resource-counter=""');
  expect(html).toContain('class="author-chip"');
  expect(html).toContain('class="author-icon"');
  expect(html).toContain('data-resource-id="gold"');
  expect(html).toContain('data-resource-count="3"');
  expect(html).toContain('aria-label="Gold: 3"');
  expect(html).not.toContain("tooltip");
});
