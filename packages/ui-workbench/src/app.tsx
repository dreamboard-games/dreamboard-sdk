import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { scenarios, type UIScenarioCatalogEntry } from "./catalog.js";
import { ScenarioPage } from "./scenario-page.js";
import "./styles.css";

function uniqueValues(
  entries: readonly UIScenarioCatalogEntry[],
  read: (entry: UIScenarioCatalogEntry) => readonly string[],
) {
  return [...new Set(entries.flatMap((entry) => read(entry)))].sort();
}

function currentRoute() {
  const url = new URL(window.location.href);
  const scenarioMatch = url.pathname.match(/^\/scenario\/([^/]+)$/);
  return {
    scenarioId: scenarioMatch ? decodeURIComponent(scenarioMatch[1]) : null,
    panel: url.searchParams.get("panel") ?? "semantic",
    testMode: url.searchParams.get("mode") === "test",
    component: url.searchParams.get("component") ?? "",
    capability: url.searchParams.get("capability") ?? "",
    game: url.searchParams.get("game") ?? "",
  };
}

function navigate(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function CatalogPage({ route }: { readonly route: ReturnType<typeof currentRoute> }) {
  const [game, setGame] = useState(route.game);
  const [component, setComponent] = useState(route.component);
  const [capability, setCapability] = useState(route.capability);

  const games = useMemo(
    () => [...new Set(scenarios.map((entry) => entry.gameId))].sort(),
    [],
  );
  const components = useMemo(
    () => uniqueValues(scenarios, (entry) => entry.components),
    [],
  );
  const capabilities = useMemo(
    () => uniqueValues(scenarios, (entry) => entry.capabilities),
    [],
  );
  const viewportTags = useMemo(
    () => uniqueValues(scenarios, (entry) => entry.viewportTags),
    [],
  );

  const filtered = scenarios.filter(
    (entry) =>
      (!game || entry.gameId === game) &&
      (!component || entry.components.includes(component)) &&
      (!capability || entry.capabilities.includes(capability)),
  );

  return (
    <main className="workbench catalog-view" data-dreamboard-workbench="catalog">
      <header className="catalog-header">
        <div>
          <p>Dreamboard SDK</p>
          <h1>UI Workbench</h1>
        </div>
        <a href="/scenario/hearts.pass-three.mobile?mode=test">
          Test route
        </a>
      </header>

      <section className="filters" aria-label="Scenario filters">
        <label>
          Game
          <select value={game} onChange={(event) => setGame(event.target.value)}>
            <option value="">All games</option>
            {games.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Component
          <select
            value={component}
            onChange={(event) => setComponent(event.target.value)}
          >
            <option value="">All components</option>
            {components.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Capability
          <select
            value={capability}
            onChange={(event) => setCapability(event.target.value)}
          >
            <option value="">All capabilities</option>
            {capabilities.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="scenario-grid" aria-label="Scenarios">
        {filtered.map((entry) => (
          <article className="scenario-card" key={entry.id}>
            <div>
              <p>{entry.gameId}</p>
              <h2>{entry.title}</h2>
            </div>
            <dl>
              <div>
                <dt>Components</dt>
                <dd>{entry.components.join(", ")}</dd>
              </div>
              <div>
                <dt>Capabilities</dt>
                <dd>{entry.capabilities.join(", ")}</dd>
              </div>
              <div>
                <dt>Viewport</dt>
                <dd>{entry.viewportTags.join(", ")}</dd>
              </div>
            </dl>
            <div className="card-actions">
              <button
                type="button"
                onClick={() => navigate(`/scenario/${entry.id}`)}
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => navigate(`/scenario/${entry.id}?panel=runtime`)}
              >
                Runtime
              </button>
            </div>
          </article>
        ))}
      </section>

      <footer className="catalog-footer">
        <span>{filtered.length} scenarios</span>
        <span>{viewportTags.join(" / ")}</span>
      </footer>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(currentRoute);

  React.useEffect(() => {
    const listener = () => setRoute(currentRoute());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  if (route.scenarioId) {
    const entry = scenarios.find((candidate) => candidate.id === route.scenarioId);
    if (!entry) {
      return (
        <main className="workbench error-state">
          Unknown scenario {route.scenarioId}
        </main>
      );
    }
    return (
      <ScenarioPage
        entry={entry}
        panel={route.panel}
        testMode={route.testMode}
      />
    );
  }

  return <CatalogPage route={route} />;
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("UI Workbench root element is missing.");
}

createRoot(root).render(<App />);
