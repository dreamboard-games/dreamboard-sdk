---
name: dreamboard
description: Work on synced Dreamboard Studio projects through the Dreamboard MCP server and project repository. Use for finding a user's project, editing its cards, customising its game code, or checking a pushed build. Local standalone SDK development does not need this connection.
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

## Edit cards through Studio

Use `update_cards` for card data. The user must open the project in Studio and
enable AI editing. Read the latest project first, use its revision when required,
and target the intended card type. The tab validates and fits the text, applies
one undoable import, and saves and syncs it before acknowledging success.

Follow the tool's table contract. Headers match Name, Quantity and property names
without regard to case. Card names match after trimming, with case preserved.
A new name creates a card; an existing name updates it. Empty cells leave existing
values unchanged. Cards absent from the table stay. Duplicate or ambiguous names
must be resolved before applying. Image columns are not supported.

Keep the returned request ID and use `get_edit_request` to check completion.
Report queued or claimed requests as pending until acknowledged. Repeating the
same request must use its original ID and payload. On a stale revision, read
again and reconcile the intended changes before submitting a new request.
An outcome-unknown result means the edit may already have happened: read the
current project and reconcile it, rather than automatically submitting a
replacement. Rulebooks, images and layouts remain
Studio edits until a dedicated tool supports them.

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
