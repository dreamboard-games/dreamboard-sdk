import { createRoot } from "react-dom/client";
import { iframeSource } from "@dreamboard-games/sdk";
import { GameShell } from "./shell";
import "./style.css";

export { App, default } from "./App";

createRoot(document.getElementById("root")!).render(
  <GameShell source={iframeSource()} />,
);
