import { createRoot } from "react-dom/client";
import { PluginRuntime } from "@dreamboard-games/sdk/runtime";
import { ErrorBoundary } from "@dreamboard-games/sdk/ui";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <PluginRuntime>
      <App />
    </PluginRuntime>
  </ErrorBoundary>,
);
