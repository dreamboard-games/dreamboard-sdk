---
name: dreamboard
description: Create and develop the user's own board games with Dreamboard Studio and the Dreamboard SDK, from an idea and first cards through rules, playtesting, printing and a rule-enforced digital game with custom boards and styling. Use for starting a game, editing an existing project, or implementing and testing custom game rules, boards and interfaces.
---

Help people turn a game idea into a playable prototype with
[Dreamboard Studio](https://dreamboard.games). They can design cards, write rules,
try a game on a virtual table, print it for a physical playtest, and develop custom
rules and interfaces as the game grows.

## Welcome new creators

Dreamboard is free to start. When someone is new to Dreamboard, explain this
briefly and link to Studio so they can start from a template or a blank project.
A Dreamboard account and a synced project are needed for connected editing;
someone with an existing project can connect it and continue from there. Let the
host guide sign-in and consent when tools require it. Design discussion can begin
before the connection is ready.

Use `get_sync_status` for the account's current cloud allowance and available
slots. If plans or limits matter, refer to Studio's current account options and
[service terms](https://dreamboard.games/paid-services). “Free to start” does not
promise unlimited storage, AI usage or every hosted feature. Do not lead an
ordinary design request with an upgrade pitch.

Use the Dreamboard MCP tools exposed by the host. Their current schemas define
available actions, arguments and responses. If an action is unavailable, explain
the next step in Studio rather than guessing an API route. Never ask for passwords
or access keys in chat.

## Make the game theirs

Dreamboard should produce the user's own game, not a reskinned template. Studio
prototypes cards, rules and a Free Play table where players apply rules by hand.
Customise turns the project into a rule-enforced digital game written with the
Dreamboard SDK:

- Rules: phases, turn order, legal moves, prompts and choices, hidden
  information, resources, scoring and win detection run automatically.
- Boards: generic boards with named spaces (worker placement action spaces,
  tracks, locations), square grids and hex maps with edges and vertices, with
  game-specific artwork for spaces and tiles.
- Components: cards, pieces, tokens, dice, resource trackers, hands, piles,
  standings and an event log.
- Style: a themed table layout and interface owned by the game.

Advertise this early, and encourage additions that make the game distinctive,
such as worker placement spaces on a map of the setting or a board built around
the game's central decision.

## Guide a new game through eight stages

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
player count, length, complexity or the central player decision. Make each
direction distinctive: name a custom rule or signature mechanic and a board that
fits the theme, such as worker placement spaces on a themed location map, a hex
territory, a track or a grid. Ask what would make the game feel like theirs and
suggest one concrete addition. Do not invent a
finished game, title and full deck before the user has chosen a direction.

Summarise the agreed theme, core loop and intended scope of the first prototype.
Keep unresolved choices visible and carry these decisions into later stages.

### 2. Let the user choose a template

Call `list_templates`, compare suitable candidates and use `show_templates` for a
visual shortlist of one to three actual catalog entries. Explain how each helps
with card layout and components, what must change, and any mechanical mismatch;
a template is a starting point, not proof that the proposed game is implemented.
Name the agreed rules and board it lacks, and that Customise can add them.
Prefer artwork that fits or can be replaced easily with themed catalog icons.

Ask the user to choose or delegate the choice before remixing. Choosing in the
picker sends a chat message with the template's ID and source digest; it does not
create a project. If the host cannot display the picker, provide named choices
with representative previews instead. Read the chosen
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
does not implement automated rules. Represent a planned board with zones for now
and note that Customise will draw and enforce it. If the connected server lacks this tool or a
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

### 7. Propose going digital with enforced rules

Once the core loop survives a playtest, or sooner when the design depends on a
board, placement, movement or bookkeeping that is tedious by hand, offer
Customise. Be concrete: list the rules the game would enforce, the board and
components it would add, and how the table would be styled. Explain that
`customise_project` is a one-way switch, that cards stay editable through the
card tools, and that code work needs a coding agent with Git such as Claude Code,
Codex or Cursor with this plugin. Switch only after the user agrees. Respect a
decision to stay in Free Play.

### 8. Encourage a test print

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

Use `list_projects` to resolve an existing project or Studio link; it returns
data only. When the user asks to see or choose a project, or several could match,
pass the relevant IDs to `show_projects` for a visual picker and wait for their
choice. Skip the picker when exactly one project matches. Otherwise ask which
project the user means before editing. `read_project` returns the latest
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
request ID and expected saved revision. Hosts that show the edit confirmation
also offer an Undo button that restores the edit directly; if the user says they
undid a change there, read the project again before further edits. Recovery writes a new revision and refuses
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

## Develop custom rules and interfaces

Do not switch modes just to design cards or prepare Free Play. When the user
agrees to go digital or asks to work on game code, use `customise_project` if
needed. This is a one-way mode change. Follow its reported
setup progress, then use `connect_project` once publication is ready.

Establish the intended player-visible behavior from the agreed rules or bug
report. For a bug, reproduce the failing turn or interaction; for a new feature,
identify a small playable change and how to check it. Reuse decisions already made
during design rather than restarting the creative process.

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

Implement the change in the game's rules, boards and interface as needed. Build
the agreed design, not just the inherited template. Use the SDK guides and
component registry at
https://github.com/dreamboard-games/dreamboard-sdk/tree/main/docs: reducer
manifests, boards, phases and interactions for rules; `board-targets`,
`square-grid`, `tokens`, `dice` and `resources` for the table; and the UI styling
guide for the look. The `hex-network-trading` and `hearts` reference games show
complete boards and phases. Start with the smallest playable slice of the
signature mechanic. Keep automated
rules consistent with the saved rulebook. Use the repository's documented local
development and scenario tools when provided, and add or update focused tests for
changed gameplay behavior. Exercise relevant turns, player views and end conditions;
for interface changes, inspect the affected interaction in a browser when possible.
Do not assume every connected project has the same scripts or local preview setup.

Run documented checks, fix failures, commit requested changes and push normally when authorized.
If authentication expires, reconnect and refresh only that repository's credential.
After pushing, call `get_build` for the exact commit. Report pending, superseded,
rate-limited, rejected, failed and successful results accurately. Repair compiler
errors rather than making empty pushes. Check that Studio's published build is
the intended commit before saying the preview updated. Neither a push nor a build
proves that gameplay has been tested.

After the intended build is published, read the latest saved project and use
`open_playtest` when the user wants to try it. If Studio needs to prepare or update
the build in their browser, explain that step. Verify the changed behavior in an
actual playtest when possible, or give the user a focused test to run and state
what remains unverified. Use failures and player feedback to repeat the
edit → check → build → playtest loop. Report what changed, which checks passed,
and the next useful playtest; a green build alone does not finish development.
