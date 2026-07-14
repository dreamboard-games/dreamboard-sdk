/**
 * Trusted Node-only scenario compiler surface.
 *
 * Keep this separate from `/testing-runtime`: replay consumers bundle that
 * facade into browser-safe fixture adapters, while compilation owns esbuild
 * and filesystem access and must run only in a trusted tool or server.
 */
export {
  compileScenarioReplay,
  type CompiledScenarioReplay,
  type CompileScenarioReplayOptions,
} from "./testing/compile-scenario-replay.js";
