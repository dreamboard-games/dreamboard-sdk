import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  viteFinal: async (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), tailwindcss()],
    resolve: {
      ...config.resolve,
      alias: {
        "@": new URL("..", import.meta.url).pathname,
        "@game": new URL("../typecheck/game.ts", import.meta.url).pathname,
      },
    },
  }),
};
export default config;
