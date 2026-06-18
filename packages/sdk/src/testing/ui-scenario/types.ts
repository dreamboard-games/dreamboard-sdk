import type { PluginProtocolTape } from "../ui-fixture/schema.js";
import type { UIScenarioReplayStep } from "../ui-fixture/schema.js";

export type UIScenarioAuthorityKind = "protocol" | "reducer";

export interface UIScenarioEnvironmentDefinition {
  readonly viewport?: "desktop" | "tablet" | "phone";
  readonly browsers?: readonly ("chromium" | "webkit")[];
  readonly input?: readonly ("mouse" | "touch" | "keyboard")[];
}

export interface ProtocolUIScenarioAuthority {
  readonly kind: "protocol";
  readonly tape: PluginProtocolTape;
}

export interface ReducerUIScenarioAuthority {
  readonly kind: "reducer";
  readonly referenceGame: unknown;
  readonly coverage: unknown;
  readonly bundle: unknown;
  readonly initialState: unknown;
  readonly viewer: unknown;
  readonly playerIds?: readonly string[];
  readonly operations: readonly unknown[];
}

export type UIScenarioAuthority =
  | ProtocolUIScenarioAuthority
  | ReducerUIScenarioAuthority;

export interface UIScenarioDefinition {
  readonly id: string;
  readonly title?: string;
  readonly contracts: readonly string[];
  readonly capabilities: readonly string[];
  readonly sourceFiles: readonly string[];
  readonly environment?: UIScenarioEnvironmentDefinition;
  readonly authority: UIScenarioAuthority;
  readonly replay: readonly UIScenarioReplayStep[];
}
