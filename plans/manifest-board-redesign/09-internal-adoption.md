# 09 — Internal repository adoption

Repository: `dreamboard-games/dreamboard-internal` (private). Two PRs in one stack.
Read first: the internal repo's `CLAUDE.md` (contract workflow and verification
lanes). Paths below are relative to that repository.

## PR A — `backend/manifest-players-only`

Independent of the SDK stack. Land before PR B, and before any game compiled
with the new SDK is uploaded.

### Why

The backend reads `manifest.players` for sessions and currently traverses
`manifest.cardSets[].cards` in `PlayableRevisionService` to find image assets.
The latter coupling must move to source-owned packaging: deliver admitted files
under `assets/` plus `rule.md`, not a Kotlin interpretation of SDK components.
This includes unused authored assets; a compiler-owned used-asset receipt can
optimize that later if needed. Never include source code in the asset list.

The full manifest is currently modelled three times:

- Public OpenAPI: `packages/api-client/openapi/documentation.yaml`
  (`GameTopologyManifest` and its sub-schemas), generating HeyAPI types and Zod
  (`zGameTopologyManifest`).
- Private OpenAPI: `packages/private-contracts/openapi/schemas/manifest.yaml`,
  generating Kotlin `com.dreamboard.contracts.models.GameTopologyManifest`.
- Stored as typed JSONB: `GameRevisionsTable.manifest`
  (`apps/backend/src/main/kotlin/models/GameRevision.kt:42`) and
  `GameSessionsTable.manifest` (`apps/backend/src/main/kotlin/models/GameSessionsTable.kt:24`).

Every SDK manifest change therefore needs OpenAPI edits, regeneration and stored
data compatibility. The compiler also validates the full shape with
`zGameTopologyManifest.strict()` before calling the SDK's own validator
(`packages/compiler-core/src/manifest/materialize-authored-manifest.ts:118`).
Layer 01's JSON Schema field schemas would fail that check.

### Change

1. **Contracts.** In both OpenAPI sources, reduce `GameTopologyManifest` to:

   ```yaml
   GameTopologyManifest:
     type: object
     description: SDK-owned manifest. The platform reads only `players`; the SDK validates the rest.
     required: [players]
     properties:
       players:
         $ref: "#/components/schemas/PlayersDefinition"
     additionalProperties: true
   ```

   Delete the sub-schemas nothing else references (`CardSetDefinition`,
   `ZoneSpec`, `BoardSpec` and friends). Regenerate the Kotlin and TypeScript
   outputs with the repository's contract tooling
   (`tools/repo-scripts/src/contracts/generate.ts`) and confirm with
   `pnpm contracts:check`.

2. **Backend storage.** Full manifest request/response values must also remain
   opaque at the generated Kotlin boundary; changing storage alone would lose
   unknown fields before persistence. Verify generator support rather than
   assuming `additionalProperties` survives KotlinX serialization. A generated
   typed player summary is validated at service ingress.

   **Storage implementation.** Store the manifest as the JSON the compiler produced.
   A generated class with `additionalProperties` would silently drop fields on
   deserialization, so this is the justified exception to the
   "no `JsonObject` in Kotlin" rule: the platform must not model an SDK-owned
   document. Keep one small typed view for what the backend reads:

   ```kotlin
   @Serializable
   data class ManifestSummary(val players: PlayersDefinition)

   // GameRevision / GameSessionsTable
   val manifest = jsonb<JsonObject>("manifest", dreamboardJson)

   fun JsonObject.manifestSummary(): ManifestSummary =
       manifestSummaryJson.decodeFromJsonElement(ManifestSummary.serializer(), this)
   // manifestSummaryJson: Json { ignoreUnknownKeys = true }
   ```

   Replace `source.manifest.players` reads with `manifestSummary().players`.

3. **Hashing.** `computeManifestHash`
   (`apps/backend/src/main/kotlin/utils/ManifestHashUtils.kt`) keeps its
   sorted-key canonical form but hashes the stored `JsonObject` directly instead
   of re-encoding a typed model. Re-encoding drops unknown fields and may omit
   defaults, so hashes of some existing manifests can change once. Check where
   `manifestContentHash` is compared (`GameRevisionServiceImpl`,
   `EmbeddedHarness`) and add a test that a re-upload of an unchanged manifest
   produced by the compiler hashes identically before and after.

4. **Compiler.** In `materialize-authored-manifest.ts`, replace
   `zGameTopologyManifest.strict().safeParse(value)` with: value is a JSON
   object with a valid `players` field, then `compileManifest(value)` from the
   SDK (already called on the next line) as the full validator. Keep the Deno
   sandbox's JSON-compatibility and import-policy checks unchanged.

5. **Consumers of the generated types.** Update `apps/gameplay`,
   `packages/demo-release-core` and `apps/compiler-worker` imports of the removed
   sub-types.

### Verify

```sh
pnpm check
pnpm verify:embedded
./gradlew :apps:backend:test
```

## PR B — `sdk/repin-board-redesign`

On PR A, after the SDK alpha is published.

### Change

```sh
pnpm sdk:repin <alpha-version>
```

Then fix consumers of the changed SDK surfaces:

| SDK change (layer)                                    | Internal consumers to update                                                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `z`/`ref` field schemas (01)                          | Demo reference-game sources; compiler sandbox test that evaluates a manifest using `z` and `ref`                                                                                                                |
| `boardStatic` holds the catalog; bundle `boards` (06) | `apps/gameplay` projection and fixtures, `packages/browser-gameplay-runtime/src/gameplay-ui.ts`, `packages/ui-host-runtime` screenshot projection, `apps/gamepiece` fixtures (`boardStatic() { return null; }`) |
| Seat zones keyed by host (03)                         | Browser runtime and host UI zone readers                                                                                                                                                                        |
| Board target value kinds (05)                         | Host runtime parsing of board targets                                                                                                                                                                           |

Shared static delivery may contain only explicitly public definitions/shells.
Seat boards and audience-filtered events must pass through gameplay workers,
hosted frames, browser gameplay and screenshots consistently. Inspect actual
hosted payloads and UI messages with the private-tile fixture.

Hard cut: old running games and checkpoints need not remain usable. Do not add
compatibility readers, migrations or a parallel legacy runtime. Rebuild reference
and demo artifacts and start fresh sessions with coordinated adoption.

Check public artifacts for private runtime assignments/setup state. Reusable tile
definitions remain public game rules. Local gameplay owns full state on the user's
machine; hosted multiplayer delivers only the authorized seat frame.

### Verify

```sh
pnpm check
pnpm verify:integration
```

Include a demo session of each reference game in the integration proof, and
the rulebook three-hex-tile story game if the demo catalog carries it.
