package com.dreamboard.reducer.contract

import kotlinx.serialization.MissingFieldException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import kotlin.io.path.readText
import kotlin.test.Test

/**
 * The Kotlin side of the reducer-contract conformance harness. We load the
 * exact same JSON fixtures the TS conformance test loads and decode them
 * under the generated `kotlinx.serialization` classes. This is the one
 * layer that catches wire drift between the two languages — the drift that
 * produced the catan rollDie/resume bug.
 *
 * If you add a new fixture, add it to both the Kotlin [fixtures] list and
 * `packages/reducer-contract/fixtures/index.ts`; future automation can
 * enforce that they are the same set.
 */
class ReducerContractConformanceTest {
    // Strict by design: unknown keys fail, coercion off. We want wire drift
    // to be loud, not silently forgiven.
    private val json = Json {
        ignoreUnknownKeys = false
        coerceInputValues = false
        explicitNulls = true
        classDiscriminator = "kind" // matches @JsonClassDiscriminator on top-level unions
    }

    // We also need a per-union decoder for shapes discriminated on "type"
    // (Effect). kotlinx.serialization picks the discriminator from the
    // sealed-interface annotation; no extra config needed here.
    private val fixturesDir: Path =
        Paths.get(
            System.getProperty("user.dir"),
        ).resolve(FIXTURES_RELATIVE)

    private val fixtures = listOf(
        Fixture("reducer-session-state.json", FixtureType.REDUCER_SESSION_STATE),
        Fixture("reducer-runtime-state-simultaneous.json", FixtureType.REDUCER_RUNTIME_STATE),
        Fixture("reducer-runtime-log-entry-state-commit.json", FixtureType.REDUCER_RUNTIME_LOG_ENTRY),
        Fixture("dispatch-request.json", FixtureType.DISPATCH_REQUEST),
        Fixture("effect-transition.json", FixtureType.EFFECT),
        Fixture("effect-roll-die-fire-and-forget.json", FixtureType.EFFECT),
        Fixture("effect-roll-die-with-continuation.json", FixtureType.EFFECT),
        Fixture("effect-shuffle-fire-and-forget.json", FixtureType.EFFECT),
        Fixture("effect-shuffle-player-zone-fire-and-forget.json", FixtureType.EFFECT),
        Fixture("reduce-result-accept-mixed.json", FixtureType.REDUCE_RESULT),
        Fixture("reduce-result-reject.json", FixtureType.REDUCE_RESULT),
        Fixture("game-input-interaction-action.json", FixtureType.GAME_INPUT),
        Fixture("game-input-interaction-prompt.json", FixtureType.GAME_INPUT),
        Fixture("dispatch-result-accept.json", FixtureType.DISPATCH_RESULT),
        Fixture("dispatch-result-reject.json", FixtureType.DISPATCH_RESULT),
        Fixture("initialize-request.json", FixtureType.INITIALIZE_REQUEST),
        Fixture("initialize-phase-request.json", FixtureType.INITIALIZE_PHASE_REQUEST),
        Fixture("validate-input-request.json", FixtureType.VALIDATE_INPUT_REQUEST),
        Fixture("reduce-request.json", FixtureType.REDUCE_REQUEST),
        Fixture("project-seats-dynamic-request.json", FixtureType.PROJECT_SEATS_DYNAMIC_REQUEST),
        Fixture("seat-projection.json", FixtureType.SEAT_PROJECTION),
        Fixture("seat-projection-bundle.json", FixtureType.SEAT_PROJECTION_BUNDLE),
    )

    @Test
    fun `every fixture decodes under the generated kotlinx_serialization classes`() {
        assertThat(Files.isDirectory(fixturesDir))
            .withFailMessage("Fixtures dir not found at $fixturesDir")
            .isTrue()

        for (fixture in fixtures) {
            val text = fixturesDir.resolve(fixture.filename).readText()
            when (fixture.type) {
                FixtureType.EFFECT -> json.decodeFromString<Effect>(text)
                FixtureType.REDUCE_RESULT -> json.decodeFromString<ReduceResult>(text)
                FixtureType.DISPATCH_RESULT -> json.decodeFromString<DispatchResult>(text)
                FixtureType.GAME_INPUT -> json.decodeFromString<GameInput>(text)
                FixtureType.INITIALIZE_REQUEST -> json.decodeFromString<InitializeRequest>(text)
                FixtureType.INITIALIZE_PHASE_REQUEST -> json.decodeFromString<InitializePhaseRequest>(text)
                FixtureType.VALIDATE_INPUT_REQUEST -> json.decodeFromString<ValidateInputRequest>(text)
                FixtureType.REDUCE_REQUEST -> json.decodeFromString<ReduceRequest>(text)
                FixtureType.DISPATCH_REQUEST -> json.decodeFromString<DispatchRequest>(text)
                FixtureType.PROJECT_SEATS_DYNAMIC_REQUEST -> json.decodeFromString<ProjectSeatsDynamicRequest>(text)
                FixtureType.SEAT_PROJECTION -> json.decodeFromString<SeatProjection>(text)
                FixtureType.SEAT_PROJECTION_BUNDLE -> json.decodeFromString<SeatProjectionBundle>(text)
                FixtureType.REDUCER_SESSION_STATE -> json.decodeFromString<ReducerSessionState>(text)
                FixtureType.REDUCER_RUNTIME_STATE -> json.decodeFromString<ReducerRuntimeState>(text)
                FixtureType.REDUCER_RUNTIME_LOG_ENTRY -> json.decodeFromString<ReducerRuntimeLogEntry>(text)
            }
        }
    }

    @Test
    fun `every fixture round-trips through encode - decode stably`() {
        for (fixture in fixtures) {
            val text = fixturesDir.resolve(fixture.filename).readText()
            val reEncoded = when (fixture.type) {
                FixtureType.EFFECT -> {
                    val decoded = json.decodeFromString<Effect>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<Effect>(again)
                    again
                }
                FixtureType.REDUCE_RESULT -> {
                    val decoded = json.decodeFromString<ReduceResult>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ReduceResult>(again)
                    again
                }
                FixtureType.DISPATCH_RESULT -> {
                    val decoded = json.decodeFromString<DispatchResult>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<DispatchResult>(again)
                    again
                }
                FixtureType.GAME_INPUT -> {
                    val decoded = json.decodeFromString<GameInput>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<GameInput>(again)
                    again
                }
                FixtureType.INITIALIZE_REQUEST -> {
                    val decoded = json.decodeFromString<InitializeRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<InitializeRequest>(again)
                    again
                }
                FixtureType.INITIALIZE_PHASE_REQUEST -> {
                    val decoded = json.decodeFromString<InitializePhaseRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<InitializePhaseRequest>(again)
                    again
                }
                FixtureType.VALIDATE_INPUT_REQUEST -> {
                    val decoded = json.decodeFromString<ValidateInputRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ValidateInputRequest>(again)
                    again
                }
                FixtureType.REDUCE_REQUEST -> {
                    val decoded = json.decodeFromString<ReduceRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ReduceRequest>(again)
                    again
                }
                FixtureType.DISPATCH_REQUEST -> {
                    val decoded = json.decodeFromString<DispatchRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<DispatchRequest>(again)
                    again
                }
                FixtureType.PROJECT_SEATS_DYNAMIC_REQUEST -> {
                    val decoded = json.decodeFromString<ProjectSeatsDynamicRequest>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ProjectSeatsDynamicRequest>(again)
                    again
                }
                FixtureType.SEAT_PROJECTION -> {
                    val decoded = json.decodeFromString<SeatProjection>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<SeatProjection>(again)
                    again
                }
                FixtureType.SEAT_PROJECTION_BUNDLE -> {
                    val decoded = json.decodeFromString<SeatProjectionBundle>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<SeatProjectionBundle>(again)
                    again
                }
                FixtureType.REDUCER_SESSION_STATE -> {
                    val decoded = json.decodeFromString<ReducerSessionState>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ReducerSessionState>(again)
                    again
                }
                FixtureType.REDUCER_RUNTIME_STATE -> {
                    val decoded = json.decodeFromString<ReducerRuntimeState>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ReducerRuntimeState>(again)
                    again
                }
                FixtureType.REDUCER_RUNTIME_LOG_ENTRY -> {
                    val decoded = json.decodeFromString<ReducerRuntimeLogEntry>(text)
                    val again = json.encodeToString(decoded)
                    json.decodeFromString<ReducerRuntimeLogEntry>(again)
                    again
                }
            }
            // Soft check: the re-encoded payload must still parse. Exact-byte
            // equality would be over-strict since kotlinx may reorder keys
            // or omit defaults; the TS harness checks parsed-structure equality.
            assertThat(reEncoded).isNotBlank()
        }
    }

    // Cross-language parity: if kotlinx's encode-output is structurally equal
    // to the raw fixture JSON, AND zod's parse-output is structurally equal to
    // the same raw fixture JSON (asserted in the TS conformance suite), then
    // transitively the two language runtimes agree on the wire. This is the
    // actual drift-catching invariant the contract package exists to uphold;
    // without it, the per-language round-trips could individually stay green
    // while the two sides quietly diverge (e.g. a default value omitted on
    // one side, an alias renamed on the other).
    @Test
    fun `kotlinx encode output matches the raw fixture JSON element-for-element`() {
        for (fixture in fixtures) {
            val text = fixturesDir.resolve(fixture.filename).readText()
            val raw = json.parseToJsonElement(text)

            val encoded = when (fixture.type) {
                FixtureType.EFFECT -> json.encodeToString(json.decodeFromString<Effect>(text))
                FixtureType.REDUCE_RESULT -> json.encodeToString(json.decodeFromString<ReduceResult>(text))
                FixtureType.DISPATCH_RESULT -> json.encodeToString(json.decodeFromString<DispatchResult>(text))
                FixtureType.GAME_INPUT -> json.encodeToString(json.decodeFromString<GameInput>(text))
                FixtureType.INITIALIZE_REQUEST -> json.encodeToString(json.decodeFromString<InitializeRequest>(text))
                FixtureType.INITIALIZE_PHASE_REQUEST -> json.encodeToString(json.decodeFromString<InitializePhaseRequest>(text))
                FixtureType.VALIDATE_INPUT_REQUEST -> json.encodeToString(json.decodeFromString<ValidateInputRequest>(text))
                FixtureType.REDUCE_REQUEST -> json.encodeToString(json.decodeFromString<ReduceRequest>(text))
                FixtureType.DISPATCH_REQUEST -> json.encodeToString(json.decodeFromString<DispatchRequest>(text))
                FixtureType.PROJECT_SEATS_DYNAMIC_REQUEST -> json.encodeToString(json.decodeFromString<ProjectSeatsDynamicRequest>(text))
                FixtureType.SEAT_PROJECTION -> json.encodeToString(json.decodeFromString<SeatProjection>(text))
                FixtureType.SEAT_PROJECTION_BUNDLE -> json.encodeToString(json.decodeFromString<SeatProjectionBundle>(text))
                FixtureType.REDUCER_SESSION_STATE -> json.encodeToString(json.decodeFromString<ReducerSessionState>(text))
                FixtureType.REDUCER_RUNTIME_STATE -> json.encodeToString(json.decodeFromString<ReducerRuntimeState>(text))
                FixtureType.REDUCER_RUNTIME_LOG_ENTRY -> json.encodeToString(json.decodeFromString<ReducerRuntimeLogEntry>(text))
            }
            val encodedAsElement = json.parseToJsonElement(encoded)

            assertThat(canonicalize(encodedAsElement))
                .withFailMessage {
                    "Fixture ${fixture.filename} diverged after kotlinx encode:\n" +
                        "  raw:     $raw\n" +
                        "  encoded: $encodedAsElement"
                }
                .isEqualTo(canonicalize(raw))
        }
    }

    @Test
    fun `generated reducer bundle operations declare payload measurement policy`() {
        val requestOperations =
            listOf(
                ReducerBundleOperations.INITIALIZE,
                ReducerBundleOperations.INITIALIZE_PHASE,
                ReducerBundleOperations.VALIDATE_INPUT,
                ReducerBundleOperations.REDUCE,
                ReducerBundleOperations.DISPATCH,
                ReducerBundleOperations.PROJECT_SEATS_DYNAMIC,
            )
        for (operation in requestOperations) {
            assertThat(operation.requestPayloadMeasurement)
                .isEqualTo(ReducerBundlePayloadMeasurement.JSON_BYTES)
            assertThat(operation.responsePayloadMeasurement)
                .isEqualTo(ReducerBundlePayloadMeasurement.JSON_BYTES)
        }

        assertThat(ReducerBundleOperations.PROJECT_STATIC.requestPayloadMeasurement)
            .isEqualTo(ReducerBundlePayloadMeasurement.NONE)
        assertThat(ReducerBundleOperations.PROJECT_STATIC.responsePayloadMeasurement)
            .isEqualTo(ReducerBundlePayloadMeasurement.JSON_BYTES)
    }

    // Recursively sort object keys so structural comparison is order-insensitive.
    // We don't rely on kotlinx's key ordering being stable; we only rely on it
    // producing the same *set* of keys and values as the canonical fixture.
    private fun canonicalize(element: JsonElement): JsonElement = when (element) {
        is kotlinx.serialization.json.JsonObject ->
            kotlinx.serialization.json.JsonObject(
                element.toSortedMap().mapValues { (_, v) -> canonicalize(v) },
            )
        is kotlinx.serialization.json.JsonArray ->
            kotlinx.serialization.json.JsonArray(element.map { canonicalize(it) })
        else -> element
    }

    @Test
    fun `rejects legacy rollDie shape carrying a resume key`() {
        // The exact catan payload: old-shape rollDie with resume: null. The
        // new schema has no such field anywhere in Effect; strict parsing
        // must reject it.
        val legacy = """
            {"effectId":"ef0","type":"rollDie","dieId":"die-red","resume":null}
        """.trimIndent()
        assertThatThrownBy { json.decodeFromString<Effect>(legacy) }
            .isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `rejects legacy rollDie shape with a non-null resume object`() {
        val legacy = """
            {"effectId":"ef0","type":"rollDie","dieId":"die-red",
             "resume":{"id":"afterRoll","data":{}}}
        """.trimIndent()
        assertThatThrownBy { json.decodeFromString<Effect>(legacy) }
            .isInstanceOf(SerializationException::class.java)
    }

    @Test
    fun `reduce result accept separates effects from continuations via sparse map`() {
        val text = fixturesDir.resolve("reduce-result-accept-mixed.json").readText()
        val decoded = json.decodeFromString<ReduceResult>(text)
        assertThat(decoded).isInstanceOf(ReduceResult.Accept::class.java)
        val accept = decoded as ReduceResult.Accept

        // Only the effect with a continuation appears in the map; the
        // transition + rollDie effects are absent. This is the new idiom:
        // absence ⇔ fire-and-forget.
        assertThat(accept.continuations.keys).containsExactlyInAnyOrder("ef2")
        assertThat(accept.continuations["ef2"]?.id).isEqualTo("afterShuffle")
    }

    @Test
    fun `protocol version constant matches semver`() {
        assertThat(REDUCER_CONTRACT_VERSION).matches(Regex("^\\d+\\.\\d+\\.\\d+$").toPattern())
    }

    @Test
    fun `strict json rejects unknown keys on effects`() {
        // Guard: if somebody ever turns on `ignoreUnknownKeys = true` at the
        // wire boundary, this test breaks and forces a conversation. A future
        // JS reducer emitting an un-schematized field must fail loudly at the
        // Kotlin decode boundary, not silently drop data.
        val effectWithExtra = """
            {"effectId":"ef0","type":"rollDie","dieId":"die-red","hacked":true}
        """.trimIndent()
        assertThatThrownBy { json.decodeFromString<Effect>(effectWithExtra) }
            .isInstanceOf(SerializationException::class.java)

        val resultWithExtra = """
            {"kind":"reject","errorCode":"nope","unexpected":42}
        """.trimIndent()
        assertThatThrownBy { json.decodeFromString<ReduceResult>(resultWithExtra) }
            .isInstanceOf(SerializationException::class.java)

        val traceEntryWithExtra = """
            {"kind":"accept","state":{},
             "trace":[{"kind":"appliedEffect",
                       "effect":{"effectId":"ef0","type":"transition","to":"main"},
                       "bogus":"please fail"}]}
        """.trimIndent()
        assertThatThrownBy { json.decodeFromString<DispatchResult>(traceEntryWithExtra) }
            .isInstanceOf(SerializationException::class.java)
    }

    private enum class FixtureType {
        EFFECT,
        REDUCE_RESULT,
        DISPATCH_RESULT,
        GAME_INPUT,
        INITIALIZE_REQUEST,
        INITIALIZE_PHASE_REQUEST,
        VALIDATE_INPUT_REQUEST,
        REDUCE_REQUEST,
        DISPATCH_REQUEST,
        PROJECT_SEATS_DYNAMIC_REQUEST,
        SEAT_PROJECTION,
        SEAT_PROJECTION_BUNDLE,
        REDUCER_SESSION_STATE,
        REDUCER_RUNTIME_STATE,
        REDUCER_RUNTIME_LOG_ENTRY,
    }

    private data class Fixture(val filename: String, val type: FixtureType)

    companion object {
        private const val FIXTURES_RELATIVE = "fixtures"
    }
}
