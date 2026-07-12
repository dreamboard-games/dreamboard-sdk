# Phase 00 Source-Size Baseline

Recorded on 2026-07-13 from `/Users/mac/code/dreamboard-sdk`.

This receipt separates the Git-index baseline from the dirty working-tree view.
The future source-size guard is index-based. The planning measurement used the
same tracked paths from the working tree so that the approved, uncommitted rule
rewrite was visible.

## Scope And Classification

The nine measured game roots are:

```text
examples/reference-games/automa-river-rival
examples/reference-games/deck-building-market
examples/reference-games/hearts
examples/reference-games/hex-network-trading
examples/reference-games/multiplayer-ranking-and-ties
examples/reference-games/roll-and-write-scorecard
examples/reference-games/simultaneous-card-drafting
examples/reference-games/solo-countdown-puzzle
examples/reference-games/worker-placement-tableau
```

`examples/reference-games/shared/` and the family-level `README.md` are outside
the nine-root size ceiling. The family README is included separately in the PR
addition audit because it was added by the same reference-game change.

Every one of the 664 index paths under the nine roots was assigned by this
ordered, mutually exclusive classification:

1. `pnpm-lock.yaml` -> `retained-lock`;
2. an exact relative path in
   `WORKSPACE_CODEGEN_OWNERSHIP.dynamic.generatedFiles` ->
   `workspace-generated`;
3. `test/generated/**` -> `test-generated`;
4. a checked binary extension -> `obsolete-binary`; and
5. every remaining checked text path -> `authored`.

The checked text allowlist was `.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`, `.json`,
`.jsonl`, `.md`, `.yaml`, `.yml`, `.toml`, `.css`, `.html`, `.svg`, `.txt`, and
the `.gitignore` basename. The binary allowlist was `.png`, `.jpg`, `.jpeg`,
`.webp`, `.gif`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.mp4`, `.webm`, `.zip`,
and `.gz`. There were zero unclassified paths.

The sorted `classification<TAB>path` manifest contains 664 rows and has SHA-256
`b7f604fed89cbda899b58f684c7dc384d32404ad33b0277e77e277ef05832cd4`.
This command lists the classification for every tracked file and reproduces
the digest:

```bash
node --input-type=module <<'NODE'
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const games = [
  "automa-river-rival",
  "deck-building-market",
  "hearts",
  "hex-network-trading",
  "multiplayer-ranking-and-ties",
  "roll-and-write-scorecard",
  "simultaneous-card-drafting",
  "solo-countdown-puzzle",
  "worker-placement-tableau",
];
const generated = new Set([
  "shared/manifest-literals.ts",
  "shared/manifest-types.ts",
  "shared/manifest-static.json",
  "shared/manifest-runtime.ts",
  "shared/manifest-contract.ts",
  "shared/generated/ui-contract.ts",
  "app/index.ts",
  "app/tsconfig.framework.json",
  "ui/tsconfig.framework.json",
]);
const binary = /\.(png|jpe?g|webp|gif|woff2?|ttf|otf|mp4|webm|zip|gz)$/;
const paths = execFileSync(
  "git",
  ["ls-files", "-z", "--", ...games.map((game) =>
    `examples/reference-games/${game}/**`)],
  { encoding: "utf8" },
).split("\0").filter(Boolean).sort();
const rows = paths.map((path) => {
  const relative = path.split("/").slice(3).join("/");
  const kind = relative === "pnpm-lock.yaml"
    ? "retained-lock"
    : generated.has(relative)
      ? "workspace-generated"
      : relative.startsWith("test/generated/")
        ? "test-generated"
        : binary.test(path)
          ? "obsolete-binary"
          : "authored";
  return `${kind}\t${path}`;
});
const output = `${rows.join("\n")}\n`;
process.stdout.write(output);
process.stderr.write(
  `${rows.length} ${createHash("sha256").update(output).digest("hex")}\n`,
);
NODE
```

Exit code: `0`.

For index measurements, the audit used `git ls-files -s -z`, read each staged
blob with `git cat-file blob <oid>`, counted LF bytes, and counted a nonempty
unterminated final text line once. For the planning view it read the same 664
tracked paths from the working tree. It did not use `find`, ignored files, or
untracked files.

## Reproduced Totals

### Planning view: tracked paths, working-tree bytes

| Category                              |   Paths | Logical text lines |         Bytes |
| ------------------------------------- | ------: | -----------------: | ------------: |
| Authored source, docs, and tests      |     492 |             36,378 |     1,190,209 |
| Workspace-generated files             |      76 |             92,907 |     2,621,845 |
| Test-generated states and projections |      76 |            103,911 |     3,123,257 |
| Retained per-game lockfiles           |       9 |             12,323 |       471,532 |
| Obsolete Mosaic PNGs                  |      11 |                  0 |     1,166,930 |
| **Nine game roots**                   | **664** |        **245,519** | **8,573,773** |

The PNG blobs contain 3,800 LF bytes. A naive `wc -l` across text and binary
therefore reports 249,319 lines. The meaningful text count is 245,519. These
values reproduce the planning audit exactly.

### Git-index view at `05509e395bb5b6ec28cac4b7724a649ea9e56988`

| Category                              |   Paths | Logical text lines |         Bytes |
| ------------------------------------- | ------: | -----------------: | ------------: |
| Authored source, docs, and tests      |     492 |             35,408 |     1,129,454 |
| Workspace-generated files             |      76 |             92,907 |     2,621,845 |
| Test-generated states and projections |      76 |            103,911 |     3,123,257 |
| Retained per-game lockfiles           |       9 |             12,323 |       471,532 |
| Obsolete Mosaic PNGs                  |      11 |                  0 |     1,166,930 |
| **Nine game roots**                   | **664** |        **244,549** | **8,513,018** |

The 970-line and 60,755-byte difference is entirely the approved but
uncommitted rewrite of the nine game `rule.md`/README pairs. The path set and
all derived/lock/binary counts are identical in both views.

### Working-tree count by game

| Game ID                        | Paths | Authored | Workspace generated | Test generated |  Lock | Binary bytes | Total text |
| ------------------------------ | ----: | -------: | ------------------: | -------------: | ----: | -----------: | ---------: |
| `automa-river-rival`           |    38 |    1,474 |                 232 |              9 | 1,335 |            0 |      3,050 |
| `deck-building-market`         |    96 |    5,010 |              16,845 |         27,230 | 1,371 |            0 |     50,456 |
| `hearts`                       |    64 |    2,880 |               6,286 |          3,570 | 1,362 |            0 |     14,098 |
| `hex-network-trading`          |   125 |    8,904 |              17,242 |         53,412 | 1,384 |            0 |     80,942 |
| `multiplayer-ranking-and-ties` |    47 |    2,213 |               5,762 |              8 | 1,371 |            0 |      9,354 |
| `roll-and-write-scorecard`     |    49 |    1,878 |              16,983 |             10 | 1,371 |            0 |     20,242 |
| `simultaneous-card-drafting`   |    70 |    2,262 |               8,673 |          8,812 | 1,354 |            0 |     21,101 |
| `solo-countdown-puzzle`        |    45 |    1,726 |               6,113 |            922 | 1,354 |            0 |     10,115 |
| `worker-placement-tableau`     |   130 |   10,031 |              14,771 |          9,938 | 1,421 |    1,166,930 |     36,161 |

## Canonical Workspace-Generated Inventory

The authority is
[`packages/workspace-codegen/src/ownership.ts`](../../../../packages/workspace-codegen/src/ownership.ts),
version 31. The nine exact relative generated paths are:

| Relative path                     | Games containing the tracked output |
| --------------------------------- | ----------------------------------- |
| `app/index.ts`                    | all nine                            |
| `app/tsconfig.framework.json`     | all nine                            |
| `shared/manifest-contract.ts`     | all nine                            |
| `shared/manifest-literals.ts`     | all except `automa-river-rival`     |
| `shared/manifest-runtime.ts`      | all except `automa-river-rival`     |
| `shared/manifest-static.json`     | all except `automa-river-rival`     |
| `shared/manifest-types.ts`        | all except `automa-river-rival`     |
| `shared/generated/ui-contract.ts` | all except `automa-river-rival`     |
| `ui/tsconfig.framework.json`      | all nine                            |

That is 4 paths for `automa-river-rival` and 9 for each other game: 76 paths,
92,907 lines, and 2,621,845 bytes. Seed files such as `app/game.ts`,
`app/setup-profiles.ts`, and `ui/App.tsx` are authored after creation and are
not in this generated class.

## Test-Generated Inventory

All 76 paths are under `examples/reference-games/*/test/generated/**`:

| Game                           | Exact generated members                                                                                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `automa-river-rival`           | `bases/claim-cargo/player-1.projection.json`                                                                                                                                                                                                                                |
| `deck-building-market`         | `.generation-meta.json`, `base-state.json`, `base-states.generated.{ts,d.ts}`, `scenario-manifest.generated.ts`, `testing-contract.ts`; two projections each for `after-play-all-treasures`, `empty-masterpiece-before-endturn`, and `initial-turn`                         |
| `hearts`                       | `.generation-meta.json`, `base-state.json`, `base-states.generated.{ts,d.ts}`, `scenario-manifest.generated.ts`, `testing-contract.ts`; four `initial-hand` projections                                                                                                     |
| `hex-network-trading`          | `.generation-meta.json`, `base-state.json`, `base-states.generated.{ts,d.ts}`, `scenario-manifest.generated.ts`, `testing-contract.ts`; four projections each for `after-setup`, `charter-verification`, `initial-turn`, `port-verification`, and `terminal-before-endturn` |
| `multiplayer-ranking-and-ties` | `bases/draft-stall-ready/player-1.projection.json`                                                                                                                                                                                                                          |
| `roll-and-write-scorecard`     | `bases/initial/player-1.projection.json`                                                                                                                                                                                                                                    |
| `simultaneous-card-drafting`   | `.generation-meta.json`, `base-state.json`, `base-states.generated.{ts,d.ts}`, `scenario-manifest.generated.ts`, `testing-contract.ts`; five `five-player-initial-turn` and four `initial-turn` projections                                                                 |
| `solo-countdown-puzzle`        | `base-state.json` and `bases/repair-beacon/player-1.projection.json`                                                                                                                                                                                                        |
| `worker-placement-tableau`     | `.generation-meta.json`, `base-state.json`, `base-states.generated.{ts,d.ts}`, `scenario-manifest.generated.ts`, `testing-contract.ts`; two `initial-turn` projections                                                                                                      |

Totals by exact member family are 5 generation metadata files, 6
`base-state.json` files, 5 generated base modules, 5 generated declaration
modules, 5 scenario manifests, 5 testing contracts, and 45 projections.

The largest derived families are:

| Family                                        | Paths |  Lines |     Bytes |
| --------------------------------------------- | ----: | -----: | --------: |
| `*/test/generated/base-states.generated.ts`   |     5 | 58,539 | 1,797,839 |
| `*/shared/manifest-static.json`               |     8 | 41,746 | 1,106,284 |
| `*/shared/manifest-runtime.ts`                |     8 | 31,525 |   918,039 |
| `*/test/generated/bases/**/*.projection.json` |    45 | 25,944 |   817,293 |
| `*/test/generated/base-state.json`            |     6 | 17,816 |   460,390 |
| `*/shared/generated/ui-contract.ts`           |     8 | 10,368 |   329,695 |

Workspace and test-generated output together account for 196,818 lines and
5,745,102 bytes, or 80.2% of the working-tree text in the nine roots.

## Workbench Output

The checked Workbench reference bundle is exactly:

- `fixtures/ui/reference-games/index.json`;
- 26 `<scenario-id>.fixture.json` files; and
- 26 `modules/<scenario-id>.mjs` files.

The 26 scenario IDs are:

```text
automa-river-rival.claim-cargo.mobile
automa-river-rival.claim-cargo.reconnect.mobile
automa-river-rival.claim-cargo.terminal.mobile
deck-building-market.buy-flow.desktop
hearts.pass-three.mobile
hex-network-trading.build-trail.desktop
multiplayer-ranking-and-ties.draft-stall.desktop
multiplayer-ranking-and-ties.tie-break.desktop
roll-and-write-scorecard.mark-cell.drafted.mobile
roll-and-write-scorecard.mark-cell.initial.mobile
roll-and-write-scorecard.mark-cell.invalid.mobile
roll-and-write-scorecard.mark-cell.mobile
roll-and-write-scorecard.mark-cell.rolled.mobile
roll-and-write-scorecard.mark-cell.submitted.mobile
roll-and-write-scorecard.mark-cell.terminal.mobile
simultaneous-card-drafting.lock-choice.mobile
solo-countdown-puzzle.reconnect.mobile
solo-countdown-puzzle.repair-beacon.mobile
ui-scenarios.boards-slot.desktop
ui-scenarios.cards-hand.desktop
ui-scenarios.dice-result.desktop
ui-scenarios.game-shell.desktop
ui-scenarios.prompts-choice.desktop
ui-scenarios.resources-cost.desktop
ui-scenarios.zones-staging.desktop
worker-placement-tableau.place-worker.desktop
```

| Workbench output                       |  Paths |      Lines |       Bytes |
| -------------------------------------- | -----: | ---------: | ----------: |
| `fixtures/ui/reference-games/**`       |     53 |     26,872 |     953,491 |
| `packages/ui-workbench/src/catalog.ts` |      1 |        597 |      23,045 |
| **Combined**                           | **54** | **27,469** | **976,536** |

`fixtures/ui/component-scenario-index.json` is deliberately excluded. It is a
separate shared component/source ownership index generated by
`scripts/ui/generate-component-scenario-index.mjs`, not wholly owned by the
reference-game fixture compiler.

## Obsolete Screenshot Inventory

All binary paths are under
`examples/reference-games/worker-placement-tableau/test/screenshots/`:

| File                               |   Bytes | SHA-256                                                            |
| ---------------------------------- | ------: | ------------------------------------------------------------------ |
| `01-setup-complete.png`            |  85,112 | `7ff1017fb5a591e0cdff95cbf64c3aab13dc4a83c49783757ffe4175d25adc60` |
| `02-ui-board-rendered.png`         |  83,874 | `bef858ef101d9f7157c896392c6014276f4d467a682c59b20b2d41d947f09c59` |
| `02-wakeup-season-1.png`           |  86,150 | `d163f53e3a9d60bf8fa65c0e4300fe781b9df916e436da632129205c31a1c6bd` |
| `03-placement-master-override.png` |  87,369 | `5be37c0eede0461636c72373046431e34c244f7cdc69fc6e20b4244b54e5a2ff` |
| `03-player-switcher-works.png`     |  83,212 | `a48063df942af9eaf241772669a9606a980307a7bd664d2be408c97bda83b4e0` |
| `04-wakeup-slot-clicked.png`       |  86,030 | `57f61d4e6b99d8762f4ea996b019bae0d2ccc38a2f0b2338a21692a3683294d4` |
| `04-workshop-craft.png`            |  87,828 | `c7e0ea16fa30737367561e2dd2ac4eec1f0073bf2553dc68222330c3861c2ac9` |
| `05-place-worker-success.png`      |  86,943 | `8b74867bcc71140ae99199a3cc7887171b97e23d5b6793b8f1a7403b6d45e29f` |
| `07-cleanup-season-end.png`        |  73,542 | `caff2890f181644dc4dbb76094218b12b15d062d42ed2c94ca1c83f489853650` |
| `08-scoring-final-vp.png`          | 203,435 | `6f07a647f54d0c74842255728bd43d5d6c21899d5a1f6a11a1eaf2474e7f261c` |
| `09-game-over-winner.png`          | 203,435 | `6f07a647f54d0c74842255728bd43d5d6c21899d5a1f6a11a1eaf2474e7f261c` |

Total: 11 files and 1,166,930 bytes. The last two files are byte-identical.

## PR Addition Audit

The intended PR base is the actual merge base of `HEAD` and `origin/main`:
`532c52879d746fc6ed04a8b6860e9a0b87987b66`.

```bash
git merge-base HEAD origin/main
git diff --numstat 532c52879d746fc6ed04a8b6860e9a0b87987b66 HEAD
```

Both commands exited `0`.

| Committed diff at `HEAD`                               |   Additions | Deletions |   Paths |
| ------------------------------------------------------ | ----------: | --------: | ------: |
| Whole repository                                       |     421,482 |    22,428 |   1,496 |
| Nine game roots                                        |     244,549 |         0 |     664 |
| `examples/reference-games/README.md`                   |          33 |         0 |       1 |
| Workbench fixture bundle and catalog                   |      27,469 |         0 |      54 |
| **Reference-game roots, family README, and Workbench** | **272,051** |     **0** | **719** |
| Generated workspace/test/Workbench deletion candidate  | **224,287** |     **0** | **206** |

Thus the reference-game family accounts for 272,051 of 421,482 committed
additions. The deletion candidate is exactly 92,907 workspace-generated lines,
103,911 test-generated lines, 26,872 Workbench fixture lines, and 597 catalog
lines: 224,287 additions.

The dirty working tree changes the nine-root total to 245,519 and the family
README to 38, so the projected reference-game-plus-Workbench subtotal is
273,026 additions before untracked plan documents are committed. It does not
change the 224,287-line deletion candidate.

## Phase 00 Conclusion

- The planning measurements reproduce exactly.
- There are exactly nine retained locks totaling 12,323 lines, below the future
  15,000-line ceiling.
- Generated workspace and test output, not lockfiles, causes the size problem.
- No path was unclassified and no generated family found in this audit has an
  unidentified consumer; migration dependencies are recorded in
  [`deletion-ledger.md`](deletion-ledger.md).
