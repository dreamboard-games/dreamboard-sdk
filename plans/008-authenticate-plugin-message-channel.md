# 008 Authenticate the Plugin Message Channel

- Status: Proposed
- Priority: P0
- Risk: Critical
- Effort: Large
- Primary owner: SDK runtime + private host
- Depends on: 001
- Planned at: `d84c620`

## Summary

Replace unauthenticated wildcard `postMessage` traffic with a versioned,
per-iframe channel handshake. Bind every accepted message to the expected
window, host origin, and high-entropy channel ID without exposing manual
binding through the public API.

## Current State

`packages/sdk/src/runtime/api/createPluginRuntimeAPI.ts` currently:

- sends messages to `window.parent` with target origin `"*"`;
- accepts inbound messages without checking `event.source`;
- accepts inbound messages without pinning `event.origin`;
- has no per-plugin channel identifier.

`PluginStateContext.tsx` has another direct wildcard send path.

The private host in
`/Users/kevintang/code/internal/packages/ui-host-runtime` checks some source and
origin properties, but `plugin-session-gateway.ts` still configures `"*"` as
the target origin. Preview-worker has a separate wildcard implementation.

A hostile sibling frame or unexpected parent navigation can therefore inject
messages that look structurally valid. A forged submit result is especially
dangerous because it can resolve an in-flight interaction.

## Protocol Decision

Use a coordinated hard cut to protocol version 2:

```ts
type PluginEnvelope<Payload> = {
  protocol: "dreamboard-plugin";
  version: 2;
  channelId: string;
  payload: Payload;
};
```

The host generates a unique, cryptographically random channel per iframe.
There is no unauthenticated version-1 fallback.

Sandboxed `srcdoc` plugins can have opaque origin `"null"`, so host-to-plugin
delivery may still require target origin `"*"`. In that case security comes
from the exact target window plus the unguessable channel ID. Plugin-to-host
messages use the host origin captured during the handshake.

## Git Workflow

Record starting SHAs:

```sh
git -C /Users/kevintang/code/dreamboard-sdk rev-parse HEAD
git -C /Users/kevintang/code/internal rev-parse HEAD
```

SDK branch and commit:

```sh
git switch -c codex/sdk-hardening-008-plugin-channel
git commit -m "Authenticate plugin runtime messages"
```

Private host branch and commit:

```sh
git -C /Users/kevintang/code/internal \
  switch -c codex/plugin-host-hardening-008-channel
git -C /Users/kevintang/code/internal \
  commit -m "Authenticate plugin host messages"
```

Land neither side independently in a released environment. Link the two pull
requests and test them against the same local SDK snapshot.

## Implementation Steps

### 1. Define versioned envelope schemas

In the SDK, define the envelope near the runtime message schemas:

```ts
const PluginEnvelopeBaseSchema = z
  .object({
    protocol: z.literal("dreamboard-plugin"),
    version: z.literal(2),
    channelId: z.string().min(32).max(256),
  })
  .strict();

const PluginInitEnvelopeSchema = PluginEnvelopeBaseSchema.extend({
  payload: z
    .object({
      type: z.literal("init"),
      state: PluginStateSnapshotSchema,
    })
    .strict(),
});
```

The private host must use an equivalent schema and fixture set. Prefer a
generated/shared protocol contract if one already fits the repository
boundary; do not import private host code into the public SDK.

### 2. Generate a fresh channel for each iframe session

At host session creation:

```ts
const channelId = crypto.randomUUID();

const gateway = new PluginSessionGateway({
  iframe,
  channelId,
  // existing callbacks
});
```

Do not derive the channel from a game, plugin, player, or session identifier.
Recreating an iframe creates a new channel.

## SDK Implementation

### 1. Model handshake state internally

Extend private runtime state, not public API options:

```ts
type PluginChannel = {
  channelId: string;
  hostOrigin: string;
  hostWindow: Window;
};

let channel: PluginChannel | null = null;
```

`PluginRuntimeAPIOptions` must not require callers to manually pass an origin
or channel.

### 2. Accept only a valid initialization message before binding

The first accepted message must satisfy:

```ts
function handleWindowMessage(event: MessageEvent<unknown>): void {
  if (event.source !== window.parent) return;

  if (channel === null) {
    const result = PluginInitEnvelopeSchema.safeParse(event.data);
    if (!result.success) return;

    channel = {
      channelId: result.data.channelId,
      hostOrigin: event.origin,
      hostWindow: window.parent,
    };
    applyInitialState(result.data.payload.state);
    return;
  }

  if (
    event.source !== channel.hostWindow ||
    event.origin !== channel.hostOrigin
  ) {
    return;
  }

  handleAuthenticatedEnvelope(event.data, channel);
}
```

Capture `"null"` if that is genuinely the parent origin, but do not allow the
origin to change after binding.

### 3. Centralize outbound messages

Replace every direct `postMessage` call, including notification mutations:

```ts
function postToHost(payload: PluginToHostPayload): void {
  if (channel === null) {
    throw new Error("Plugin runtime is not initialized.");
  }

  channel.hostWindow.postMessage(
    {
      protocol: "dreamboard-plugin",
      version: 2,
      channelId: channel.channelId,
      payload,
    },
    channel.hostOrigin,
  );
}
```

If a runtime operation is allowed before initialization today, queue it with a
strict bounded queue or fail explicitly. Do not send an unbound message.

### 4. Require channel equality before payload dispatch

```ts
function handleAuthenticatedEnvelope(
  value: unknown,
  expected: PluginChannel,
): void {
  const envelope = HostToPluginEnvelopeSchema.safeParse(value);
  if (!envelope.success) return;
  if (envelope.data.channelId !== expected.channelId) return;
  dispatchHostPayload(envelope.data.payload);
}
```

Phase 009 will strengthen recursive payload validation and limits; this phase
must still enforce the envelope and top-level payload discriminator.

## Private Host Implementation

### 1. Bind incoming messages to window, origin, and channel

In `plugin-bridge.ts`:

```ts
if (event.source !== iframe.contentWindow) return;
if (!allowedPluginOrigins.has(event.origin)) return;

const envelope = PluginToHostEnvelopeSchema.safeParse(event.data);
if (!envelope.success || envelope.data.channelId !== channelId) return;

dispatchPluginPayload(envelope.data.payload);
```

Retain explicit support for the opaque `"null"` origin only for the sandboxed
iframe configuration that needs it.

### 2. Choose the narrowest host-to-plugin target origin

```ts
const targetOrigin =
  expectedPluginOrigin === "null" ? "*" : expectedPluginOrigin;

iframe.contentWindow?.postMessage(envelope, targetOrigin);
```

Wildcard target origin is allowed only for the exact opaque iframe window and
an authenticated channel envelope. Same-origin development and ordinary URL
iframes use the exact expected origin.

### 3. Invalidate the channel on teardown

On iframe replacement, session close, or gateway disposal:

- remove message listeners;
- mark the gateway closed;
- discard the channel ID;
- reject or cancel in-flight requests;
- ignore late messages from the previous iframe.

### 4. Update preview-worker

Apply the same protocol in
`apps/preview-worker/src/playwright-renderer.ts`. The Playwright page must:

- generate or receive a fresh channel;
- validate source and channel on every message;
- use exact target origin where possible;
- remove listeners after completion;
- reject a forged completion/result message.

Do not maintain a preview-only legacy protocol.

## Test Plan

SDK tests:

- valid init from `window.parent` binds once;
- pre-init state sync is ignored;
- init from another window is ignored;
- second init with another origin or channel cannot rebind;
- wrong source, origin, protocol, version, or channel is ignored;
- outbound calls before init fail deterministically;
- outbound notification and interaction messages use the shared helper;
- forged submit result cannot settle an in-flight submission;
- disposal ignores late host messages.

Host tests:

- exact iframe source is required;
- allowed origin plus wrong channel is rejected;
- correct channel plus wrong origin is rejected;
- opaque-origin iframe sends use wildcard only to its exact window;
- iframe replacement invalidates the old channel;
- preview-worker rejects wrong-source and wrong-channel completion.

Commands:

```sh
pnpm --filter @dreamboard-games/sdk test -- plugin
pnpm --filter @dreamboard-games/sdk typecheck
pnpm check

pnpm --dir /Users/kevintang/code/internal \
  --filter @dreamboard-games/ui-host-runtime test
pnpm --dir /Users/kevintang/code/internal \
  --filter @dreamboard-games/ui-host-runtime build
pnpm --dir /Users/kevintang/code/internal \
  --filter @dreamboard/preview-worker test
pnpm --dir /Users/kevintang/code/internal \
  --filter @dreamboard/preview-worker build
```

Run the private host and preview-worker against the local SDK snapshot before
either pull request is marked ready.

## Rollout

1. Merge compatible SDK and host commits behind the same deployment train.
2. Deploy the private host and plugin assets together.
3. Verify handshake diagnostics in development and staging.
4. Publish the SDK alpha only after host compatibility tests pass.
5. Remove temporary handshake diagnostics once the rollout is confirmed.

## Done Criteria

- Every message uses protocol version 2 and a per-iframe channel ID.
- SDK accepts initialization only from `window.parent`.
- Origin and source are pinned after the handshake.
- Host validates exact iframe window, allowed origin, and channel.
- No direct wildcard SDK send path remains.
- Preview-worker follows the same authenticated protocol.
- Old channels cannot affect replacement sessions.

## STOP Conditions

- Stop if any production host path cannot carry the envelope. Upgrade that
  path before releasing; do not add an unauthenticated fallback.
- Stop if an iframe configuration cannot identify its exact source window.
  Redesign iframe ownership before accepting messages.
- Stop if a public API change is proposed solely to make callers manually bind
  channels. Keep handshake resolution inside runtime and host infrastructure.

## Maintenance

Future protocol changes increment the version and ship with cross-repository
fixtures. Every new message path must use the centralized envelope helpers.
