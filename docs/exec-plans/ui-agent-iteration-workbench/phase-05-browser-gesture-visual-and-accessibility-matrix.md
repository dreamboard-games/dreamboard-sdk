# Phase 05: Browser, Gesture, Visual, And Accessibility Matrix

Status: complete for the required Workbench foundation.

Source closeout is recorded in
`docs/exec-plans/ui-agent-iteration-workbench/artifacts/phase-05-browser-gesture-visual-accessibility.md`.
The deterministic SDK and Workbench implementation includes Hearts click/tap,
Hex Network Trading desktop pointer drag, and Worker Placement Tableau runtime
draft. Mobile touch-drag promotion runs and real-device canaries are follow-up
expansion.

## Objective

Prove the required set under real desktop click, browser tap, pointer drag, and
runtime draft input while pairing visual evidence with semantic, layout, Axe,
and runtime assertions.

Synthetic React handlers or `dispatchEvent` calls are not sufficient for the
golden gesture path.

## 05A. Extend the semantic protocol for pointer targets

The current browser-interaction protocol `2.0.0` can identify pointer
actuators, but it does not model a drop target as a first-class semantic
record. Promote pointer targets into the same protocol and publish a major
version update.

Target additions:

```ts
export interface BrowserInteractionPointerTarget {
  readonly targetId: string;
  readonly enabled: boolean;
  readonly acceptedEffectPatterns: readonly BrowserInteractionEffectPattern[];
  readonly descriptorDigest?: string;
  readonly diagnostics: readonly BrowserInteractionDiagnostic[];
}

export interface BrowserInteractionEntity {
  readonly interactionKey: string;
  readonly interactionId: string;
  readonly actuators: readonly BrowserInteractionActuator[];
  readonly pointerTargets: readonly BrowserInteractionPointerTarget[];
  // Existing fields remain.
}

export const BROWSER_INTERACTION_RECORD_ROLES = [
  "interaction",
  "actuator",
  "pointer-target",
] as const;
```

Add normalized attributes through the existing attribute helpers:

```ts
export const BROWSER_INTERACTION_ATTRIBUTES = {
  // Existing protocol attributes.
  pointerTargetId: "data-dreamboard-pointer-target-id",
  pointerTargetEnabled: "data-dreamboard-pointer-target-enabled",
} as const;
```

Pointer targets reuse the existing `acceptedEffectPatterns`,
`descriptorDigest`, surface, scope, interaction key, and interaction ID
attributes.

The new resolver accepts the existing `BrowserInteractionEffectRequest` and
must return exactly one compatible pointer target or a typed diagnostic.
Generated hand, staging, zone, and board drop surfaces emit these records
through shared runtime adapters.

Do not add Workbench-only `data-testid` values or target selectors.

Because strict consumers validate protocol identity, update the protocol to
`3.0.0`, update fixture bundle declarations, and provide an explicit migration
error for `2.0.0` fixtures requiring drag targets.

## 05B. Implement one semantic browser driver

Place the driver in the private Workbench package but import all normalization
and resolution logic from `@dreamboard-games/sdk/browser-interaction`.

Example flow:

```ts
async function executeFixtureStep(page: Page, step: UIScenarioReplayStep) {
  const semanticSnapshot = await readBrowserInteractionSnapshot(page);
  const source = resolveBrowserInteractionRequest(
    semanticSnapshot,
    step.resolve,
  );

  if (!source.ok) {
    throw new SemanticResolutionError(source);
  }

  switch (step.execute.kind) {
    case "activate":
      await activateResolvedActuator(page, source);
      break;
    case "fill":
      await fillResolvedActuator(page, source, step.execute.value);
      break;
    case "drag": {
      const target = resolveBrowserPointerTarget(
        semanticSnapshot,
        step.execute.target,
      );
      if (!target.ok) {
        throw new SemanticResolutionError(target);
      }
      await dragResolvedActuator(page, source, target);
      break;
    }
  }

  await assertStepExpectation(page, step.expect);
}
```

The DOM locator step may use exact protocol attributes returned by the
resolver. It may not search visible text, accessible label, CSS component
classes, DOM position, or a generic role as a fallback.

Preparation chains are executed through the existing semantic preparation
records. Ambiguous, unavailable, disabled, or stale targets fail.

## 05C. Use physical mouse and touch input

Desktop drag uses Playwright mouse input:

```ts
async function mouseDrag(page: Page, from: Point, to: Point) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}
```

Chromium mobile drag uses the browser input pipeline through CDP:

```ts
async function touchDrag(page: Page, from: Point, to: Point) {
  const cdp = await page.context().newCDPSession(page);
  const path = interpolatePoints(from, to, 12);

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y, id: 1 }],
  });

  for (const point of path) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: point.x, y: point.y, id: 1 }],
    });
  }

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}
```

This is allowed because it sends browser-level input. Calling
`element.dispatchEvent`, React handlers, or a fixture runtime mutation directly
is not allowed in the golden gesture tests.

Add separate negative gesture cases:

- movement below drag threshold;
- drag canceled outside a target;
- drag to a disabled target;
- drag across a scrollable phone viewport;
- second pointer or interrupted touch where supported;
- target disappears after preparation;
- reduced-motion mode.

## 05D. Define the browser matrix

```ts
// packages/ui-workbench/playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: "chromium-desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
        hasTouch: false,
      },
    },
    {
      name: "chromium-touch-phone",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "webkit-phone",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
```

Required Workbench foundation coverage:

| Capability             | Chromium desktop | Chromium touch phone  | WebKit phone   |
| ---------------------- | ---------------- | --------------------- | -------------- |
| Layout and screenshots | Required         | Required              | Smoke          |
| Click/tap              | Required         | Required              | Required       |
| Keyboard and focus     | Storybook        | Not required          | Smoke          |
| Physical pointer drag  | Required         | Not applicable        | Not applicable |
| Physical touch drag    | Not applicable   | Follow-up through CDP | Not applicable |
| Runtime draft mutation | Required         | Not applicable        | Not applicable |
| Semantic snapshot      | Required         | Required              | Required       |
| Runtime transcript     | Required         | Required              | Required       |
| Axe scan               | Required         | Required              | Required       |

Do not claim cross-browser touch-drag parity until the automation stack can
send equivalent browser-level input to WebKit. WebKit still protects layout,
tap, focus, and accessibility behavior.

## 05E. Pair visual and semantic assertions

Every stateful golden scenario assertion includes:

1. semantic browser-interaction snapshot;
2. fixture runtime transcript;
3. projection and draft digests;
4. screenshot at named checkpoints;
5. accessibility scan;
6. focus assertion when keyboard or dialog behavior is involved.

Example:

```ts
test("hearts pass-three mobile", async ({ page }) => {
  const scenario = await openScenario(page, "hearts.pass-three.mobile");

  await scenario.runReplay();

  await expect(scenario.root).toHaveScreenshot("selected-three-cards.png");
  expect(await scenario.semanticDigest()).toBe("sha256:...");
  expect(await scenario.projectionDigest()).toBe("sha256:...");
  expect(await scenario.submissionDigest()).toBe("sha256:...");
  await scenario.assertNoRuntimeDiagnostics();
  await scenario.assertAccessible();
  await scenario.assertFixtureConsumed();
});
```

Screenshot masking is allowed only for documented host chrome or intentionally
non-deterministic user content. Do not mask the component under test,
interaction target, focus state, validation state, or mobile overlay geometry.

## 05F. Add layout invariants for responsive UI

Screenshots alone can miss clipped or inaccessible controls. Add reusable
assertions:

```ts
await expectNoHorizontalOverflow(page);
await expectAllEnabledActuatorsInViewport(page);
await expectNoOverlap(handBounds, actionPanelBounds);
await expectMinimumTouchTargetSize(page, { width: 44, height: 44 });
await expectDialogWithinSafeArea(page);
```

Use SDK-owned data attributes or resolved semantic entities to locate measured
elements. Component-specific CSS selectors are allowed only inside the
component's pure Storybook test, not the Workbench protocol.

## 05G. Control flake and evidence

The browser suite must:

- use checked-in fonts;
- wait for `document.fonts.ready`;
- force UTC and `en-US`;
- use reduced motion;
- use device scale factor 1 for golden screenshots;
- block external network;
- wait on frame/digest changes, not arbitrary sleeps;
- retain trace, screenshot diff, semantic snapshot, and transcript on failure;
- retry only in CI and report first-attempt failure separately;
- run each new gesture scenario repeatedly before promotion to the required
  gate.

Promotion threshold:

- 50 consecutive local or CI passes for a new golden gesture test;
- no unreviewed retry-only passes;
- deterministic artifact paths and digests;
- failure injection proves the test detects a broken drop or submit.

## 05H. Define the follow-up real-device mobile canary

Chromium touch emulation and WebKit phone are the foundation gate. A later
gesture expansion can run selected golden scenarios on:

- current iOS Safari on a real iPhone;
- current Android Chrome on a real phone.

Use a device farm when available. Until then, retain a signed manual release
receipt with browser/OS versions, fixture and SDK digests, screenshots, and the
semantic/runtime transcript.

The canary must cover:

- opening and resizing the mobile hand tray;
- dragging a card into staging or a valid target;
- canceling a drag;
- committing the interaction;
- focus and dialog behavior after the touch interaction.

The canary is not required for the Hearts foundation. Release owners can make
it mandatory by invoking `pnpm ui:release-proof --require-device-canary`.

## Expected files

```text
packages/sdk/src/browser-interaction/constants.ts
packages/sdk/src/browser-interaction/types.ts
packages/sdk/src/browser-interaction/schemas.ts
packages/sdk/src/browser-interaction/attributes.ts
packages/sdk/src/browser-interaction/normalize.ts
packages/sdk/src/browser-interaction/resolve.ts
packages/sdk/src/browser-interaction/*.test.ts
packages/sdk/src/runtime/primitives/hand-surface.tsx
packages/sdk/src/runtime/primitives/board.tsx
packages/ui-workbench/playwright.config.ts
packages/ui-workbench/tests/driver/**
packages/ui-workbench/tests/scenarios/**
packages/ui-workbench/tests/assertions/**
```

## Verification

```bash
pnpm --filter @dreamboard-games/sdk test
pnpm ui:test --required
pnpm ui:test:visual
```

Run a deliberate failure check by disabling the target drop handler and proving
that semantic, transcript, and screenshot assertions fail.

## Acceptance criteria

- Pointer targets are represented by the versioned SDK browser-interaction
  protocol.
- The Workbench has one semantic driver with no text or DOM-position fallback.
- The semantic driver executes the required desktop pointer-drag scenario
  without text or DOM-position fallback.
- The required draft scenario fills bounded input, observes draft readiness,
  and commits the resulting parameters.
- Hearts pairs screenshots with semantic and runtime evidence.
- Chromium desktop, Chromium touch phone, and WebKit phone include Axe and
  layout invariants.
- WebKit coverage is described accurately and does not overstate touch-drag
  confidence.
- Real-device canary and gesture promotion requirements are explicitly
  follow-up policy, not implicit foundation blockers.

## Risks and controls

| Risk                                            | Control                                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| CDP tests pass while React events are broken    | CDP drives Chromium's browser input pipeline and resulting runtime transcript is asserted |
| Protocol v3 breaks existing automation silently | Strict protocol identity, migration errors, and fixture regeneration                      |
| Pixel baselines become noisy                    | Stable fonts/environment plus semantic and layout assertions                              |
| Selectors drift with markup refactors           | Resolve through versioned semantic attributes                                             |
| Mobile drag works only in Chromium              | State the boundary and retain WebKit layout/tap/a11y smoke                                |
