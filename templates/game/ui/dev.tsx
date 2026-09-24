import { createRoot } from "react-dom/client";
import { App } from "./app";
import { createDevelopmentSource } from "./development-source";

const source = await createDevelopmentSource(
  new URLSearchParams(location.search),
);
createRoot(document.getElementById("root")!).render(<App source={source} />);
