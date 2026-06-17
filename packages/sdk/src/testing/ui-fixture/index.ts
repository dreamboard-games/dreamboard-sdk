export {
  canonicalUIFixtureJson,
  canonicalizeUIFixtureJson,
  canonicalizeUIScenarioFixture,
  digestUIFixtureJson,
  digestUIFixtureRequest,
  digestUIFixtureTransportRequest,
  digestPluginProtocolTape,
  digestUIScenarioFixture,
  isSha256Digest,
  serializeUIScenarioFixture,
} from "./canonical.js";
export {
  createFixtureRuntime,
  type CreateFixtureRuntimeOptions,
  type FixtureRuntimeEvent,
  type FixtureRuntimeHarness,
} from "./create-fixture-runtime.js";
export { FixturePluginRuntime } from "./FixturePluginRuntime.js";
export {
  compilePluginProtocolTape,
  type CompilePluginProtocolTapeOptions,
} from "./compile-plugin-protocol-tape.js";
export {
  createDeterministicIdFactory,
  defaultFixtureEnvironmentInit,
  fixtureEnvironmentInitFor,
  type DeterministicIdFactory,
  type FixtureEnvironmentInit,
} from "./deterministic-environment.js";
export {
  assertDeterministicUIScenarioFixture,
  assertUIStepExpectationSatisfied,
  assertUniqueReplayIdentity,
  compileUIScenarioFixture,
  type CompileUIScenarioFixtureOptions,
  type UIReplayIdentityCandidate,
} from "./compiler.js";
export {
  UI_SCENARIO_FIXTURE_BUNDLE_SCHEMA_VERSION,
  UI_SCENARIO_FIXTURE_PLUGIN_RUNTIME_PROTOCOL,
  UI_SCENARIO_FIXTURE_SCHEMA_VERSION,
  UI_SCENARIO_FIXTURE_SUPPORTED_BROWSER_PROTOCOL_MAJOR,
  assertSupportedBrowserInteractionProtocol,
  parseUIScenarioFixture,
  parseUIScenarioFixtureBundleIndex,
  pluginProtocolTapeSchema,
  portableSemanticReplayStepSchema,
  uiFixtureFrameSchema,
  uiFixtureProtocolStepSchema,
  uiReplayExecutionSchema,
  uiReplayRequestSchema,
  uiResolvedReplayIdentitySchema,
  uiScenarioFixtureBundleIndexSchema,
  uiScenarioFixtureSchema,
  uiScenarioReplayStepSchema,
  uiStepExpectationSchema,
  type PluginProtocolTape,
  type PortableSemanticReplayStep,
  type UIFixtureFrame,
  type UIFixtureProtocolStep,
  type UIReplayExecution,
  type UIReplayRequest,
  type UIResolvedReplayIdentity,
  type UIScenarioFixture,
  type UIScenarioFixtureBundleIndex,
  type UIScenarioReplayStep,
  type UIStepExpectation,
} from "./schema.js";
