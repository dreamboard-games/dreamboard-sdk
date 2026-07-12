# Phase 00H Game Identity And Demo Ledger

Recorded: 2026-07-13

Scope: local source inspection. Stable technical identities and approved
public names/themes are frozen here. Current active-release contents in a live
environment were not queried; landing selection below describes repository
source behavior and the checked `preview-all` release set.

## Identity Freeze

Do not rename any directory, `reference-game.json.id`, package name,
`demoRelease.slug`, public route key, release-object namespace, stored
demo-session slug, or perf workload key in this workstream. A change to one of
those values requires a separate identity migration with aliases/data
migration; display and theme changes do not.

There is no separate authored manifest game ID in the current workspace
contract. The stable reference ID is `reference-game.json.id`; the SDK source
manifest copies that value as its game entry ID.

| Directory and reference ID     | Frozen package name                                | Frozen demo slug               | Public routes                                                                          | Immutable release-object namespace      | Frozen perf key       |
| ------------------------------ | -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------- | --------------------- |
| `hearts`                       | `@dreamboard/example-hearts`                       | `hearts`                       | `/demo/hearts`, `/demo/hearts/<shortCode>`                                             | `demos/hearts/**`                       | None                  |
| `simultaneous-card-drafting`   | `@dreamboard/example-simultaneous-card-drafting`   | `simultaneous-card-drafting`   | `/demo/simultaneous-card-drafting`, `/demo/simultaneous-card-drafting/<shortCode>`     | `demos/simultaneous-card-drafting/**`   | None                  |
| `deck-building-market`         | `@dreamboard-reference/deck-building-market`       | `deck-building-market`         | `/demo/deck-building-market`, `/demo/deck-building-market/<shortCode>`                 | `demos/deck-building-market/**`         | None                  |
| `worker-placement-tableau`     | `@dreamboard-reference/worker-placement-tableau`   | `worker-placement-tableau`     | `/demo/worker-placement-tableau`, `/demo/worker-placement-tableau/<shortCode>`         | `demos/worker-placement-tableau/**`     | None                  |
| `hex-network-trading`          | `@dreamboard/example-frontier-trails`              | `hex-network-trading`          | `/demo/hex-network-trading`, `/demo/hex-network-trading/<shortCode>`                   | `demos/hex-network-trading/**`          | `hex-network-trading` |
| `roll-and-write-scorecard`     | `@dreamboard/example-cloudline-survey`             | `roll-and-write-scorecard`     | `/demo/roll-and-write-scorecard`, `/demo/roll-and-write-scorecard/<shortCode>`         | `demos/roll-and-write-scorecard/**`     | None                  |
| `multiplayer-ranking-and-ties` | `@dreamboard/example-multiplayer-ranking-and-ties` | `multiplayer-ranking-and-ties` | `/demo/multiplayer-ranking-and-ties`, `/demo/multiplayer-ranking-and-ties/<shortCode>` | `demos/multiplayer-ranking-and-ties/**` | None                  |
| `solo-countdown-puzzle`        | `@dreamboard-reference/solo-countdown-puzzle`      | `solo-countdown-puzzle`        | `/demo/solo-countdown-puzzle`, `/demo/solo-countdown-puzzle/<shortCode>`               | `demos/solo-countdown-puzzle/**`        | None                  |
| `automa-river-rival`           | `@dreamboard/example-automa-river-rival`           | `automa-river-rival`           | `/demo/automa-river-rival`, `/demo/automa-river-rival/<shortCode>`                     | `demos/automa-river-rival/**`           | None                  |

Published object-store keys add the immutable prefix
`demo-releases/v2/sha256-<release-digest>/` before the namespace above. API
catalog/session routes use the same slug:
`/api/demo-games/<slug>`, `/api/demo-games/<slug>/thumbnail`, and
`/api/demo-games/<slug>/sessions`.

Four earlier capability-research briefs also have stable compatibility IDs:

| Stable game ID                 | Capability-research reference ID  |
| ------------------------------ | --------------------------------- |
| `roll-and-write-scorecard`     | `roll-and-write-scorecard-01`     |
| `multiplayer-ranking-and-ties` | `multiplayer-ranking-and-ties-01` |
| `solo-countdown-puzzle`        | `solo-countdown-puzzle-01`        |
| `automa-river-rival`           | `automa-river-rival-01`           |

Those suffixed IDs key files under
`docs/capability-research/competition-game-authoring/`, its capability matrix,
and `scripts/capability/check-competition-game-briefs.mjs`. They remain stable
research references but are not runtime game IDs, package names, or demo slugs.
The five adapted teaching games have no corresponding suffixed anchor ID.

## Approved Public Names And Themes

| Stable ID                      | Approved display name | Frozen theme and presentation direction                                                                                                                                                | Conformance phase |
| ------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------: |
| `hearts`                       | Hearts                | A clear contemporary standard-card table with traditional suits/ranks, strong red/black contrast, readable tricks and no added fictional setting                                       |                05 |
| `simultaneous-card-drafting`   | Lantern Market        | Night-market stalls decorated with bright lanterns, paired tea cups and matching banners; private rotating hands and growing stalls; no sushi/restaurant-derived vocabulary or art     |                03 |
| `deck-building-market`         | Sketchbook            | Competing artists grow portfolios from Doodles through Sketches/Inkworks to Ideas, Concepts and Masterpieces, with loose ink, pencil, paper and studio-shelf presentation              |                05 |
| `worker-placement-tableau`     | Mosaic Workshop       | Two warm civic workshops collect timber, shape stone, earn coin and fit crafted pieces into personal mosaics around crowded shared work sites                                          |                05 |
| `hex-network-trading`          | Stormtrail            | Three expedition crews cross a hazardous frontier of timber forests, clay flats and grain fields, connecting camps with trails while storms shelter bandits                            |                03 |
| `roll-and-write-scorecard`     | Cloudline Survey      | Public field-notebook grids, contour maps, weather instruments and annotated cloud formations as crews chart eight shared weather readings                                             |                02 |
| `multiplayer-ranking-and-ties` | Harbor Fair           | Organizers build public festival rows of food, craft and music stalls under harbor flags and changing weather; storms may cancel the fair                                              |                04 |
| `solo-countdown-puzzle`        | Last Light            | One lighthouse keeper relights three coastal beacons while energy, reinforcement, weather fronts and the dawn countdown remain visible together                                        |                03 |
| `automa-river-rival`           | River Guild           | One or two merchants cooperate over a changing river market while an institutional rival guild resolves stamped standing orders as a deterministic procedure, never a player character |                04 |

The stable `hex-network-trading` identity deliberately survives the Stormtrail
retheme. The same rule applies to old-theme package names such as
`@dreamboard/example-frontier-trails`: they remain technical identities in this
plan.

## Current Demo Metadata And Required Cutover

All nine `reference-game.json` files currently declare `demoRelease`, so all
nine are packageable. SDK validation forbids an authored
`demoRelease.sourcePath`; therefore every current source path is implicitly the
game's own `examples/reference-games/<id>` directory.

Every target complete-game proof path is
`test/scenarios/complete-game.scenario.ts`. That file is currently absent in
all nine games and is created by the owning conformance phase.

| Stable ID                      | Current `displayName` / `demoRelease.name`                  | Current players; demo count; minutes; difficulty | Source path                             | Current hero                                      | Current thumbnail  | Complete-game owner |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------ | --------------------------------------- | ------------------------------------------------- | ------------------ | ------------------: |
| `hearts`                       | Hearts / Hearts                                             | `4-4`; `4`; `20-40`; `2`                         | Implicit `hearts`                       | `/demos/hearts/desktop.png`                       | No `thumbnailPath` |                  05 |
| `simultaneous-card-drafting`   | Simultaneous Card Drafting / Simultaneous Card Drafting     | `2-5`; `4`; `20-35`; `2`                         | Implicit `simultaneous-card-drafting`   | `/demos/simultaneous-card-drafting/desktop.png`   | No `thumbnailPath` |                  03 |
| `deck-building-market`         | Deck Building Market / Deck Building Market                 | `2-2`; `2`; `20-30`; `2`                         | Implicit `deck-building-market`         | `/demos/deck-building-market/desktop.png`         | No `thumbnailPath` |                  05 |
| `worker-placement-tableau`     | Worker Placement Tableau / Worker Placement Tableau         | `2-2`; `2`; `30-45`; `3`                         | Implicit `worker-placement-tableau`     | `/demos/worker-placement-tableau/desktop.png`     | No `thumbnailPath` |                  05 |
| `hex-network-trading`          | Hex Network Trading / Hex Network Trading                   | `3-4`; `4`; `60-120`; `3`                        | Implicit `hex-network-trading`          | `/demos/hex-network-trading/desktop.png`          | No `thumbnailPath` |                  03 |
| `roll-and-write-scorecard`     | Roll And Write Scorecard / Roll And Write Scorecard         | `1-4`; `3`; `15-25`; `1`                         | Implicit `roll-and-write-scorecard`     | `/demos/roll-and-write-scorecard/desktop.png`     | No `thumbnailPath` |                  02 |
| `multiplayer-ranking-and-ties` | Multiplayer Ranking And Ties / Multiplayer Ranking And Ties | `2-4`; `4`; `15-30`; `2`                         | Implicit `multiplayer-ranking-and-ties` | `/demos/multiplayer-ranking-and-ties/desktop.png` | No `thumbnailPath` |                  04 |
| `solo-countdown-puzzle`        | Solo Countdown Puzzle / Solo Countdown Puzzle               | `1-1`; `1`; `10-20`; `2`                         | Implicit `solo-countdown-puzzle`        | `/demos/solo-countdown-puzzle/desktop.png`        | No `thumbnailPath` |                  03 |
| `automa-river-rival`           | Automa River Rival / Automa River Rival                     | `1-1`; `1`; `15-25`; `2`                         | Implicit `automa-river-rival`           | `/demos/automa-river-rival/desktop.png`           | No `thumbnailPath` |                  04 |

Current metadata is characterization, not authority. In particular:

- all display/demo names except Hearts still use legacy names;
- Stormtrail's approved rules require exactly three players, while current
  demo metadata says `3-4` with four demo players;
- River Guild supports one or two humans, while current demo metadata says
  `1-1`; and
- theme descriptions, overviews, mechanics/categories, manifest player bounds,
  UI copy and assets must be reconciled to each approved brief without changing
  the frozen identities.

Every game also carries a `demoRelease.screenshot.presets` object today. The
internal assembler ignores it, and the plan deletes this stale metadata after
scenario-driven capture replaces it.

## Current Landing Selection

Repository source currently selects all nine games for the landing whenever
they are present in the active release:

1. `internal/infra/demo-release-sets/preview-all.json` uses
   `selection.mode: "all-packageable"`.
2. All nine SDK manifests declare `demoRelease`.
3. The backend's `DemoCatalogService.listDemos()` returns every active-release
   entry.
4. `PlayableDemosSection.tsx` maps every returned entry without an allowlist.

| Stable ID                      | Selected by current repository landing flow?  | Evidence level    |
| ------------------------------ | --------------------------------------------- | ----------------- |
| `hearts`                       | Yes, when `preview-all` is the active release | Local source only |
| `simultaneous-card-drafting`   | Yes, when `preview-all` is the active release | Local source only |
| `deck-building-market`         | Yes, when `preview-all` is the active release | Local source only |
| `worker-placement-tableau`     | Yes, when `preview-all` is the active release | Local source only |
| `hex-network-trading`          | Yes, when `preview-all` is the active release | Local source only |
| `roll-and-write-scorecard`     | Yes, when `preview-all` is the active release | Local source only |
| `multiplayer-ranking-and-ties` | Yes, when `preview-all` is the active release | Local source only |
| `solo-countdown-puzzle`        | Yes, when `preview-all` is the active release | Local source only |
| `automa-river-rival`           | Yes, when `preview-all` is the active release | Local source only |

Phase 07 replaces this accidental all-active selection with one ordered
internal product allowlist. Non-allowlisted `preview-all` games remain directly
playable. No `landingDemo` field or product-selection policy is added to SDK
metadata.

The separate `ScrollShowcase.tsx` contains a handcrafted Hearts illustration
and rule sentence. It is landing content, but it does not select a demo slug or
consume the active demo catalog.

## Media Drift

The same broken pattern applies to all nine current games:

- `demoRelease.heroImageUrl` points to `/demos/<slug>/desktop.png`;
- `PlayableDemosSection.tsx` ignores `DemoGameSummary.thumbnailUrl` and builds
  `/demos/<slug>/thumb.png`;
- `apps/web/public` contains no `demos/` directory and no matching hero/thumb
  files;
- no SDK game declares `demoRelease.thumbnailPath`;
- `DemoReleaseAssembler.kt` already supports an optional source-relative
  `thumbnailPath` and packages an existing file under
  `demos/<slug>/thumbnail/<filename>`;
- the backend already exposes a release-backed
  `/api/demo-games/<slug>/thumbnail` and includes that URL in catalog details;
  and
- `DemoPage.tsx` prefers the broken `heroImageUrl` before the release-backed
  thumbnail.

Phase 07 owns the cutover: curated SDK-owned thumbnail files for the product
allowlist, packaged `thumbnailPath`, API `thumbnailUrl` consumption, an
accessible tested fallback, removal of broken static hero/thumb paths, and
removal of ignored screenshot metadata. Media filenames are presentation
assets, not persistent game identities.

## Hard-Coded Downstream Identity Uses

### All nine IDs

- `dreamboard-sdk/scripts/ui/reference-games-lib.mjs` is the central hard-coded
  nine-game inventory. Keep each ID; update its legacy `displayName` values.
- Each `examples/reference-games/<id>/reference-game.json` repeats the stable
  ID and slug and supplies workspace discovery.
- `dreamboard-sdk/scripts/ui/required-ui-scenarios.mjs` hard-codes all nine
  required game IDs for UI coverage.
- `scripts/capability/check-competition-game-briefs.mjs` hard-codes the four
  suffixed capability-research IDs listed above; the capability matrix and
  historical phase docs consume them.
- SDK generated fixture paths and `packages/ui-workbench/src/catalog.ts` prefix
  scenario IDs with stable game IDs. These are derived and will stop being
  checked in, but the prefixes remain stable.
- Internal demo admission, catalog tables, API routes, stored demo-session
  keys and release-object paths are generic code parameterized by slug; they do
  not contain a second per-game identity registry.

### Hearts

- SDK required UI/parity/visual proof names `hearts.pass-three.mobile` in
  `scripts/ui/required-ui-scenarios.mjs`,
  `scripts/ui/component-scenario-index-lib.mjs`, Workbench tests and the
  Workbench test-route link.
- Internal `.github/workflows/ui-parity.yml` invokes that same scenario for
  real-host parity.
- Internal demo-release/staging tests use `hearts` as a representative generic
  slug. These are contract fixtures, not landing selection.

### Stormtrail (`hex-network-trading`)

- SDK required Workbench/visual proof names
  `hex-network-trading.build-trail.desktop` today.
- Internal perf freezes workload ID and demo slug `hex-network-trading` in
  `tools/perf/src/perf-catalog.ts` and
  `tools/perf/src/workloads/hex-network-trading/**`.
- Perf's checked scenario/replay uses
  `hex-network-trading-trade-cancel`; browser helpers still search for legacy
  `Hex Network Trading` UI text and old interactions. Phase 07 retargets these
  consumers to the compiled Stormtrail replay while preserving only the
  workload/slug identity.
- Private `tools/scenario-author` hard-codes the same fixture ID and slug in
  its adapter, draft union and next-action examples. That private identity
  surface is deleted after cutover.
- Internal release-contract golden fixtures and generated API documentation
  use `hex-network-trading` as a representative slug. They remain generic
  contract examples unless Phase 07 deliberately refreshes the fixtures.

### Mosaic Workshop (`worker-placement-tableau`)

- SDK required Workbench/visual proof names
  `worker-placement-tableau.place-worker.desktop` today. The stable game prefix
  remains even when the scenario/content is replaced.

### Other six games

No game-specific runtime, landing, perf, scenario-author, or route hard-code
was found outside the central SDK inventory, their own SDK source/derived
fixtures, and generic internal demo-release handling.

The `dreamboard` public CLI contains no hard-coded reference-game identity;
generated OpenAPI documentation uses `hex-network-trading` only as a schema
example.

## Reproducible Audit Commands

All commands exited `0` on 2026-07-13 and were read-only.

```bash
for game in examples/reference-games/*; do
  test -f "$game/reference-game.json" || continue
  jq '{id,displayName,demoRelease}' "$game/reference-game.json"
  jq '{name,dependencies}' "$game/package.json"
done

rg -n "hearts|simultaneous-card-drafting|deck-building-market|worker-placement-tableau|hex-network-trading|roll-and-write-scorecard|multiplayer-ranking-and-ties|solo-countdown-puzzle|automa-river-rival" \
  scripts packages examples/reference-games \
  ../dreamboard/apps ../dreamboard/packages \
  ../internal/apps ../internal/packages ../internal/tools ../internal/infra

find ../internal/apps/web/public -type f -print
find examples/reference-games -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) \
  -print
```

## Phase 00H Conclusion

All nine persistent identities and approved public names/themes are accounted
for. No stable-ID/slug rename is proposed, and no Phase 00 STOP condition was
found. The unresolved landing subset is deliberately a Phase 07 internal
product-policy choice; current repository behavior includes all packageable
active-release entries.
