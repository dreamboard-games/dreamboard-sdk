import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { createElement, useEffect } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PluginRuntimeBoundary } from "../components/PluginRuntimeBoundary.js";
import type { PluginRuntimeClient } from "../core/types.js";
import type { InteractionDescriptor } from "../types/plugin-state.js";
import {
  makeTestGameplayFrame,
  makeTestRuntimeHarness,
} from "../test-runtime-harness.js";
import { ValidationError } from "../../ui/errors/ValidationError.js";
import { useInteractionByKey } from "./useInteractionByKey.js";
import {
  type InteractionHandle,
  useInteractionHandle,
} from "./useInteractionHandle.js";

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

interface MountedDom {
  host: HTMLDivElement;
  root: Root;
}

async function mountIntoDom(element: React.ReactElement): Promise<MountedDom> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(element);
  });
  return { host, root };
}

async function unmount({ host, root }: MountedDom): Promise<void> {
  await act(async () => {
    root.unmount();
  });
  host.remove();
}

function descriptor(
  inputs: InteractionDescriptor["inputs"] = [],
): InteractionDescriptor {
  return {
    phaseName: "play",
    interactionKey: "play.placeCard",
    interactionId: "placeCard",
    surface: "panel",
    kind: "action",
    label: "Place card",
    inputs,
    commit: { mode: "manual" },
    availability: { status: "available" },
  };
}

function dependencyDescriptor(): InteractionDescriptor {
  return descriptor([
    {
      key: "cardId",
      kind: "card",
      domain: {
        type: "cardTarget",
        projection: "resolved",
        eligibleTargets: ["card-1", "card-2"],
      },
    },
    {
      key: "spaceId",
      kind: "board-space",
      domain: {
        type: "boardTarget",
        projection: "resolved",
        targetKind: "space",
        eligibleTargets: ["hex-a"],
        dependencies: {
          mode: "eager",
          dependentCases: [
            {
              when: { cardId: "card-1" },
              domain: {
                type: "boardTarget",
                projection: "resolved",
                targetKind: "space",
                eligibleTargets: ["hex-a"],
              },
            },
          ],
        },
      },
    },
  ]);
}

function makeSnapshot({
  gameVersion,
  interactions = [],
}: {
  gameVersion: number;
  interactions?: readonly InteractionDescriptor[];
}) {
  return makeTestGameplayFrame({
    gameVersion,
    view: {},
    currentPhase: "play",
    availableInteractions: interactions,
  });
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function RuntimeHarness({
  runtime,
  children,
}: {
  runtime: PluginRuntimeClient;
  children: React.ReactNode;
}) {
  return createElement(PluginRuntimeBoundary, { runtime }, children);
}

test("descriptor and key handles share one atomic submission claim", async () => {
  const interaction = descriptor();
  const harness = makeTestRuntimeHarness(
    makeSnapshot({ gameVersion: 1, interactions: [interaction] }),
  );
  const pendingSubmit = deferred();
  harness.setSubmitImpl(async (interactionId, params) => {
    harness.submitCalls.push({ interactionId, params });
    await pendingSubmit.promise;
  });

  let descriptorHandle: InteractionHandle | null = null;
  let keyHandle: InteractionHandle | null = null;

  function Handles({
    onHandles,
  }: {
    onHandles: (
      descriptor: InteractionHandle,
      key: InteractionHandle | null,
    ) => void;
  }) {
    const nextDescriptorHandle = useInteractionHandle(interaction);
    const nextKeyHandle = useInteractionByKey(interaction.interactionKey);
    useEffect(() => {
      onHandles(nextDescriptorHandle, nextKeyHandle);
    }, [nextDescriptorHandle, nextKeyHandle, onHandles]);
    return null;
  }

  const mounted = await mountIntoDom(
    createElement(
      RuntimeHarness,
      { runtime: harness.runtime },
      createElement(Handles, {
        onHandles: (nextDescriptorHandle, nextKeyHandle) => {
          descriptorHandle = nextDescriptorHandle;
          keyHandle = nextKeyHandle;
        },
      }),
    ),
  );

  let firstSubmit!: Promise<void>;
  let secondSubmit!: Promise<unknown>;
  await act(async () => {
    firstSubmit = descriptorHandle!.submit({});
    secondSubmit = keyHandle!.submit({}).catch((error: unknown) => error);
  });
  expect(harness.submitCalls).toHaveLength(1);

  let secondError: unknown = null;
  await act(async () => {
    pendingSubmit.resolve();
    await firstSubmit;
    secondError = await secondSubmit;
  });
  expect(secondError).toBeInstanceOf(ValidationError);
  expect((secondError as ValidationError).errorCode).toBe("SUBMITTING");
  expect(harness.submitCalls).toHaveLength(1);

  await unmount(mounted);
});

test("key handles resolve null to a descriptor without changing hook order", async () => {
  const interaction = descriptor();
  const harness = makeTestRuntimeHarness(makeSnapshot({ gameVersion: 1 }));
  let keyHandle: InteractionHandle | null = null;

  function KeyHandle({
    onHandle,
  }: {
    onHandle: (handle: InteractionHandle | null) => void;
  }) {
    const nextKeyHandle = useInteractionByKey(interaction.interactionKey);
    useEffect(() => {
      onHandle(nextKeyHandle);
    }, [nextKeyHandle, onHandle]);
    return null;
  }

  const mounted = await mountIntoDom(
    createElement(
      RuntimeHarness,
      { runtime: harness.runtime },
      createElement(KeyHandle, {
        onHandle: (nextKeyHandle) => {
          keyHandle = nextKeyHandle;
        },
      }),
    ),
  );

  expect(keyHandle).toBeNull();

  await act(async () => {
    harness.emit(makeSnapshot({ gameVersion: 2, interactions: [interaction] }));
  });

  expect(keyHandle?.descriptor.interactionKey).toBe(interaction.interactionKey);

  await act(async () => {
    harness.emit(makeSnapshot({ gameVersion: 3 }));
  });

  expect(keyHandle).toBeNull();

  await unmount(mounted);
});

test("key and descriptor handles share canonical dependent draft clearing", async () => {
  const interaction = dependencyDescriptor();
  const harness = makeTestRuntimeHarness(
    makeSnapshot({ gameVersion: 1, interactions: [interaction] }),
  );
  let descriptorHandle: InteractionHandle<Record<string, unknown>> | null =
    null;
  let keyHandle: InteractionHandle<Record<string, unknown>> | null = null;

  function Handles({
    onHandles,
  }: {
    onHandles: (
      descriptor: InteractionHandle<Record<string, unknown>>,
      key: InteractionHandle<Record<string, unknown>> | null,
    ) => void;
  }) {
    const nextDescriptorHandle =
      useInteractionHandle<Record<string, unknown>>(interaction);
    const nextKeyHandle = useInteractionByKey<string, Record<string, unknown>>(
      interaction.interactionKey,
    );
    useEffect(() => {
      onHandles(nextDescriptorHandle, nextKeyHandle);
    }, [nextDescriptorHandle, nextKeyHandle, onHandles]);
    return null;
  }

  const mounted = await mountIntoDom(
    createElement(
      RuntimeHarness,
      { runtime: harness.runtime },
      createElement(Handles, {
        onHandles: (nextDescriptorHandle, nextKeyHandle) => {
          descriptorHandle = nextDescriptorHandle;
          keyHandle = nextKeyHandle;
        },
      }),
    ),
  );

  await act(async () => {
    descriptorHandle!.setInput("cardId", "card-1");
  });
  await act(async () => {
    descriptorHandle!.setInput("spaceId", "hex-a");
  });
  expect(descriptorHandle!.draft).toEqual({
    cardId: "card-1",
    spaceId: "hex-a",
  });

  await act(async () => {
    keyHandle!.setInput("cardId", "card-2");
  });

  expect(keyHandle!.draft).toEqual({ cardId: "card-2" });
  expect(descriptorHandle!.draft).toEqual({ cardId: "card-2" });

  await unmount(mounted);
});
