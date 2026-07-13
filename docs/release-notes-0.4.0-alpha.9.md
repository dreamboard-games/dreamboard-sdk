# @dreamboard-games/sdk 0.4.0-alpha.9 - canonical reference-game authoring

This alpha makes the nine SDK reference games authoritative, compact teaching
workspaces and completes their agent-first scenario and Workbench proof paths.

## Reference Games

- Each `examples/reference-games/<game-id>/` root is the sole editable game
  workspace, and its `rule.md` is gameplay authority.
- All nine games now demonstrate complete multi-turn arcs across trick taking,
  simultaneous drafting, deck building, worker placement, network building,
  roll-and-write, ranking and ties, solo procedures, and automa behavior.
- Each isolated workspace retains its own `pnpm-lock.yaml` as exact public SDK
  provenance.
- Generated workspace contracts, projections, Workbench modules, catalogs, and
  checkpoints are disposable outputs rather than alternate authored sources.

## Agent Scenario Loop

A typed source under `test/scenarios/` now drives reducer verification,
Workbench checkpoints, JSON inspection and exploration, and demo replay. Use
`dreamboard test inspect` to understand a checkpoint and `dreamboard test
explore` to obtain concrete replay-accepted commands; do not author base states
or generated projections.

## UI And Package Proof

The Workbench catalog covers every reference game and retains three required
foundation scenarios for mobile selection, pointer drag, runtime draft,
submission, accessibility, semantic snapshots, and digest evidence. Packed
consumer verification installs the exact SDK tarball in isolated workspaces.

## Upgrade Guidance

Repin each reference workspace to the exact SDK version, refresh its lockfile
through the repository command, and run:

```sh
pnpm reference-games:verify-publishable
pnpm reference-games:check
pnpm reference-games:test:packed --required
pnpm docs:check
```

Staging and production deployment are outside this SDK release note; consuming
hosts retain responsibility for real-host parity and release admission.
