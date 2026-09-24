# Headless instance review constraints

Preparation for layer 004; this is not an implemented API receipt.

The headless instance must consume a selected-seat projection and a source.
Hosted UI imports game types only; do not require executable `createGame` output
at runtime. Keep a stable instance and immutable snapshots, with prototype
methods/getters for per-snapshot objects. Feature APIs must be absent at runtime
and in types when disabled. Use TanStack Store rather than another custom store.

Root checked current official TanStack Table v9 documentation and npm metadata
on 2026-09-24. The source versions at implementation time remain authoritative.
The observed store/react-store version is 0.11.1; honeycomb-grid is 4.1.5.

Useful primary references:

- https://tanstack.com/table/latest/docs/framework/react/guide/migrating
- https://tanstack.com/table/latest/docs/framework/react/guide/custom-features
- https://tanstack.com/store/latest/docs/overview

## Concrete review cases

- Controlled drafts and active interaction notify the owner without writing a
  competing internal copy. New options must be observed by stable handlers.
- Sources own retry, IDs, transport basis, disconnect and cleanup. Never retry
  rejected intent with a newer basis. Keep pending persisted selections separate
  from the instance's unfinished local input values.
- Independent inputs submit together; step interactions submit only the current
  step. Never replay a whole bag as an invisible sequence of step commits.
- An ACK does not itself install the next authoritative frame. Keep step
  advancement blocked until the relevant frame is available; cover ACK/frame
  order and retry after reconnect without a stuck submission state.
- Existing internal connection.ts sends an ACK then queues a repairing snapshot.
  Its session notify may have already queued another snapshot. Do not assume a
  universally synchronous frame-before-ACK order when designing sources.
- Preserve defaults as editable suggestions, explicit nullable choices, and
  atomic many-selection cardinality. Reconcile only local values affected by
  new projected domains; authoritative prefix reconciliation stays on the server.
- Target ambiguity requires the caller to identify the interaction; don't
  choose an arbitrary route. Reuse the meaningful routing logic and delete old
  dependency-cascade machinery after its callers move.
- Dispose unsubscribes and rejects unsettled requests, including owned timers;
  switching a source/seat cannot let old responses alter the new instance.
- React selector results must remain stable until their selected values change.
  Prefer the maintained adapter where it fits; don't recreate selector caching
  merely to avoid a small framework adapter dependency.
- External store writes do not become React transitions simply because they
  occur inside startTransition. Optional animation belongs to registry/app code.

Prove complete headless Hearts replay, source lifecycle and controlled-state
round trips, explicit step cancellation, selector render isolation, feature type
gating, and browser import closure that excludes reducer execution.

## Accepted source lifecycle refinement

The original ACK-only source shape needs one small addition: publish connection
and request status together with the selected-seat snapshot, through the same
stable external-store snapshot and notify-only subscription. Keep a single
in-flight request per source. Its public status names the interaction, operation
(`submit` or `cancel`), and `awaiting-result`/`awaiting-frame`; its captured command,
ID, basis and settlement callbacks stay private to transport. Expose disposal.
Do not expose or duplicate the basis in the headless gameplay model.

Submission promises still resolve on ACK. Acceptance keeps the source busy until
it has both that ACK and a same-session/seat frame whose version is greater than
the captured original basis version. Frame-before-ACK works symmetrically. Root
verified internal session.submit checks the exact basis before committing
head.version + 1, committed retry lookup runs before basis rejection, and restore
also increments the current head. Those invariants make the barrier sufficient;
no new wire receipt or commit-version field is necessary.

Transient recovery resends the same copied command, ID and original basis. A
missing ACK must not be inferred from a newer frame. A missing frame after ACK
requests/resumes the authoritative snapshot. Final failure/disposal clears owned
timers/listeners, rejects unsettled promises and exposes closed state. Bind a
source lifetime to session and selected seat, and prevent obsolete callbacks
from modifying its replacement. Switching perspective never replays old intent.

The instance waits for the barrier before clearing its submitted local draft;
do not erase a newer controlled-owner edit. Incoming frames own step advancement.
Rule rejection retains still-valid local drafts. Local values invalidated by the
latest projected domain can be removed independently of ACK timing.

Downstream requirement: the public offline UI host currently dispatches without
command deduplication. Add same-command retry handling before stale-basis
validation at that authority, rejecting ID reuse with different payloads. Keep
it scoped to the session operation lifetime and reuse the existing runtime;
do not introduce a second execution authority.

## Type-only construction spike

Root independently reran a strict TypeScript 5.9.3 proof at
`/tmp/headless-instance-type-spike/additive.ts`. A small curried constructor
`createGameInstance<Game>()({ source, features })` preserves explicit erased game
typing while inferring enabled feature return types. The original executable
`game` argument cannot cross the hosted UI boundary. A single-call API with only
Game explicitly supplied cannot also infer a defaulted feature generic reliably.

Ordinary feature factories can receive the typed core and return additive APIs;
one return-type intersection preserves `game.boards` and other root ergonomics
while disabled APIs fail checked compilation. Do not expose an unrelated
`game.features.board` namespace merely to simplify implementation. Reject feature
property ownership collisions at construction rather than silently overwrite.
React can bind to the resulting instance type without executable reducer imports.

This spike proves root API gating and model identity inference only. The actual
implementation must also support the required input/card/object extension hooks,
prototype behavior and lifecycle ownership; do not mistake this small proof for
a completed feature framework or introduce global merging without a real need.

## Per-object proof

The isolated proof `/tmp/headless-instance-type-spike/per-object.ts` extends this
to root/card/input/board hooks and canonical domain-object constructors. Both the
executor and root passed strict TypeScript 5.9.3 and Node 24 execution. Enabled
hooks preserve model IDs and generic input values; disabled root/object APIs
fail checked compilation and are absent at runtime. Hooks live on shared
prototypes, back-references retain root identity, handlers observe current
options, and construction rejects overlapping property ownership.

One localized constructor assertion handles dynamic descriptor composition;
feature definitions and callers need none. Canonical object factories must own
their enriched return types: arbitrary custom root factories do not automatically
rewrite returned objects. The proof uses an explicit board capability to enable
the typed root boards factory, with ordinary hooks adding board methods.

This remains a proof, not shipped implementation. It does not prove selector
stability or object-cache lifetime; the implementation must keep selector results
stable while their selected values are unchanged and scope caches to source and
snapshot lifetime. A plain per-call object factory alone cannot satisfy that.

## Verified Store and React adapter APIs

An independent audit checked exact @tanstack/store and @tanstack/react-store
0.11.1 tarballs. Store exposes createStore(initial), get(), functional setState()
and subscribe(listener), which returns an object with unsubscribe(). Subscription
does not emit the current state immediately. There is no store.setOptions or
store.destroy; those lifecycle responsibilities belong to the owning instance.

The maintained React API is useSelector(source, selector, { compare }); its
default equality is ===. useStore is a deprecated alias with a different third
argument shape. Use the current API rather than assuming older examples apply.

Selectors must read an immutable snapshot/read-model. Never expose the stable
mutable instance itself as the store snapshot or evaluate selector(instance)
against live getters: that suppresses updates or loses old-value evidence during
concurrent rendering. Domain objects retain snapshot-captured data and their
stable instance back-reference; handlers still observe current owner options.
Reuse unchanged domain branches across connection/draft-only updates. Primitive
or immutable-branch selection works with default equality; consumers selecting a
new composed object can supply an explicit comparator. No universal deep cache
or new selector framework is needed.

Proof must cover scalar updates, unrelated connection updates without rendering,
object identity within a snapshot, changed domain objects rendering, old captured
objects retaining old data, changed selector/comparator, source replacement and
unmount cleanup. Exact package sources are in /tmp/tanstack-api-review; official
implementation references are packages/react-store/src/useSelector.ts and
packages/store/src/store.ts in https://github.com/TanStack/store.

## Turn and event semantics

`turn.currentPlayerId` is the sole active player when exactly one is active,
otherwise null. `turn.isMine` tests active membership. Never substitute the first
roster member or guess a turn owner from interaction actors. Both reference games
already retain their turn seat separately from simultaneous interaction actors.
No second flow-owner field or setter is required.

`events.recent` reads the latest accepted operation's public display-event batch,
not an accumulated history or a delivery stream. The engine persists that batch
in `runtime.events` and projects it as `frame.events`; accepted operations replace
it, including empty intermediate steps and cancellation, while rejection preserves
it. Checkpoint restore restores snapshot data and does not replay notifications.
`tx.emit` is explicitly public-only; private details belong in the existing authored
seat view. Current Hex emitters satisfy this invariant. Diagnostic host logs remain
separate and never enter the selected-seat frame.

The iframe protocol needs an explicit `runtime.resume` request to repair an ACK
without a frame. Repeating `runtime.ready` is insufficient because the current
internal gateway deduplicates delivered frames. The SDK will own the reusable
WebSocket gameplay schemas used by hostSource; internal's protocol composes those
with its host-only history and diagnostic extensions. Do not copy an independent
wire schema into the source or import a private package from the public SDK.
