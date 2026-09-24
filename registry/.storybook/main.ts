import type { StorybookConfig } from "@storybook/react-vite";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        "@game": new URL("../typecheck/game.ts", import.meta.url).pathname,
      },
    },
  }),
};
export default config;
