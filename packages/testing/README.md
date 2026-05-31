# @dreamboard-games/testing

Reducer-native authored testing helpers for Dreamboard workspaces.

The package provides:

- `defineBase(...)` and `defineScenario(...)` identity helpers
- inherited base composition via `extends`
- matcher construction via `createExpectApi(...)`
- rejection assertions via `toRejectWith({ errorCode })`
- descriptor matchers such as `toHaveInteraction(...)`,
  `toBeGatedBy(...)`, and `toBeActiveFor(...)`
- `createTestRuntime(...)` for backend-free UI tests against real reducer
  state

---

## Matchers reference

`createExpectApi()` returns an `expect` function that exposes a chainable
matcher surface. All matchers throw synchronously on mismatch, except
`toRejectWith(...)` which returns a promise.

### Value matchers

| Matcher                             | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `toBe(expected)`                    | Strict equality (`===`)                      |
| `toEqual(expected)`                 | Deep equality                                |
| `toMatchObject(partial)`            | Deep partial match against an object tree    |
| `toBeDefined()` / `toBeUndefined()` | Presence checks                              |
| `toBeNull()`                        | Null check                                   |
| `toContain(expected)`               | Array or string containment                  |
| `toContainEqual(expected)`          | Array containment by deep equality           |
| `toHaveLength(n)`                   | Length check on arrays and strings           |
| `toBeGreaterThanOrEqual(n)`         | Numeric ordering                             |
| `toThrow(predicate?)`               | Synchronous throw assertion                  |
| `toMatchSnapshot(filename?)`        | Delegates to the configured snapshot handler |

### Rejection matcher

```ts
await expect(() =>
  game.submit(seat(1), "placeThingCard", {
    cardId: "a-dog",
    ringId: "ring-1",
  }),
).toRejectWith({ errorCode: "CARD_NOT_IN_HAND" });
```

`toRejectWith` awaits the function (or promise) and asserts the thrown
error carries the named `errorCode`. An optional `message` (string or
`RegExp`) can further constrain the rejection.

### Descriptor matchers

Descriptor matchers operate on the interaction descriptors returned by
`interactions(playerId)` in a scenario context.

```ts
expect(interactions(seat(0))).toHaveInteraction("judgePlacement", {
  kind: "prompt",
});

expect(interactions(seat(1))).not.toHaveInteraction("judgePlacement");

expect(interactions(seat(0))).toBeActiveFor(seat(0), {
  interactionId: "judgePlacement",
});

expect(interactions(seat(1))).toBeGatedBy("NOT_YOUR_TURN", {
  interactionId: "placeThingCard",
});
```

When asserting against a single descriptor (for example, one returned
from a lookup), the `opts.interactionId` argument can be omitted:

```ts
const descriptor = interactions(seat(0)).find(
  (entry) => entry.interactionId === "judgePlacement",
);
expect(descriptor).toBeActiveFor(seat(0));
```

---

## Authorization invariants — rewritten descriptor scenario

The rewritten `reject-non-knower-cannot-judge` scenario in
`examples/things-in-rings/test/scenarios/` demonstrates how descriptor
matchers replace ad-hoc inspection of `context.to` and
`availability.reason`:

```ts
import { defineScenario } from "../testing-types";

export default defineScenario({
  id: "reject-non-knower-cannot-judge",
  description:
    "Only the knower can act during judgeRings, so the pending card remains in place",
  from: "after-first-placement",
  phase: "judgeRings",
  when: async ({ game, seat, expect }) => {
    const placer = seat(1);
    await expect(() =>
      game.submit(placer, "judgePlacement", { decision: "ring-1" }),
    ).toRejectWith({ errorCode: "prompt-not-owned" });
  },
  then: ({ state, interactions, expect, seat }) => {
    const knowerId = seat(0);
    const placerId = seat(1);

    expect(state()).toBe("judgeRings");

    // Descriptor must exist for the knower with the right kind.
    expect(interactions(knowerId)).toHaveInteraction("judgePlacement", {
      kind: "prompt",
    });

    // Descriptor must be active (available) for the knower.
    expect(interactions(knowerId)).toBeActiveFor(knowerId, {
      interactionId: "judgePlacement",
    });

    // Descriptor must be absent for non-knowers.
    expect(interactions(placerId)).not.toHaveInteraction("judgePlacement");
  },
});
```

The previous variant of this scenario inspected descriptor shapes
inline. The matcher-driven version encodes the same invariants —
"prompt exists", "prompt is active for the knower", "prompt is absent
for others" — without leaking descriptor layout into the scenario body.

---

## `createTestRuntime` for backend-free UI tests

`createTestRuntime` returns a runtime object compatible with the
`@dreamboard-games/ui-runtime` `RuntimeAPI` plus snapshot/subscription helpers.
The canonical harness for a plugin component renders it inside
`RuntimeProvider` and `PluginStateProvider`:

```tsx
import {
  PluginStateProvider,
  RuntimeProvider,
} from "@dreamboard-games/ui-runtime";
import { createTestRuntime } from "./testing-types";

const rt = createTestRuntime({
  baseId: "initial-turn",
  phase: "placeThing",
  controllingPlayerId: "player-1",
});

const markup = renderToString(
  <RuntimeProvider runtime={rt.runtime}>
    <PluginStateProvider>
      <MyPluginComponent />
    </PluginStateProvider>
  </RuntimeProvider>,
);

await rt.submit(rt.seat(1), "placeThingCard", {
  cardId: "a-diamond",
  ringId: "ring-1",
});

// After submit, a fresh snapshot flows through the store and any
// subsequent render reflects the updated gameplay state.
```

Internally `createTestRuntime` builds reducer-native plugin snapshots from the
reducer contract projection, so authored tests do not depend on product-repo
host runtime packages.
