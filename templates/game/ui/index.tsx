import { createRoot } from "react-dom/client";
import { iframeSource } from "@dreamboard-games/sdk";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(
  <App source={iframeSource()} />,
);
