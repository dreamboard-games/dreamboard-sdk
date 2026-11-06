---
name: dreamboard
description: Work on synced Dreamboard Studio projects through the Dreamboard MCP server and project repository. Use for finding a user's project, previewing or editing its cards, customising its game code, or checking a pushed build. Local standalone SDK development does not need this connection.
---

Use the Dreamboard MCP tools exposed by the host. Their current schemas define
arguments and responses; do not guess API routes or access either database directly.
Let the host complete browser sign-in and Dreamboard consent. Never ask for the
user's password or a Supabase key.

## Find and read a project

Use `list_projects` to resolve the user's project or Studio link. If the name is
ambiguous, ask which project they mean before changing anything. Use
`read_project` for the latest saved cloud document, including card types,
properties, cards and quantities. It can lag unsaved edits in an open tab.

Only actively synced projects are accessible. Free accounts have one sync slot.
For a missing device-only project, direct the user to Studio's Settings → Manage
sync. Do not silently disable another project's sync or imply that the plugin
can read browser-local data.

## Preview saved cards

When someone asks to see or compare cards, use `read_project` to resolve their
names and faces. Use the front unless they request another face. Call
`render_cards` once for up to four faces in the requested order. Supply
`project.savedRevisionId` as `expected_saved_revision_id` and the canonical
definition, instance and surface IDs. Use the default size unless more detail
is requested. On a stale revision, read the project again and resolve the faces.

Let the host display the inline gallery. When calling through Codex
`functions.exec`, forward each image block from the result with `image(block)`.
Keep the base64 bytes out of text. The gallery can open after the reply. Name
the cards rendered and answer any comparison the user requested. If the user
asks for files or their host cannot display previews, offer the returned PNG
download links. They expire after 15 minutes.

## Edit synced cards

Use `update_cards` for card data. Studio does not need to be open and there is no
per-tab permission switch. Read the latest saved project first and supply its
saved revision plus a new UUID request ID. The server validates the import using
Studio's document rules, fits text, and commits a new cloud revision atomically.

Follow the current tool schema: `payload` contains `definitionId`, explicit
`columns` descriptors and a `table` with one header row followed by string cells.
Column descriptors select card name, quantity, or an existing property ID; do not
infer property identity from a header alone. Card names match after trimming,
with case preserved. A new name creates a card; an existing name updates it.
Empty cells preserve existing values or defaults. Cards absent from the table
stay. Duplicate or ambiguous names must be resolved before applying. Image
columns are not supported.

Keep the request ID. If a response is lost, use `get_edit_request` or retry with
exactly the same request ID, revision and payload. Never invent a replacement ID
just because a call timed out. A stored result remains authoritative even if
newer project revisions exist. On a stale revision, read again and reconcile the
intended changes before submitting a new request. Do not automatically overwrite
concurrent edits.

Use `restore_card_edit` only when the user asks to revert an applied edit. Supply
the original request ID and the expected saved revision. Recovery writes a new
revision and refuses to overwrite intervening edits; if it reports a conflict,
read the latest project and discuss the intended correction. It is separate from
Studio's local Undo. Receipts and recovery data are retained for seven days; do
not retry or promise recovery of an older request.

An open editor may show a newer-cloud-version notice. Unsynced local changes must
be preserved and reconciled; do not tell the user to discard them. Rulebooks,
images and layouts remain Studio edits until a dedicated tool supports them.

## Customise game code

Use `connect_project` when the user asks to work on the project's game code.
Follow any response directing them to Studio to switch the project to Customise.
This is a one-way project mode change; do not make it merely to read card data.

The response provides a clean repository URL, default branch, temporary
repository-scoped credential and expiry. Use plain Git with the host's secure
credential integration or an OS credential helper scoped to this repository.
Keep the credential out of remote URLs, shell command literals, process arguments,
logs, commits and user-facing replies. Do not overwrite unrelated GitHub
credentials. If the environment cannot pass it safely, direct the user to Studio's
connection instructions instead of printing a token-bearing clone command.

Clone the clean URL with repository-scoped credential lookup:
`git clone --config credential.useHttpPath=true <clean-repository-url>`.
Read the repository's `AGENTS.md`, `rule.md`, package scripts
and current source before editing. `AGENTS.md` defines the exact ownership
boundary and verification commands for that repository. Edit game-owned source;
change cards through `update_cards`. Never modify Studio-owned inputs such as
`studio/`, `assets/studio/`, or `rule.md` in Git to work around a build rejection.
Do not edit GitHub workflows, force-push, or bypass branch protection.

Run the repository's documented checks, commit the requested changes, and push
normally when authorized. If authentication expires, call `connect_project`
again and refresh only that repository's credential. The remote URL stays clean.

## Verify the result

After a push, call `get_build` for that exact commit. A successful push is not a
successful build. Report pending, superseded, rate-limited, rejected, failed and
successful results accurately. Use returned compiler errors to guide repairs;
do not trigger repeated empty pushes. Check that Studio's published build is the
intended commit before saying the preview has updated. Do not claim a browser
playtest or deployment was verified unless you actually performed it.
