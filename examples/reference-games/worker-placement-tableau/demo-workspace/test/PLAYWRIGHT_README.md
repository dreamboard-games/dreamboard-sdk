# Artisans' Guild — Playwright e2e (T200)

The reducer is exhaustively covered by 30 scenario tests under `test/scenarios/`. T200's e2e drives the same chain through the live React UI at `/_dev/play/:shortCode` to acceptance-gate the full integration: backend session → SSE wiring → ui-sdk plugin runtime → host shell → action-form modals.

## Prerequisites

All four local services must be running:

- **Backend** at `http://localhost:8080`
  ```bash
  /Users/kevintang/code/exp/apps/backend/scripts/backend-local.sh start
  ```
- **Compiler** at `http://localhost:3001`
  ```bash
  pnpm --dir /Users/kevintang/code/exp/apps/compiler-worker dev
  ```
- **Web (default)** at `http://localhost:5173`
  ```bash
  bun --dir /Users/kevintang/code/exp/apps/web dev
  ```
- **Web harness** at `http://localhost:5174` (this is the one e2e uses)
  ```bash
  bun --dir /Users/kevintang/code/exp/apps/web dev:harness
  ```
  The harness mode auto-signs into the local-harness user, so the `/_dev/play/:shortCode` route renders without the standard login redirect.

You also need an authenticated CLI session:

```bash
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts login --env local
```

## Bootstrap — provisioning a session

The artisans-guild source is checked into `examples/published/artisans-guild`. To get a backend-registered game with a `shortCode`, copy the source into a fresh `dreamboard new` scaffold and sync it up:

```bash
# 1. Provision a fresh backend game (writes a real gameId to .dreamboard/project.json).
cd /tmp
rm -rf artisans-guild-e2e
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts new artisans-guild-e2e \
  --description "Artisans guild T200 e2e session" --env local

# 2. Replace the scaffold's source with the curated artisans-guild source.
SRC=/Users/kevintang/code/exp/examples/published/artisans-guild
DST=/tmp/artisans-guild-e2e
rm -rf $DST/app $DST/manifest.ts $DST/rule.md $DST/shared $DST/test $DST/ui $DST/manifest.tsconfig.json
cp -R $SRC/app $SRC/shared $SRC/test $SRC/ui $DST/
cp $SRC/manifest.ts $SRC/manifest.tsconfig.json $SRC/rule.md $DST/
cd $DST && bun install lucide-react

# 3. Sync the source up to the backend.
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts sync --env local --force --yes

# 4. Compile.  ⚠️ CURRENTLY BLOCKED — see the evidence log §UI bugs / gaps.
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts compile --env local

# 5. Start the dev host (or seed via a scenario for a deterministic state).
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts dev --env local
# or:
bun /Users/kevintang/code/exp/apps/dreamboard-cli/src/index.ts dev --env local \
  --from-scenario full-season-6-game-flow

# The CLI prints the shortCode. Export it for playwright.
export AG_SHORT_CODE=<paste-shortcode-here>
```

Once the compile gap is resolved, the harness route `http://localhost:5174/_dev/play/$AG_SHORT_CODE` will render the artisans-guild UI for the seated player.

## Running the playwright spec

```bash
cd examples/published/artisans-guild
AG_SHORT_CODE=<shortcode> bunx playwright test test/playwright/e2e-artisans-guild.spec.ts
```

The spec opens two browser contexts (one per seat) and walks the canonical chain that `test/scenarios/full-season-6-game-flow.scenario.ts` already exercises against the in-process reducer.

## Interactive playwright-cli driving

For exploratory walkthroughs, drive the harness manually with `playwright-cli`:

```bash
playwright-cli -s=ag-e2e open http://localhost:5174/_dev/play/$AG_SHORT_CODE
playwright-cli -s=ag-e2e snapshot
playwright-cli -s=ag-e2e click <ref>
# ...
playwright-cli -s=ag-e2e screenshot --filename=test/screenshots/<name>.png
playwright-cli -s=ag-e2e close
```

## Evidence

Screenshots and the structured evidence log live under:

- `test/screenshots/` — captured at key moments.
- `docs/goals/artisans-guild-implementation/notes/T200-playwright-evidence.md` — the evidence log + mechanic-coverage matrix.
