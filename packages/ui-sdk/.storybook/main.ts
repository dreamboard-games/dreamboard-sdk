import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath } from "node:url";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
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
    viteConfig.resolve.dedupe = Array.from(
      new Set([...(viteConfig.resolve.dedupe ?? []), "react", "react-dom"]),
    );
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      // Make local source the canonical entry so stories pick up live edits.
      "@dreamboard/ui-sdk": fileURLToPath(
        new URL("../src/index.ts", import.meta.url),
      ),
    };
    return viteConfig;
  },
};

export default config;
