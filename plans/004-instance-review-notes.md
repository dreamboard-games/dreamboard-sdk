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
