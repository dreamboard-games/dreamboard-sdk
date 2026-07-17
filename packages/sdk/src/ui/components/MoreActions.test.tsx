import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../theme/ThemeProvider.js";
import { MoreActions } from "./MoreActions.js";

// React SSR splits text nodes around dynamic children with HTML
// comments. Strip them before substring asserting so tests stay
// readable.
function stripSsrComments(html: string): string {
  return html.replace(/<!--\s*-->/g, "");
}

test("MoreActions renders collapsed by default and tags state via aria + data attrs", () => {
  // Default should always be closed so the disclosure doesn't show
  // its hidden content unprompted (the whole point is to fight choice
  // overload). The aria + data-* hooks let tests / hand-rolled CSS
  // target the open state without looking at children.
  const html = renderToString(
    <ThemeProvider>
      <MoreActions count={3}>
        <button data-testid="hidden">Forfeit</button>
      </MoreActions>
    </ThemeProvider>,
  );

  expect(html).toContain('data-shell-slot="more-actions"');
  expect(html).toContain('data-more-actions-open="false"');
  expect(html).toContain('aria-expanded="false"');
  // Toggle exposes the count so the player knows N actions are
  // hidden without expanding first (ambient awareness).
  expect(stripSsrComments(html)).toContain("(3)");
  expect(html).not.toContain('data-testid="hidden"');
});

test("MoreActions opens by default when defaultOpen is true and exposes the disclosed region", () => {
  const html = renderToString(
    <ThemeProvider>
      <MoreActions count={1} defaultOpen>
        <button data-testid="visible">Forfeit</button>
      </MoreActions>
    </ThemeProvider>,
  );

  expect(html).toContain('data-more-actions-open="true"');
  expect(html).toContain('aria-expanded="true"');
  // Region is mounted with `role="region"` and an aria-label that
  // matches the toggle so screen readers announce it as a labelled
  // landmark.
  expect(html).toContain('role="region"');
  expect(html).toContain('data-testid="visible"');
});

test("MoreActions accepts a custom toggle label", () => {
  // Workspace-specific copy (e.g. "Advanced", "Manage") flows through
  // unchanged so authors can match their game's voice without forking
  // the component.
  const html = renderToString(
    <ThemeProvider>
      <MoreActions label="Advanced" count={2}>
        <button>x</button>
      </MoreActions>
    </ThemeProvider>,
  );

  expect(html).toContain("Advanced");
  expect(stripSsrComments(html)).toContain("(2)");
});

test("MoreActions hides the count badge when count is zero or undefined", () => {
  // The badge would otherwise read "(0)" which is just visual noise.
  // We check by counting the `tabular-nums` style hint we attach to
  // the badge — the badge is the only span carrying it inside the
  // toggle, so its absence proves we didn't mount the badge.
  const BADGE_MARKER = "font-variant-numeric:tabular-nums";

  const noCount = renderToString(
    <ThemeProvider>
      <MoreActions>
        <button>x</button>
      </MoreActions>
    </ThemeProvider>,
  );
  const zeroCount = renderToString(
    <ThemeProvider>
      <MoreActions count={0}>
        <button>x</button>
      </MoreActions>
    </ThemeProvider>,
  );

  expect(noCount).not.toContain(BADGE_MARKER);
  expect(zeroCount).not.toContain(BADGE_MARKER);
});
