import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeProvider, type ThemePresetId } from "../theme/ThemeProvider.js";
import { CardFace } from "../components/Card.js";
import { ThemedButton } from "../components/ThemedButton.js";

const PRESETS: ThemePresetId[] = ["tabletop", "arcade", "studio"];

interface ShowcaseProps {
  themeId?: ThemePresetId;
  reducedMotion?: "auto" | "force" | "ignore";
}

function Showcase({ themeId, reducedMotion = "auto" }: ShowcaseProps) {
  return (
    <ThemeProvider theme={themeId} reducedMotion={reducedMotion}>
      <div
        className="sb-stage"
        style={{
          background: "var(--db-surface-app, #fff)",
          color: "var(--db-text-primary, #111)",
        }}
      >
        <h2>{themeId ? `Preset: ${themeId}` : "Default"}</h2>
        <p>
          Reduced motion: <strong>{reducedMotion}</strong>
        </p>
        <div className="sb-stage sb-stage--row">
          <CardFace
            card={{
              id: `card-${themeId ?? "default"}`,
              cardType: "spell",
              name: "Sample",
              properties: {
                title: "Sample",
                subtitle: "Card",
                effect: "Theme preview",
                cost: "1",
              },
            }}
          />
          <div className="sb-stage" style={{ gap: 8 }}>
            <ThemedButton variant="primary">Primary</ThemedButton>
            <ThemedButton variant="secondary">Secondary</ThemedButton>
            <ThemedButton variant="danger">Danger</ThemedButton>
            <ThemedButton variant="ghost">Quiet</ThemedButton>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

const meta: Meta<typeof Showcase> = {
  title: "Themes",
  component: Showcase,
  parameters: {
    chromatic: { viewports: [390, 1440] },
  },
};
export default meta;

type Story = StoryObj<typeof Showcase>;

export const Tabletop: Story = { args: { themeId: "tabletop" } };
export const Arcade: Story = { args: { themeId: "arcade" } };
export const Studio: Story = { args: { themeId: "studio" } };

export const PresetMatrix: Story = {
  parameters: {
    chromatic: { viewports: [1440] },
  },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "1rem",
        padding: "1rem",
        background: "#0f172a",
      }}
    >
      {PRESETS.map((id) => (
        <Showcase key={id} themeId={id} />
      ))}
    </div>
  ),
};

export const NarrowOverride: Story = {
  render: () => (
    <ThemeProvider
      theme="tabletop"
      override={{
        semantic: {
          intent: {
            primary: { solid: "#9333ea", on: "#ffffff" },
          },
        },
      }}
    >
      <div className="sb-stage">
        <h2>Tabletop with primary override</h2>
        <p>
          Player palette swap: <code>semantic.intent.primary</code>.
        </p>
        <ThemedButton variant="primary">Overridden primary</ThemedButton>
        <ThemedButton variant="secondary">Untouched secondary</ThemedButton>
      </div>
    </ThemeProvider>
  ),
};

export const ReducedMotion: Story = {
  args: { themeId: "tabletop", reducedMotion: "force" },
  parameters: {
    docs: {
      description: {
        story:
          '`reducedMotion="force"` clamps `motion.reducedMotion` to `true`. Animation-driven stories must remain semantically legible without motion.',
      },
    },
  },
};

export const SemanticStateComparison: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Side-by-side comparison of semantic visual states (eligible, selected, disabled, invalid, submitted, previewing) on the same surface.",
      },
    },
  },
  render: () => (
    <ThemeProvider theme="tabletop">
      <div
        className="sb-stage"
        style={{ background: "var(--db-surface-app, #fff)" }}
      >
        <h2>Semantic states</h2>
        <div className="sb-stage sb-stage--row" style={{ gap: 12 }}>
          {[
            { label: "Resting", state: {} },
            { label: "Eligible", state: { eligible: true } },
            { label: "Selected", state: { selected: true } },
            { label: "Disabled", state: { disabled: true } },
            { label: "Invalid", state: { invalid: true } },
            { label: "Submitted", state: { submitted: true } },
            { label: "Previewing", state: { previewing: true } },
          ].map(({ label, state }) => (
            <div key={label} className="sb-stage" style={{ gap: 6 }}>
              <CardFace
                card={{
                  id: `card-${label}`,
                  cardType: "spell",
                  name: label,
                  properties: { title: label, subtitle: "State" },
                }}
                {...state}
              />
              <p style={{ textAlign: "center" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </ThemeProvider>
  ),
};
