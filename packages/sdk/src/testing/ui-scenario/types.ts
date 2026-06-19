import type { PluginProtocolTape } from "../ui-fixture/schema.js";
import type { UIScenarioReplayStep } from "../ui-fixture/schema.js";
import type {
  ReducerScenarioBundle,
  ReducerScenarioOperation,
  ReducerScenarioViewer,
} from "../reducer-scenario/types.js";

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

export interface ReducerScenarioDefinition {
  readonly id: string;
  readonly gameId: string;
  readonly initialState: unknown;
  readonly bundle: ReducerScenarioBundle;
  readonly viewer: ReducerScenarioViewer;
  readonly playerIds: readonly string[];
  readonly operations: readonly ReducerScenarioOperation[];
}

export interface ReferenceGameUIScenarioDefinition {
  readonly id: string;
  readonly title: string;
  readonly behaviorScenario: ReducerScenarioDefinition;
  readonly viewer: {
    readonly seatId: string;
    readonly playerId?: string;
  };
  readonly environment: {
    readonly viewport: "desktop" | "phone";
    readonly browsers: readonly ("chromium" | "webkit")[];
    readonly input: readonly ("mouse" | "touch" | "keyboard")[];
  };
  readonly replay: readonly UIScenarioReplayStep[];
  readonly contracts: readonly string[];
}
