import type { UIScenarioRenderModule } from "./runtime/browser-fixture-runtime.js";

export interface UIScenarioCatalogEntry {
  readonly id: string;
  readonly title: string;
  readonly gameId: string;
  readonly fixtureUrl: string;
  readonly renderModuleUrl: string;
  readonly renderModuleLoader?: () => Promise<UIScenarioRenderModule>;
  readonly components: readonly string[];
  readonly capabilities: readonly string[];
  readonly viewportTags: readonly string[];
  readonly sourceDigest: string;
}
