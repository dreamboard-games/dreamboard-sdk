# Phase 00 Decision Receipt

Recorded: 2026-07-13.

The implementation is bound by these decisions:

1. One self-contained TypeScript scenario is the only persistent behavior-test
   and authoring artifact.
2. `setup`, `given`, `when`, and `then` replace base definitions and `from`.
3. `given` and `when` contain canonical serializable legal commands using
   seat-based actors, interaction IDs, and typed parameters.
4. No base inheritance, checked state snapshot, raw `patchState`, reusable
   arrange layer, or test-only setup profile remains.
5. `dreamboard test` is the single execution command. `test inspect` and
   `test explore` are read-only queries over the same replay runtime.
6. Test commands produce one stable semantic JSON envelope by default. There is
   no `--format human` or prose-parser contract.
7. Visible interactions may be unavailable. Executable actions are authorized
   descriptors whose complete dependent input domain has a budget-independent
   nonempty assignment; explore returns their accepted concrete commands.
8. There is no authored `requiredActions`, `playerTurn.decision`, or
   `blockedBy`.
9. `blockedBy` exists only in testing/introspection diagnostics and is derived
   where the scheduler proves a causal continuation dependency.
10. Inspect/explore require one player or spectator perspective and never
    aggregate private views or concrete commands.
11. The scenario matrix is mechanic-agnostic. Deterministic seed plus recorded
    entropy trace is the default; no dice-only override is added.
12. Every game has a complete normal-setup terminal scenario plus focused
    branch scenarios.
13. All nine per-game lockfiles remain; all generated workspace, test, and
    Workbench output becomes transient.
14. Stable directory IDs, package names, reference IDs, and demo slugs remain;
    approved display names and themes change presentation only.
15. Public scenario tooling supersedes the overlapping private internal
    scenario-author workflow.
16. Phase 06 publishes the exact SDK and mechanically repins all nine locks
    before internal admission activation; a staged-only version is
    insufficient.
17. No tracked derived path is deleted until Phase 07 proves internal compile
    against a real disposable deletion-candidate commit whose checkout retains
    the canonical origin. Phase 07 then lands the identical final SDK tree and
    repeats ordinary Git-archive admission from the integration commit.

## Naming Refinements

- The serializable portion is `ScenarioReplayDefinition`; function-valued
  `then` is executed separately by `assertScenario` and covered by the scenario
  source digest.
- Player-valued command parameters use contract-marked seat references in
  authored data and resolve to runtime IDs only at trusted dispatch.
- There is no public aggregate `actionableActors`; the selected perspective's
  `actions` answers whether that actor has executable commands.
- `pendingActors` means unresolved response or commitment obligations,
  including simultaneous commitments, forced discards, and targeted responses.
- The disposable deletion proof is a real Git commit, not an arbitrary archive
  injection seam.

These refinements preserve the approved meaning. Changing any numbered decision
requires a reviewed design amendment before implementation continues.
