# 011 Converge Interaction-Handle Behavior

- Status: Implemented
- Priority: P1
- Risk: Medium
- Effort: Medium
- Primary owner: SDK runtime
- Depends on: 001
- Planned at: `d84c620`

## Summary

Make key-based and descriptor-based interaction hooks use one internal state
machine. Remove duplicated submission, draft, route, dependency, and
auto-submit behavior so both public entry points have identical concurrency
and cleanup semantics.

## Current State

`useInteractionByKey.ts` duplicates much of `useInteractionHandle` but uses
different primitives:

- a local `submittingRef`;
- direct `store.setSubmitting`;
- direct `store.setInput`;
- independent route clear/arm behavior.

The canonical descriptor hook instead uses:

- `claimInteractionSubmit`;
- `clearInteractionRoute`;
- `applyInteractionDraftMutation`;
- `getInteractionDraftReadiness`.

This creates behavioral drift. Two hook instances can disagree on whether a
submission is already claimed, and key-based input mutation can bypass
dependency clearing.

## Contract Decision

There is one interaction-handle state machine. Public hooks differ only in how
they obtain a descriptor:

```text
useInteractionHandle(descriptor) ----\
                                      -> useBoundInteractionHandle(...)
useInteractionByKey(key) ------------/
```

The shared internal hook accepts a nullable descriptor so hook order remains
stable while a key resolves or disappears.

## Scope

### In scope

- shared internal hook;
- atomic submit claim;
- draft mutation and dependent-field clearing;
- route setup and cleanup;
- readiness and validation;
- auto-submit;
- null-to-resolved descriptor transitions;
- concurrency-focused hook tests.

### Out of scope

- changing public interaction descriptor types;
- adding interaction indexes;
- redesigning the draft store;
- UI styling.

## Git Workflow

```sh
git switch -c codex/sdk-hardening-011-interaction-handles
```

Commit:

```text
Converge interaction handle behavior
```

## Implementation Steps

### 1. Extract a nullable internal hook

Create an internal module:

```ts
function useBoundInteractionHandle(
  descriptor: InteractionDescriptor | null,
): InteractionHandle | null {
  // Canonical implementation.
}
```

Move the descriptor-based implementation into this hook rather than copying
the key-based implementation.

### 2. Keep public APIs thin

Descriptor entry point:

```ts
export function useInteractionHandle(
  descriptor: InteractionDescriptor,
): InteractionHandle {
  return useBoundInteractionHandle(descriptor)!;
}
```

Key entry point:

```ts
export function useInteractionByKey(key: string): InteractionHandle | null {
  const descriptor = useInteractionDescriptorByKey(key);
  return useBoundInteractionHandle(descriptor);
}
```

`useBoundInteractionHandle` must always be called, even when the descriptor is
null. Do not conditionally call hooks after key resolution.

### 3. Use the store's atomic submission claim

All submit paths use:

```ts
const claim = claimInteractionSubmit(store, descriptor.id);
if (claim === null) return;

try {
  const result = await runtime.submitInteraction(claim.input);
  completeInteractionSubmit(store, claim, result);
} catch (error) {
  failInteractionSubmit(store, claim, error);
  throw error;
}
```

Remove `submittingRef` and direct `setSubmitting` coordination. A ref only
serializes one hook instance; the store claim serializes all instances bound
to the same interaction.

### 4. Route all draft changes through the canonical mutation helper

Input setters use:

```ts
applyInteractionDraftMutation(store, {
  interactionId: descriptor.id,
  inputId,
  value,
  descriptor,
});
```

This helper remains responsible for clearing dependent values and invalidating
derived readiness. Remove direct `store.setInput` calls from the key-based
hook.

### 5. Derive readiness and validation from one selector

```ts
const readiness = getInteractionDraftReadiness(descriptor, draft);
```

Return the same `canSubmit`, validation errors, missing input IDs, and
submission status from both public hooks. Do not maintain a key-hook-specific
interpretation.

### 6. Centralize route lifecycle

The internal hook owns route registration and cleanup:

```ts
useEffect(() => {
  if (descriptor === null) return;

  armInteractionRoute(store, descriptor.id);
  return () => {
    clearInteractionRoute(store, descriptor.id);
  };
}, [descriptor?.id, store]);
```

Use stable descriptor identity fields in dependencies. A descriptor object
recreated on every snapshot must not repeatedly clear and re-arm a route.

### 7. Keep auto-submit in the shared path

The auto-submit effect:

- runs only when descriptor policy enables it;
- checks canonical readiness;
- attempts the same atomic claim as manual submission;
- does not retry indefinitely after a rejected submission;
- does not submit again when another hook instance already claimed the draft.

Example:

```ts
useEffect(() => {
  if (descriptor === null || !descriptor.autoSubmit || !readiness.canSubmit) {
    return;
  }

  void submit();
}, [descriptor?.id, descriptor?.autoSubmit, readiness.revision, submit]);
```

Use the actual store revision or stable readiness key instead of serializing
the whole draft.

### 8. Preserve failure and success semantics

Define and test:

- failed submit releases the claim and retains the editable draft;
- successful submit clears the completed route and pending state;
- stale async completion cannot clear a newer claim;
- unmount releases only route subscriptions, not another hook's active claim;
- descriptor disappearance returns null without violating hook order.

## Test Plan

Use a React hook harness with the repository's existing DOM test environment.
Add cases for:

- two hook instances bound to one descriptor call runtime submit once;
- manual and auto-submit race results in one runtime call;
- changing a parent input clears dependent child input through both APIs;
- validation/readiness output is identical for key and descriptor hooks;
- null key resolution followed by descriptor availability;
- descriptor removal after being available;
- failed submit retains draft and permits an explicit retry;
- successful submit clears route and pending state;
- stale first completion cannot overwrite a second claim;
- unmounting one of two hook consumers does not disrupt the other.

Example concurrency test:

```tsx
function Harness() {
  const first = useInteractionByKey("attack");
  const second = useInteractionHandle(descriptor);

  return (
    <>
      <button onClick={() => first?.submit()}>first</button>
      <button onClick={() => second.submit()}>second</button>
    </>
  );
}

await act(async () => {
  firstButton.click();
  secondButton.click();
});

expect(runtime.submitInteraction).toHaveBeenCalledTimes(1);
```

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- interaction
pnpm --filter @dreamboard-games/sdk typecheck
pnpm --filter @dreamboard-games/sdk lint
pnpm check
```

## Done Criteria

- Both public hooks delegate to one internal implementation.
- No hook-local submission lock remains.
- All input mutation uses dependency-aware draft helpers.
- Route, readiness, validation, and auto-submit semantics are identical.
- Multiple hook instances cannot double-submit one draft.
- Null/resolved descriptor transitions preserve hook order.

## STOP Conditions

- Stop if the store claim is not safe against stale async completion. Fix the
  claim token contract before consolidating hooks.
- Stop if a key can resolve to multiple descriptors. Define deterministic key
  semantics before implementing the wrapper.
- Stop if existing public hooks intentionally differ. Document and split that
  behavior into named policy options rather than retaining duplicate code.

## Maintenance

New interaction hook variants resolve a descriptor and delegate to
`useBoundInteractionHandle`; they do not implement their own submission state
machine.
