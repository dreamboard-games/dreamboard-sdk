import type { Preview, Decorator } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import {
  ThemeProvider,
  type ThemePresetId,
} from "../src/theme/ThemeProvider.js";
import "../src/plugin-styles.css";
import "./storybook.css";

const VIEWPORTS = {
  phonePortrait: {
    name: "Phone — portrait (iPhone 13)",
    styles: { width: "390px", height: "844px" },
    type: "mobile" as const,
  },
  phoneLandscape: {
    name: "Phone — landscape",
    styles: { width: "844px", height: "390px" },
    type: "mobile" as const,
  },
  tabletPortrait: {
    name: "Tablet — portrait",
    styles: { width: "820px", height: "1180px" },
    type: "tablet" as const,
  },
  tabletLandscape: {
    name: "Tablet — landscape",
    styles: { width: "1180px", height: "820px" },
    type: "tablet" as const,
  },
  desktop: {
    name: "Desktop",
    styles: { width: "1440px", height: "900px" },
    type: "desktop" as const,
  },
  desktopWide: {
    name: "Desktop — wide",
    styles: { width: "1920px", height: "1080px" },
    type: "desktop" as const,
  },
};

const themeDecorator: Decorator = (Story, context) => {
  const themeId =
    (context.globals.theme as ThemePresetId | undefined) ?? "tabletop";
  const reducedMotion =
    context.globals.reducedMotion === "force" ? "force" : "auto";
  return (
    <ThemeProvider
      theme={themeId}
      reducedMotion={reducedMotion}
      className="sb-theme-host"
    >
      <Story />
    </ThemeProvider>
  );
};

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    options: {
      storySort: {
        order: [
          "Themes",
          "Cards",
          "Hands",
          "Buttons",
          "Panels",
          "Resource & Status",
          "Board",
          "Misc",
        ],
      },
    },
    viewport: {
      options: VIEWPORTS,
    },
    a11y: {
      context: "#storybook-root",
    },
  },
  initialGlobals: {
    viewport: { value: "desktop", isRotated: false },
    a11y: { manual: false },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Active theme preset",
      defaultValue: "tabletop",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "tabletop", title: "Tabletop" },
          { value: "arcade", title: "Arcade" },
          { value: "studio", title: "Studio" },
        ],
        dynamicTitle: true,
      },
    },
    reducedMotion: {
      name: "Reduced motion",
      description: "Force reduced motion",
      defaultValue: "auto",
      toolbar: {
        icon: "accessibility",
        items: [
          { value: "auto", title: "Auto (OS)" },
          { value: "force", title: "Forced" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    themeDecorator,
    withThemeByDataAttribute({
      themes: {
        tabletop: "tabletop",
        arcade: "arcade",
        studio: "studio",
      },
      defaultTheme: "tabletop",
      attributeName: "data-storybook-theme",
    }),
  ],
};

export default preview;
