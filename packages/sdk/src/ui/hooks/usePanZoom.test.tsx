import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { usePanZoom } from "./usePanZoom.js";

beforeAll(() => {
  GlobalRegistrator.register({ width: 1024, height: 768 });
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

afterEach(() => {
  document.body.replaceChildren();
});

async function mountIntoDom(element: React.ReactElement): Promise<Root> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
  });
  return root;
}

test("usePanZoom disabled default pan does not reset on every render", async () => {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };

  let renders = 0;
  function Probe() {
    renders += 1;
    usePanZoom({ enabled: false });
    return createElement("div");
  }

  try {
    const root = await mountIntoDom(createElement(Probe));

    await act(async () => {
      root.render(createElement(Probe));
    });

    expect(renders).toBeLessThanOrEqual(3);
    expect(errors.join("\n")).not.toContain("Maximum update depth exceeded");
  } finally {
    console.error = originalError;
  }
});
