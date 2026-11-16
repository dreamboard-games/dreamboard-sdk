---
name: dreamboard
description: Design and iterate on board games with Dreamboard Studio, from agreeing on a theme and mechanics through template selection, card previews, table setup, playtesting and printing. Also use for editing synced projects or customising their game code. Local standalone SDK development does not need this connection.
---

Use the Dreamboard MCP tools exposed by the host. Their current schemas define
arguments and responses; do not guess API routes or access either database directly.
Let the host complete browser sign-in and Dreamboard consent. Never ask for the
user's password or a Supabase key.

## Guide a new game through seven stages

For an open-ended request to design a game, collaborate through the stages below.
Resume from the user's existing decisions and project state. For a specific card
edit, preview, print request or code change, do that task directly; do not force
it through the full design process. Follow an explicitly requested order, including
printing for a physical playtest before trying browser play.

The milestones are user decisions and visible prototypes, not tool calls. Pause
at meaningful creative choices and ask a focused question the user can answer.
Do not treat silence, a tool success or your own visual inspection as user approval.
If the user delegates a decision, state your assumptions and proceed without
asking them to approve that decision again. Carry out routine work within the
agreed direction without seeking permission for every edit.

### 1. Agree on theme and mechanics

Use the user's inspirations to propose two or three distinct directions, with a
recommended starting point and the main tradeoff of each. Distinguish a game's
theme from the mechanics the user likes; a reference to an existing game does not
settle the new game's setting. Ask only about consequential unknowns, such as
player count, length, complexity or the central player decision. Do not invent a
finished game, title and full deck before the user has chosen a direction.

Summarise the agreed theme, core loop and intended scope of the first prototype.
Keep unresolved choices visible and carry these decisions into later stages.

### 2. Let the user choose a template

Call `list_templates`, compare suitable candidates and use `show_templates` for a
visual shortlist of one to three actual catalog entries. Explain how each helps
with card layout and components, what must change, and any mechanical mismatch;
a template is a starting point, not proof that the proposed game is implemented.
Prefer artwork that fits or can be replaced easily with themed catalog icons.

Ask the user to choose or delegate the choice before remixing. The picker attaches
a selection to chat context; it does not itself send a message or create a project.
Use the selected context when available; if the host cannot display the picker,
provide named choices with representative previews instead. Read the chosen
entry with `read_template` for its exact ID, source digest, card types and credits.

### 3. Pre-flight and remix

Call `get_sync_status` before creating a project. If all slots are occupied,
explain the effect of stopping sync and ask which project the user wants to stop
syncing, or offer the Studio upgrade path. Use `set_project_sync` only for their
chosen project with its current state version. Never choose a project to disable
automatically. Disabling sync frees a slot but does not delete the project or free
storage; local-only projects must be connected through Studio.

Call `remix_template` with the chosen ID, source digest and a new UUID request ID.
Keep that ID for identical retries. Confirm a saved revision and a successful
`read_project` before editing cards; a reserved slot is not a usable project.
If creation remains blocked after a retry, explain the blocker and recovery action,
retain the request ID and agreed design, and continue design decisions that do not
need a saved project. Do not loop on unchanged failures or substitute a standalone
rules document and call the Studio task finished.

### 4. Agree on details and iterate on a few cards

Propose the core turn, resources and win condition, explaining the choices still
needed for a small playable experiment. Get feedback on these details before
expanding the game. Start with three or four representative cards, covering
contrasting effects or card types and short and long rules text.

Use `create_card`, `update_card` or `import_cards` according to their current
schemas. For the sample being reviewed, make titles, rules, flavour, artwork,
icons and color mappings match the agreed theme. Use `search_icons` and catalog-icon
artwork for clear prototype visuals, or the artwork discovery/import tools when
suitable art is available. Label prototype art as provisional. Do not retain
unrelated template artwork on the sample, and do not delay the first review to
replace every card in the inherited deck. Disclose fixed template decorations
that current tools cannot change.

Read the latest saved revision and call `render_cards` for the sample. Inspect
readability, long text, icons and conditional colors; use
`inspect_visual_mappings` and `update_visual_mappings` when needed. Fix visible
issues on these cards, then show the previews and ask a specific design question,
such as whether the costs create the intended tradeoff or the theme reads clearly.
Your inspection does not replace the user's review. Revise and render again from
their feedback before expanding the accepted direction into a playable subset.
Keep unrelated inherited cards out of the intended test and print selection.
Use `update_rulebook` to save agreed setup and rules when available.

### 5. Help set up the playtest table

Read `document.tableSetup` and translate the agreed rules into shared and player
zones, decks, hands, starting card quantities, visibility, shuffle settings and
resource counters. Use `update_table_setup` to save the complete starting setup,
preserving relevant existing content. Starting placements and print quantities
are separate. Do not assume the template's table matches the new rules.

Check that the saved setup references the intended cards and matches the player
count and starting resources. Explain the setup to the user and identify rules
or physical components they will need to handle manually. Free Play table setup
does not implement automated rules. If the connected server lacks this tool or a
required control, guide the user through the specific Studio edits and have them
confirm the setup; do not simply drop this stage or claim it was configured.

### 6. Encourage a focused playtest

Offer a concrete first test, such as two rounds with attention to resource supply
and whether both worker actions feel useful. When the user chooses browser play,
call `open_playtest` with the current saved revision and share the link. Explain
that Studio prepares the session in the browser; returning the link does not prove
that a room exists or gameplay works. Ask the user to try the test and return with
what was confusing, stalled or felt too strong. Use their observations to revise
cards, rules and setup, then invite another short test. Do not claim a playtest
was performed unless it actually was.

### 7. Encourage a test print

Proactively offer a small printable prototype, either after the first playtest
iteration or as the user's preferred way to playtest. Confirm the intended cards
and quantities, backs, paper size and relevant print settings, reusing preferences
already supplied. `open_export` includes the project's cards according to their
quantities; it does not accept a card selection. In a newly remixed prototype,
set unused inherited cards to quantity zero and omit them from table placements.
Call `open_export` with the latest saved revision when the user
chooses printing. The link opens Studio's export flow; it is not proof a PDF was
produced or printed. Ask them to check physical readability and handling, and
bring that feedback into the next revision. Final artwork is not required for a
test print.

At each handoff, state what is ready, what remains, and the next concrete choice
or feedback request. Do not end a design session merely because rules were written,
cards were saved or a link was returned. Respect a user's decision to stop, defer
playtesting or skip printing.

## Read, edit and preview saved projects

Use `list_projects` to resolve an existing project or Studio link. If ambiguous,
ask which project the user means before editing. `read_project` returns the latest
saved cloud document and `project.savedRevisionId`; it may lag unsaved tab edits.
Only actively synced eligible projects are editable. Use `get_sync_status` to
investigate missing cloud projects; do not imply access to browser-local data.

Read before editing and supply the current saved revision plus a new UUID request
ID for revision-checked mutations. Use stable definition, instance and property
IDs from the document. `create_card` creates a new instance; `update_card` edits
existing cards by ID; `import_cards` is for tables matched by name. Resolve
ambiguous names before importing. Plain text replaces inline formatting and
graphics; use the tool's rich-text representation to preserve them. Use dedicated
artwork, rulebook and table tools when available; unsupported layout edits stay
in Studio. Do not invent capabilities or use Git to bypass these boundaries.

Keep mutation request IDs. After a lost response, retry the exact same arguments
and ID to recover the stored result. On a stale revision, read again and reconcile
before making a new request; do not overwrite concurrent edits automatically.
Use `restore_card_edit` only when the user asks to revert, with the original
request ID and expected saved revision. Recovery writes a new revision and refuses
to overwrite intervening edits. Receipts expire after seven days; do not retry or
promise recovery of an older request. Preserve unsynced local changes when an open
editor reports a newer cloud version; this recovery is separate from local Undo.

For previews, resolve canonical definition, instance and surface IDs from a fresh
read. Call `render_cards` once for up to four faces in the requested order, using
`project.savedRevisionId` as `expected_saved_revision_id`. Use the front unless
another face is requested and the default size unless more detail is needed.
On a stale revision, read again and resolve the faces. Explicit requests to inspect
existing or template cards do not require retheming them first.

Let the host display the inline gallery. Through Codex `functions.exec`, forward
each image block with `image(block)` and keep base64 bytes out of text. Name the
cards shown and ask the relevant review question. If the user requests files or
the host cannot display previews, provide the returned PNG download links; they
expire after 15 minutes.

## Customise game code only when requested

Do not switch modes just to design cards or prepare Free Play. When the user
explicitly asks to customise the project or work on game code, use
`customise_project` if needed. This is a one-way mode change. Follow its reported
setup progress, then use `connect_project` once publication is ready.

The connection provides a clean repository URL, default branch, temporary
repository-scoped credential and expiry. Use the host's secure credential
integration or an OS credential helper scoped to that repository. Keep credentials
out of remote URLs, shell literals, process arguments, logs, commits and replies.
Do not overwrite unrelated GitHub credentials. If safe credential handling is
unavailable, direct the user to Studio's connection instructions.

Clone the clean URL with repository-scoped lookup:
`git clone --config credential.useHttpPath=true <clean-repository-url>`.
Read that repository's `AGENTS.md`, `rule.md`, scripts and current source. Follow
its ownership boundaries and checks. Edit game-owned source; use MCP tools for
Studio-owned cards and rules. Never modify `studio/`, `assets/studio/`, `rule.md`
or generated `studio/cards.ts` in Git to work around a rejection. Do not edit
GitHub workflows, force-push or bypass branch protection.

Run documented checks, commit requested changes and push normally when authorized.
If authentication expires, reconnect and refresh only that repository's credential.
After pushing, call `get_build` for the exact commit. Report pending, superseded,
rate-limited, rejected, failed and successful results accurately. Repair compiler
errors rather than making empty pushes. Check that Studio's published build is
the intended commit before saying the preview updated. Neither a push nor a build
proves that gameplay has been tested.
