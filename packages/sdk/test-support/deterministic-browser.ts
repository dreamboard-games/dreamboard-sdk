export const deterministicBrowserUse = {
  colorScheme: "light" as const,
  deviceScaleFactor: 1,
  locale: "en-US",
  reducedMotion: "reduce" as const,
  timezoneId: "UTC",
};

export const deterministicViewportProjects = [
  {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
  },
  {
    name: "phonePortrait",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  },
  {
    name: "tabletPortrait",
    viewport: { width: 820, height: 1180 },
  },
] as const;

export type DeterministicViewportProject =
  (typeof deterministicViewportProjects)[number]["name"];
