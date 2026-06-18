import { describe, expect, test } from "bun:test";
import {
  activate,
  assertStep,
  drag,
  fill,
  press,
  submit,
} from "./replay-builders.js";
import { digestUIFixtureRequest } from "../ui-fixture/index.js";
import type { PortableSemanticReplayStep } from "../ui-fixture/index.js";

const request = {
  surface: "gameplay",
  scopeId: "runtime",
  interactionKey: "choose-card",
  interactionId: "choose-card:player-1",
  intent: "invoke",
} satisfies PortableSemanticReplayStep["resolve"];

const target = {
  surface: "gameplay",
  scopeId: "runtime",
  interactionKey: "choose-card",
  interactionId: "choose-card:player-1",
  effect: {
    kind: "setCandidate",
    inputKey: "cardId",
    candidateValue: "ace-hearts",
    beforeSelected: false,
    afterSelected: true,
  },
} satisfies Extract<
  PortableSemanticReplayStep["execute"],
  { kind: "drag" }
>["target"];

const expectDigest = {
  semanticDigest:
    "sha256:0000000000000000000000000000000000000000000000000000000000000000",
};

describe("UI scenario replay builders", () => {
  test("build semantic steps with the existing request digest", () => {
    expect(
      activate({ stepId: "activate", resolve: request, expect: {} }),
    ).toMatchObject({
      stepId: "activate",
      requestDigest: digestUIFixtureRequest(request),
      resolve: request,
      execute: { kind: "activate" },
    });

    expect(
      fill({ stepId: "fill", resolve: request, value: "3", expect: {} }),
    ).toMatchObject({
      execute: { kind: "fill", value: "3" },
    });

    expect(
      drag({ stepId: "drag", resolve: request, target, expect: {} }),
    ).toMatchObject({
      execute: { kind: "drag", target },
    });
  });

  test("keeps press and submit as activate semantics", () => {
    expect(
      press({ stepId: "press", resolve: request, expect: {} }),
    ).toMatchObject({
      execute: { kind: "activate" },
    });
    expect(
      submit({ stepId: "submit", resolve: request, expect: {} }),
    ).toMatchObject({
      execute: { kind: "activate" },
    });
  });

  test("builds assert-only replay steps", () => {
    expect(assertStep("assert-final", expectDigest)).toEqual({
      stepId: "assert-final",
      kind: "assert",
      expect: expectDigest,
    });
  });
});
