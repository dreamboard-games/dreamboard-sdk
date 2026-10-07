import { expect, type Locator } from "@playwright/test";

/** A settled, genuinely exposed interior point of a fanned card control. */
export async function cardSurface(
  card: Locator,
  clip?: { x: number; width: number },
  settled = true,
) {
  let previous:
    { x: number; y: number; width: number; height: number } | undefined;
  let point: { x: number; y: number } | undefined;
  await expect
    .poll(
      async () => {
        const measured = await card.evaluate((element, clip) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          const own = (x: number, y: number) =>
            document.elementFromPoint(x, y)?.closest(".db-hand-card") ===
            element;
          for (const vertical of [0.5, 0.65, 0.3, 0.8])
            for (let horizontal = 0.05; horizontal < 1; horizontal += 0.05) {
              const at = {
                x: x + width * horizontal,
                y: y + height * vertical,
              };
              if (clip && (at.x - 2 < clip.x || at.x + 2 > clip.x + clip.width))
                continue;
              if (
                [-2, 0, 2].every((dx) =>
                  [-2, 0, 2].every((dy) => own(at.x + dx, at.y + dy)),
                )
              )
                return { box: { x, y, width, height }, point: at };
            }
          return { box: { x, y, width, height }, point: undefined };
        }, clip);
        const before = previous;
        const stable =
          before !== undefined &&
          (["x", "y", "width", "height"] as const).every(
            (key) => Math.abs(measured.box[key] - before[key]) < 0.1,
          );
        previous = measured.box;
        point = measured.point;
        return (!settled || stable) && point !== undefined;
      },
      {
        message: `A stable exposed surface for ${await card.getAttribute("data-card")}`,
        intervals: [32],
      },
    )
    .toBe(true);
  return point!;
}
