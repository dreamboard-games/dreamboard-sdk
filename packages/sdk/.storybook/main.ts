import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const config: StorybookConfig = {
  stories: ["../src/ui/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: false,
  },
  async viteFinal(viteConfig) {
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];
    viteConfig.resolve.dedupe = Array.from(
      new Set([...(viteConfig.resolve.dedupe ?? []), "react", "react-dom"]),
    );
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      // Make local source the canonical entry so stories pick up live edits.
      "@dreamboard-games/sdk/ui": fileURLToPath(
        new URL("../src/ui.ts", import.meta.url),
      ),
      "@dreamboard-games/sdk/ui/components": fileURLToPath(
        new URL("../src/ui/components.ts", import.meta.url),
      ),
      "@dreamboard-games/sdk/ui/defaults": fileURLToPath(
        new URL("../src/ui/defaults.ts", import.meta.url),
      ),
    };
    return viteConfig;
  },
};

export default config;
