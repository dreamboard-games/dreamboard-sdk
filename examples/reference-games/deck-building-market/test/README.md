# Sketchbook scenario workspace

Every behavior scenario starts from ordinary two-player setup with a safe
integer seed. A scenario reaches its subject only by replaying canonical legal
commands; no authored base state, setup profile, patch, or generated snapshot
is rules authority.

Agent workflow:

1. Read `../rule.md` and `scenarios/complete-game.scenario.ts`.
2. Inspect a structural checkpoint from the scenario path and a player or
   spectator perspective.
3. Explore that checkpoint to obtain accepted concrete commands and dependent
   card domains.
4. Add the chosen commands to one scenario default export.
5. Put cross-checkpoint, rejection, privacy, and uniqueness assertions in
   `scenarios.test.ts`.
6. Run `pnpm verify` from the package root.

`complete-game.scenario.ts` is a normal growing-deck playthrough, not a fixture.
The six UI scenarios select checkpoints from that same replay and carry no
editable state of their own.

The checked-in `bases/` and `generated/` trees are obsolete compatibility
material awaiting Phase 07 deletion. Do not import, regenerate, or extend them.
